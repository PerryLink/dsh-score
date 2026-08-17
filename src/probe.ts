/**
 * The evidence-gathering layer: runs `gh` and `npm` as managed subprocesses
 * over `ctx.subprocess` and parses their output into structured facts. Every
 * command records an {@link EvidenceLink} (source, command, audit timestamp);
 * a command that fails or returns unparsable output contributes NO fact — the
 * consuming dimension then reports `no-evidence` honestly, never a number.
 *
 * No shell is ever involved (argv-only), so hostile target specs stay argv
 * entries. `gh` reads its own credential store (the provider scrubs ambient
 * env credentials), and every recorded string is sanitized before it leaves
 * this layer.
 *
 * @module dsh-score/probe
 */

import { readFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import type { ResolvedConfig } from './config.ts'
import type { EvidenceLink, TargetKind } from './result.ts'
import { redactSecrets, tailText } from './sanitize.ts'

/** Cap on collected output per probe stream (in-memory tail). */
export const COLLECT_MAX_BYTES = 64 * 1024
/** Cap on the complete spill file per stream. */
export const SPILL_MAX_BYTES = 1024 * 1024
/** Grace between SIGTERM and SIGKILL for a probe process. */
export const PROBE_GRACE_MS = 5_000

/** Outcome of one spawned probe process. */
export interface ChildRunResult {
  exitCode: number | null
  stdout: string
  stderr: string
  truncated: boolean
  durationMs: number
  timedOut: boolean
}

/** A GitHub repository reference parsed from a target spec. */
export interface RepoRef {
  owner: string
  repo: string
}

/** Structured facts one `gh`/`npm` probe may reveal (absent = no evidence). */
export interface RepoFacts {
  pushedAt?: string
  openIssues?: number
  licenseSpdx?: string
  defaultBranch?: string
  topics?: string[]
  archived?: boolean
  lastCommitAt?: string
  files?: string[]
  packageJson?: unknown
  cordisPatch?: string
  readmeText?: string
  oldestOpenIssueAt?: string
}

/** Structured facts one `npm view` may reveal (absent = no evidence). */
export interface NpmFacts {
  name?: string
  version?: string
  license?: string
  repositoryUrl?: string
  keywords?: string[]
  modifiedAt?: string
  packageJson?: unknown
}

/** Everything gathered about one target, plus the audit links. */
export interface TargetEvidence {
  target: { kind: TargetKind; spec: string }
  repo?: RepoFacts
  npm?: NpmFacts
  evidence: EvidenceLink[]
}

/** A fact plus the audit links that produced it. */
export interface ProbeOutcome<T> {
  value?: T
  evidence: EvidenceLink[]
}

/** Regex a GitHub owner or repo segment must satisfy (blocks endpoint injection). */
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** Parse the JS target out of an npm-generated `.cmd`/`.bat` shim (Windows). */
export function parseNpmShim(shimPath: string, shimText: string): string {
  const match = /"%dp0%\\(?<rel>node_modules\\[^"]+\.(?:js|cjs|mjs))"/u.exec(shimText)
  const rel = match?.groups?.rel
  if (rel === undefined) {
    throw new Error(`dsh-score: cannot parse npm shim ${shimPath} (no dp0-relative JS target found)`)
  }
  return join(dirname(shimPath), rel)
}

