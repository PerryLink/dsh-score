/**
 * The single-target scoring pipeline: classify and sanitize the target, gather
 * evidence through the {@link ProbeDriver}, read reserved test-drive install
 * evidence from the already-open `test_drive` domain (best-effort — absent
 * means `no-evidence`), evaluate the five dimensions, and persist the score
 * card keyed by a deterministic hash of the target spec (the score cache).
 *
 * Every domain access is best-effort: a missing `storageDomain` service or a
 * failing medium is logged and the score is still returned — persistence
 * degrades, scoring never fabricates.
 *
 * @module dsh-score/score
 */

import { createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { Domain, KvTable } from '@deepseek-ai/dsh-storage-domain'
import type { ResolvedConfig } from './config.ts'
import { evaluateAll } from './dimensions.ts'
import type { InstallEvidence } from './dimensions.ts'
import type { scoreDomainSpec } from './domain.ts'
import { ProbeDriver, classifyTarget, extractRepoFromNpmUrl, parseRepoRef } from './probe.ts'
import type { NpmFacts, RepoFacts } from './probe.ts'
import { computeTotal, gradeOf, hasEvidence, verdictOf } from './result.ts'
import { RESULT_SCHEMA } from './result.ts'
import type { EvidenceLink, ScoreResult } from './result.ts'
import { sanitizeTarget } from './sanitize.ts'
import { VERSION } from './version.ts'

/** Prefix of a score-card key (deterministic, so it doubles as the cache key). */
export const SCORE_KEY_PREFIX = 'sc_'

/** Deterministic table key for one target spec (sanitized, hashed). */
export function scoreKey(spec: string): string {
  return `${SCORE_KEY_PREFIX}${createHash('sha256').update(spec).digest('hex').slice(0, 16)}`
}

/** Everything the pipeline needs at runtime; assembled by `src/index.ts`. */
export interface ScoreDeps {
  ctx: Context
  config: ResolvedConfig
  driver: ProbeDriver
  log: (line: string) => void
  domain: () => Promise<Domain<typeof scoreDomainSpec>>
}

/** One matching test-drive run record, narrowed to the fields scoring consumes. */
interface DriveRecordMatch {
  runId: string
  finishedAt: string
  verdict: 'pass' | 'fail' | 'partial' | 'unknown'
  reason: string
}

/** Narrow an opaque stored record to a drive match, or undefined when unrelated. */
function parseDriveRecord(value: unknown, spec: string, packageName: string | undefined): DriveRecordMatch | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (record.schema !== 'dsh-test-drive/v1') return undefined
  const target = record.target
  if (typeof target !== 'object' || target === null) return undefined
  const targetSpec = (target as Record<string, unknown>).spec
  const resolved = (target as Record<string, unknown>).resolved
  const resolvedName = typeof resolved === 'object' && resolved !== null
    ? (resolved as Record<string, unknown>).packageName
    : undefined
  if (targetSpec !== spec && (packageName === undefined || resolvedName !== packageName)) return undefined
  const run = record.run
  const verdict = record.verdict
  const reason = record.verdictReason
  if (typeof run !== 'object' || run === null) return undefined
  const runId = (run as Record<string, unknown>).runId
  const finishedAt = (run as Record<string, unknown>).finishedAt
  if (typeof runId !== 'string' || typeof finishedAt !== 'string') return undefined
  if (verdict !== 'pass' && verdict !== 'fail' && verdict !== 'partial' && verdict !== 'unknown') return undefined
  return { runId, finishedAt, verdict, reason: typeof reason === 'string' ? reason : '' }
}

/**
 * Read the reserved install evidence from the already-open `test_drive`
 * domain. Best-effort and never hard-dependent: when the storage-domain
 * service, the `test_drive` domain, or a matching record is absent, this
 * returns undefined and the install dimension reports `no-evidence`.
 *
 * @param ctx - context carrying the optional `storageDomain` service.
 * @param spec - the scored target spec.
 * @param packageName - npm package name (alternative match key), when known.
 * @returns the newest matching drive verdict, or undefined.
 */