/** Whether a target spec names a git/github source. */
export function isRepoSpec(spec: string): boolean {
  return /^github:|^git\+|^git@|\.git(?:#|$)|^https?:\/\//u.test(spec) || (spec.includes('/') && !spec.startsWith('@'))
}

/** Classify a sanitized target spec as a repo or an npm package. */
export function classifyTarget(spec: string): TargetKind {
  if (isRepoSpec(spec)) return 'repo'
  return 'npm'
}

/** Strip a trailing `.git` suffix from a repo name. */
function withoutGitSuffix(name: string): string {
  return name.endsWith('.git') ? name.slice(0, -4) : name
}

/** Extract owner/repo from a target spec; undefined when it does not name a GitHub repo. */
export function parseRepoRef(spec: string): RepoRef | undefined {
  const patterns: RegExp[] = [
    /^github:([^/#]+)\/([^/#]+)/u,
    /^git\+https?:\/\/github\.com\/([^/]+)\/([^/#]+)/u,
    /^git@github\.com:([^/]+)\/([^/]+)/u,
    /^https?:\/\/github\.com\/([^/]+)\/([^/#]+)/u,
    /^([^/]+)\/([^/]+)$/u,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(spec)
    const owner = match?.[1]
    const repo = match?.[2]
    if (owner === undefined || repo === undefined) continue
    const clean = withoutGitSuffix(repo)
    if (SEGMENT_RE.test(owner) && SEGMENT_RE.test(clean)) return { owner, repo: clean }
  }
  return undefined
}

/** Extract owner/repo from an npm `repository.url` (github only). */
export function extractRepoFromNpmUrl(url: string): RepoRef | undefined {
  const match = /github\.com[/:]([^/]+)\/([^/#.]+)/u.exec(url)
  const owner = match?.[1]
  const repo = match?.[2]
  if (owner === undefined || repo === undefined) return undefined
  const clean = withoutGitSuffix(repo)
  if (SEGMENT_RE.test(owner) && SEGMENT_RE.test(clean)) return { owner, repo: clean }
  return undefined
}

/** Parse the `gh api repos/<owner>/<repo>` object into repo facts. */
export function parseRepoMeta(json: unknown): RepoFacts {
  const facts: RepoFacts = {}
  if (typeof json !== 'object' || json === null) return facts
  const record = json as Record<string, unknown>
  if (typeof record.pushed_at === 'string') facts.pushedAt = record.pushed_at
  if (typeof record.open_issues_count === 'number') facts.openIssues = record.open_issues_count
  if (typeof record.default_branch === 'string') facts.defaultBranch = record.default_branch
  if (typeof record.archived === 'boolean') facts.archived = record.archived
  const license = record.license
  if (typeof license === 'object' && license !== null && typeof (license as Record<string, unknown>).spdx_id === 'string') {
    facts.licenseSpdx = (license as Record<string, unknown>).spdx_id as string
  } else {
    facts.licenseSpdx = 'MISSING'
  }
  if (Array.isArray(record.topics)) facts.topics = record.topics.filter((topic): topic is string => typeof topic === 'string')
  return facts
}

/** Parse the newest commit date from `gh api .../commits?per_page=1`. */
export function parseLatestCommit(json: unknown): string | undefined {
  if (!Array.isArray(json) || json.length === 0) return undefined
  const head = json[0]
  if (typeof head !== 'object' || head === null) return undefined
  const commit = (head as Record<string, unknown>).commit
  if (typeof commit !== 'object' || commit === null) return undefined
  const date = (commit as Record<string, unknown>).committer
  if (typeof date !== 'object' || date === null) return undefined
  const value = (date as Record<string, unknown>).date
  return typeof value === 'string' ? value : undefined
}

/** Parse the root file-name list from `gh api .../contents`. */
export function parseFileList(json: unknown): string[] {
  if (!Array.isArray(json)) return []
  const names: string[] = []
  for (const entry of json) {
    if (typeof entry !== 'object' || entry === null) continue
    const name = (entry as Record<string, unknown>).name
    if (typeof name === 'string') names.push(name)
  }
  return names
}

/** Decode the `content` field of a `gh api .../contents/<file>` response. */
export function parseGithubContent(json: unknown): string | undefined {
  if (typeof json !== 'object' || json === null) return undefined
  const content = (json as Record<string, unknown>).content
  if (typeof content !== 'string') return undefined
  // Node's base64 decoder silently ignores invalid characters, so a payload
  // that is not base64 would decode to garbage; reject it up front by charset.
  if (!/^[A-Za-z0-9+/=\s]*$/.test(content)) return undefined
  try {
    return Buffer.from(content, 'base64').toString('utf8')
  } catch {
    return undefined
  }
}

/** Parse the oldest open issue's creation date from `gh api .../issues`. */
export function parseOldestOpenIssue(json: unknown): string | undefined {
  if (!Array.isArray(json) || json.length === 0) return undefined
  const head = json[0]
  if (typeof head !== 'object' || head === null) return undefined
  const created = (head as Record<string, unknown>).created_at
  return typeof created === 'string' ? created : undefined
}

/** Parse the `npm view <pkg> --json` manifest into npm facts. */
export function parseNpmView(json: unknown): NpmFacts {
  const facts: NpmFacts = {}
  if (typeof json !== 'object' || json === null) return facts
  const record = json as Record<string, unknown>
  if (typeof record.name === 'string') facts.name = record.name
  if (typeof record.version === 'string') facts.version = record.version
  const license = record.license
  if (typeof license === 'string') facts.license = license
  else if (typeof license === 'object' && license !== null && typeof (license as Record<string, unknown>).type === 'string') {
    facts.license = (license as Record<string, unknown>).type as string
  }
  const repository = record.repository
  if (typeof repository === 'object' && repository !== null && typeof (repository as Record<string, unknown>).url === 'string') {
    facts.repositoryUrl = (repository as Record<string, unknown>).url as string
  }
  if (Array.isArray(record.keywords)) facts.keywords = record.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
  const time = record.time
  if (typeof time === 'object' && time !== null && typeof (time as Record<string, unknown>).modified === 'string') {
    facts.modifiedAt = (time as Record<string, unknown>).modified as string
  }
  facts.packageJson = json
  return facts
}

/** Driver dependencies for the subprocess probe seam. */
export interface ProbeDeps {
  ctx: Context
  config: ResolvedConfig
  log: (line: string) => void
}

/**
 * Locate and run `gh`/`npm` through the subprocess seam, cache each located
 * argv prefix, and parse responses. `npm` on Windows resolves to a `.cmd` shim
 * that cannot be spawned directly — the shim is parsed into `[node, js]`.
 */
export class ProbeDriver {
  private readonly located = new Map<string, Promise<readonly string[]>>()

  constructor(private readonly deps: ProbeDeps) {}

  /** Resolve the spawn argv prefix `[program, ...args]` for one CLI. */
  locate(program: string): Promise<readonly string[]> {
    let pending = this.located.get(program)
    if (pending === undefined) {
      pending = this.resolveLocation(program)
      this.located.set(program, pending)
    }
    return pending
  }

  private async resolveLocation(program: string): Promise<readonly string[]> {
    const found = await this.deps.ctx.subprocess.resolveExecutable(program)
    if (process.platform === 'win32' && /\.(?:cmd|bat)$/iu.test(found)) {
      const shimText = await readFile(found, 'utf8')
      const target = parseNpmShim(found, shimText)
      this.deps.log(`score: ${program} resolved to ${target} (via shim ${found})`)
      return [process.execPath, target]
    }
    if (/\.ps1$/iu.test(found)) {
      throw new Error(`dsh-score: ${program} resolved to the PowerShell shim ${found}; install the native CLI or npm shim`)
    }
    return [found]
  }

  /** Run one CLI invocation with collected stdio and a deadline. */
  async run(program: string, args: readonly string[], signal?: AbortSignal | undefined): Promise<ChildRunResult> {
    const started = Date.now()
    const deadline = AbortSignal.timeout(this.deps.config.probeTimeoutMs)
    const merged = signal === undefined ? deadline : AbortSignal.any([signal, deadline])
    let handle
    try {
      const [resolved, ...prefix] = await this.locate(program)
      if (resolved === undefined) throw new Error(`${program} location resolved to an empty argv`)
      const spec: SubprocessSpawnSpec = {
        argv: [resolved, ...prefix, ...args],
        cwd: process.cwd(),
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: COLLECT_MAX_BYTES, spill: { maxBytes: SPILL_MAX_BYTES } },
          stderr: { maxBytes: COLLECT_MAX_BYTES, spill: { maxBytes: SPILL_MAX_BYTES } },
        },
        graceMs: PROBE_GRACE_MS,
        signal: merged,
      }
      handle = this.deps.ctx.subprocess.spawn(spec)
    } catch (error) {
      return { exitCode: null, stdout: '', stderr: `spawn failed: ${String(error)}`, truncated: false, durationMs: Date.now() - started, timedOut: false }
    }
    let outcome
    try {
      outcome = await handle.done
    } catch (error) {
      return { exitCode: null, stdout: '', stderr: `spawn failed: ${String(error)}`, truncated: false, durationMs: Date.now() - started, timedOut: false }
    }
    const stdoutRead = handle.collected.stdout?.readFrom(0)
    const stderrRead = handle.collected.stderr?.readFrom(0)
    const stdout = stdoutRead?.text ?? ''
    const stderr = stderrRead?.text ?? ''
    const truncated = (stdoutRead?.lossy ?? false) || (stderrRead?.lossy ?? false)
    return {
      exitCode: outcome.exitCode,
      stdout,
      stderr,
      truncated,
      durationMs: Date.now() - started,
      timedOut: deadline.aborted && (signal === undefined || !signal.aborted),
    }
  }

  /** Run one `gh api <endpoint>` and parse JSON; records an audit link either way. */
  async ghJson(endpoint: string, signal?: AbortSignal | undefined): Promise<ProbeOutcome<unknown>> {
    const evidence: EvidenceLink = {
      source: 'gh-api',
      detail: `gh api ${endpoint}`,
      observedAt: new Date().toISOString(),
    }
    const run = await this.run('gh', ['api', endpoint], signal)
    if (run.exitCode !== 0) return { evidence: [evidence] }
    const trimmed = run.stdout.trim()
    if (trimmed.length === 0) return { evidence: [evidence] }
    try {
      return { value: JSON.parse(trimmed), evidence: [evidence] }
    } catch {
      return { evidence: [evidence] }
    }
  }

  /** Run one `npm view <pkg> --json`; records an audit link either way. */
  async npmJson(pkgSpec: string, signal?: AbortSignal | undefined): Promise<ProbeOutcome<unknown>> {
    const evidence: EvidenceLink = {
      source: 'npm-cli',
      detail: `npm view ${pkgSpec} --json`,
      observedAt: new Date().toISOString(),
    }
    const run = await this.run('npm', ['view', pkgSpec, '--json'], signal)
    if (run.exitCode !== 0) return { evidence: [evidence] }
    const trimmed = run.stdout.trim()
    if (trimmed.length === 0) return { evidence: [evidence] }
    try {
      return { value: JSON.parse(trimmed), evidence: [evidence] }
    } catch {
      return { evidence: [evidence] }
    }
  }

  /** Probe one GitHub repo: metadata, latest commit, file list, and key file contents. */
  async probeRepo(ref: RepoRef, signal?: AbortSignal | undefined): Promise<{ facts: RepoFacts; evidence: EvidenceLink[] }> {
    const facts: RepoFacts = {}
    const evidence: EvidenceLink[] = []
    const base = `repos/${ref.owner}/${ref.repo}`

    const meta = await this.ghJson(base, signal)
    evidence.push(...meta.evidence)
    Object.assign(facts, parseRepoMeta(meta.value))

    const commits = await this.ghJson(`${base}/commits?per_page=1`, signal)
    evidence.push(...commits.evidence)
    const lastCommitAt = parseLatestCommit(commits.value)
    if (lastCommitAt !== undefined) facts.lastCommitAt = lastCommitAt

    const listing = await this.ghJson(`${base}/contents`, signal)
    evidence.push(...listing.evidence)
    const files = parseFileList(listing.value)
    if (files.length > 0) facts.files = files.map(name => name.toLowerCase())

    const packageJson = await this.ghJson(`${base}/contents/package.json`, signal)
    evidence.push(...packageJson.evidence)
    const packageJsonText = parseGithubContent(packageJson.value)
    if (packageJsonText !== undefined) {
      try {
        facts.packageJson = JSON.parse(packageJsonText)
      } catch {
        facts.packageJson = undefined
      }
    }

    const patch = await this.ghJson(`${base}/contents/cordis.patch.yml`, signal)
    evidence.push(...patch.evidence)
    const patchText = parseGithubContent(patch.value)
    if (patchText !== undefined) facts.cordisPatch = patchText

    const readme = await this.ghJson(`${base}/contents/README.md`, signal)
    evidence.push(...readme.evidence)
    const readmeText = parseGithubContent(readme.value)
    if (readmeText !== undefined) facts.readmeText = readmeText

    const issues = await this.ghJson(`${base}/issues?state=open&per_page=1&sort=created&direction=asc`, signal)
    evidence.push(...issues.evidence)
    const oldestOpenIssueAt = parseOldestOpenIssue(issues.value)
    if (oldestOpenIssueAt !== undefined) facts.oldestOpenIssueAt = oldestOpenIssueAt

    return { facts, evidence }
  }

  /** Probe one npm package manifest; a github repository URL is also parsed out. */
  async probeNpm(spec: string, signal?: AbortSignal | undefined): Promise<{ facts: NpmFacts; evidence: EvidenceLink[] }> {
    const outcome = await this.npmJson(spec, signal)
    return { facts: parseNpmView(outcome.value), evidence: outcome.evidence }
  }
}

/** Sanitize one evidence detail string for the audit link (redacts stray credentials). */
export function sanitizeEvidenceDetail(detail: string): string {
  return tailText(redactSecrets(detail), 200)
}