export function readTestDriveEvidence(ctx: Context, spec: string, packageName: string | undefined): InstallEvidence | undefined {
  const storageDomain = ctx.get('storageDomain')
  if (storageDomain === undefined) return undefined
  const handle = storageDomain.get('test_drive')
  if (handle === undefined) return undefined
  let runs: KvTable<string, unknown>
  try {
    runs = handle.table('runs')
  } catch {
    return undefined
  }
  let best: DriveRecordMatch | undefined
  for (const [, value] of runs.entries()) {
    const match = parseDriveRecord(value, spec, packageName)
    if (match === undefined) continue
    if (best === undefined || match.finishedAt > best.finishedAt) best = match
  }
  if (best === undefined) return undefined
  return {
    verdict: best.verdict,
    detail: `test-drive run ${best.runId}: ${best.reason}`,
    observedAt: best.finishedAt,
  }
}

/** Everything gathered about one target during a scoring run. */
interface Gathered {
  repo: RepoFacts | undefined
  npm: NpmFacts | undefined
  evidence: EvidenceLink[]
}

/** Gather repo/npm facts for one sanitized target. */
async function gather(deps: ScoreDeps, spec: string, kind: 'repo' | 'npm', signal?: AbortSignal | undefined): Promise<Gathered> {
  const evidence: EvidenceLink[] = []
  let repo: RepoFacts | undefined
  let npm: NpmFacts | undefined
  if (kind === 'repo') {
    const ref = parseRepoRef(spec)
    if (ref !== undefined) {
      const outcome = await deps.driver.probeRepo(ref, signal)
      repo = outcome.facts
      evidence.push(...outcome.evidence)
    }
  } else {
    const outcome = await deps.driver.probeNpm(spec, signal)
    npm = outcome.facts
    evidence.push(...outcome.evidence)
    if (npm.repositoryUrl !== undefined) {
      const ref = extractRepoFromNpmUrl(npm.repositoryUrl)
      if (ref !== undefined) {
        const repoOutcome = await deps.driver.probeRepo(ref, signal)
        repo = repoOutcome.facts
        evidence.push(...repoOutcome.evidence)
      }
    }
  }
  return { repo, npm, evidence }
}

/** The single-target scoring pipeline. */
export class ScoreRunner {
  constructor(private readonly deps: ScoreDeps) {}

  /** Persist one settled score card; a failing medium is logged, never thrown. */
  private async record(result: ScoreResult): Promise<void> {
    try {
      const domain = await this.deps.domain()
      await domain.table('scores').put(result.scoreId, result)
    } catch (error) {
      this.deps.log(`score: failed to persist score ${result.scoreId}: ${String(error)}`)
    }
  }

  /** Return a still-fresh cached card for the target, or undefined. */
  private async cached(key: string): Promise<ScoreResult | undefined> {
    try {
      const domain = await this.deps.domain()
      const existing = domain.table('scores').get(key)
      if (existing === undefined) return undefined
      if (Date.parse(existing.scoredAt) + this.deps.config.cacheMaxAgeMs > Date.now()) return existing
    } catch {
      // A failing medium is no reason to skip scoring.
    }
    return undefined
  }

  /**
   * Score one target through the full pipeline.
   *
   * @param target - raw target spec (repo or npm package).
   * @param options - caller cancellation and cache override.
   * @returns the structured score card; never throws for missing evidence.
   */
  async score(target: string, options: { signal?: AbortSignal | undefined; refresh?: boolean } = {}): Promise<ScoreResult> {
    const spec = sanitizeTarget(target)
    if (spec.length === 0) throw new Error('dsh-score: target must be a non-empty string')
    const kind = classifyTarget(spec)
    const key = scoreKey(spec)

    if (options.refresh !== true) {
      const existing = await this.cached(key)
      if (existing !== undefined) return existing
    }

    const started = Date.now()
    const gathered = await gather(this.deps, spec, kind, options.signal)
    const testDrive = readTestDriveEvidence(this.deps.ctx, spec, gathered.npm?.name)
    const now = new Date().toISOString()
    const dimensions = evaluateAll({
      config: this.deps.config,
      now,
      target: { kind, spec },
      ...(gathered.repo === undefined ? {} : { repo: gathered.repo }),
      ...(gathered.npm === undefined ? {} : { npm: gathered.npm }),
      ...(testDrive === undefined ? {} : { testDrive }),
    })
    const dimValues = Object.values(dimensions)
    const total = computeTotal(dimValues)
    const evidenced = hasEvidence(dimValues)
    const result: ScoreResult = {
      schema: RESULT_SCHEMA,
      scoreId: key,
      target: { kind, spec },
      scoredAt: now,
      durationMs: Date.now() - started,
      pluginVersion: VERSION,
      dimensions,
      total,
      grade: gradeOf(total, evidenced),
      verdict: verdictOf(total, evidenced),
    }
    await this.record(result)
    return result
  }
}
