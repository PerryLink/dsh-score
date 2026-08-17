/**
 * The five dimension evaluators. Each is a PURE function of gathered evidence,
 * the resolved config, and an injected "now" timestamp — no filesystem,
 * network, or clock access — so every score is reproducible from its inputs
 * and every conclusion carries an audit link. A dimension without usable
 * evidence returns `no-evidence` with score 0 and never fabricates a number.
 *
 * @module dsh-score/dimensions
 */

import type { ResolvedConfig } from './config.ts'
import type { NpmFacts, RepoFacts } from './probe.ts'
import type { Dimension, DimensionScore, DimensionStatus } from './result.ts'
import { scanSecretPatterns } from './sanitize.ts'

/** Install evidence reserved for dsh-test-drive results (see {@link InstallEvidence}). */
export interface InstallEvidence {
  /** The drive verdict, when a test-drive record existed for the target. */
  verdict?: 'pass' | 'fail' | 'partial' | 'unknown'
  /** Sanitized detail: the run id and reason, when available. */
  detail?: string
  /** ISO-8601 timestamp of the test-drive record. */
  observedAt?: string
}

/** Everything the evaluators read; assembled by the scoring pipeline. */
export interface EvalInputs {
  config: ResolvedConfig
  /** ISO-8601 audit timestamp for every derived evidence link. */
  now: string
  target: { kind: 'repo' | 'npm'; spec: string }
  repo?: RepoFacts
  npm?: NpmFacts
  testDrive?: InstallEvidence
}

/** Build one audit link for a derived fact. */
function link(source: string, detail: string, now: string): { source: string; detail: string; observedAt: string } {
  return { source, detail, observedAt: now }
}

/** Whole days between an ISO timestamp and `now` (negative when in the future). */
export function daysSince(iso: string, now: Date): number {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return Number.NaN
  return (now.getTime() - then) / 86_400_000
}

/** SPDX identifiers treated as acceptable open-source licenses. */
export const LICENSE_ALLOWLIST: ReadonlySet<string> = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'ISC', 'Zlib',
  'MPL-2.0', 'LGPL-2.1', 'LGPL-3.0', 'GPL-2.0', 'GPL-3.0', 'AGPL-3.0',
  'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0',
])

/** SPDX values that mean "no usable license signal". */
export const LICENSE_MISSING: ReadonlySet<string> = new Set(['MISSING', 'NOASSERTION', 'NO-LICENSE', ''])

/** Suspicious markers inside package.json lifecycle scripts (install-time code execution). */
export const MALICIOUS_SCRIPT_MARKERS: ReadonlyArray<RegExp> = [
  /\bcurl\b/iu,
  /\bwget\b/iu,
  /\beval\s*\(/iu,
  /child_process/iu,
  /execSync/iu,
  /\bspawn\s*\(/iu,
  /\brequire\s*\(\s*['"]child_process/iu,
  /base64/iu,
  /powershell/iu,
  /Invoke-Expression/iu,
]

/** Lifecycle script keys whose values are scanned for malicious markers. */
const LIFECYCLE_SCRIPT_KEYS = ['postinstall', 'preinstall', 'install', 'prepare'] as const

/**
 * Scan a parsed package.json for suspicious install-time script markers.
 *
 * @param packageJson - the parsed manifest, or undefined.
 * @returns the matched marker source text (one entry per matched script key).
 */
export function scanMaliciousScripts(packageJson: unknown): string[] {
  if (typeof packageJson !== 'object' || packageJson === null) return []
  const scripts = (packageJson as Record<string, unknown>).scripts
  if (typeof scripts !== 'object' || scripts === null) return []
  const found: string[] = []
  for (const key of LIFECYCLE_SCRIPT_KEYS) {
    const value = (scripts as Record<string, unknown>)[key]
    if (typeof value !== 'string') continue
    for (const marker of MALICIOUS_SCRIPT_MARKERS) {
      if (marker.test(value)) {
        found.push(`${key}: ${value}`)
        break
      }
    }
  }
  return found
}

/** License classification from an SPDX id (or npm license string). */
export function licenseCompliance(spdx: string | undefined): { known: boolean; acceptable: boolean } {
  if (spdx === undefined || LICENSE_MISSING.has(spdx)) return { known: false, acceptable: false }
  const normalized = spdx.replace(/^\(|\)$/gu, '').trim()
  if (normalized === '') return { known: false, acceptable: false }
  return { known: true, acceptable: LICENSE_ALLOWLIST.has(normalized) }
}

/** The install-success dimension, consuming reserved test-drive evidence. */
export function evaluateInstall(input: EvalInputs): DimensionScore {
  const weight = input.config.weights.install
  const base = { dimension: 'install' as const, weight }
  const drive = input.testDrive
  if (drive === undefined || drive.verdict === undefined) {
    return {
      ...base, status: 'no-evidence', score: 0,
      summary: 'no dsh-test-drive result recorded for this target (install success unmeasured)',
      evidence: [link('test-drive', 'no test-drive record found in the test_drive domain', input.now)],
    }
  }
  const evidence = [link('test-drive', drive.detail ?? `test-drive verdict ${drive.verdict}`, drive.observedAt ?? input.now)]
  switch (drive.verdict) {
    case 'pass': return { ...base, status: 'pass', score: 100, summary: 'install smoke verified by dsh-test-drive', evidence }
    case 'partial': return { ...base, status: 'warn', score: 60, summary: 'installed but a later assurance was missing (test-drive partial)', evidence }
    case 'fail': return { ...base, status: 'fail', score: 0, summary: 'install or boot smoke failed (test-drive fail)', evidence }
    default: return { ...base, status: 'no-evidence', score: 0, summary: 'test-drive ran but nothing decisive (unknown)', evidence }
  }
}

/** The maintenance dimension: commit recency, issue age, and archived status. */
export function evaluateMaintenance(input: EvalInputs): DimensionScore {
  const weight = input.config.weights.maintenance
  const base = { dimension: 'maintenance' as const, weight }
  const { config, now } = input
  const nowDate = new Date(now)
  const evidence: { source: string; detail: string; observedAt: string }[] = []
  const lastActivity = input.repo?.lastCommitAt ?? input.npm?.modifiedAt
  const archived = input.repo?.archived ?? false

  if (archived) {
    evidence.push(link('gh-api', 'repository is archived', now))
    return { ...base, status: 'fail', score: 10, summary: 'repository is archived', evidence }
  }

  if (lastActivity === undefined && input.repo?.oldestOpenIssueAt === undefined) {
    return {
      ...base, status: 'no-evidence', score: 0,
      summary: 'no commit or publish timestamp available',
      evidence: [link('gh-api', 'no pushed_at / commit / npm modified timestamp', now)],
    }
  }

  let status: DimensionStatus = 'pass'
  let score = 100
  if (lastActivity !== undefined) {
    evidence.push(link('gh-api', `last activity ${lastActivity}`, now))
    const days = daysSince(lastActivity, nowDate)
    if (!Number.isNaN(days)) {
      if (days > config.staleCommitFailDays) { status = 'fail'; score = 20 }
      else if (days > config.staleCommitWarnDays) { status = 'warn'; score = 60 }
    }
  }

  const oldestIssue = input.repo?.oldestOpenIssueAt
  if (oldestIssue !== undefined) {
    evidence.push(link('gh-api', `oldest open issue created ${oldestIssue}`, now))
    const days = daysSince(oldestIssue, nowDate)
    if (!Number.isNaN(days)) {
      if (days > config.staleIssueFailDays && status !== 'fail') { status = 'fail'; score = Math.min(score, 20) }
      else if (days > config.staleIssueWarnDays && status !== 'fail') { status = 'warn'; score = Math.min(score, 60) }
    }
  }

  const openIssues = input.repo?.openIssues
  const summary = status === 'pass'
    ? `active (${lastActivity ?? 'no timestamp'}${openIssues === undefined ? '' : `; ${openIssues} open issues`})`
    : status === 'warn'
      ? `slowing (last activity ${lastActivity ?? 'unknown'})`
      : `stale (last activity ${lastActivity ?? 'unknown'})`
  return { ...base, status, score, summary, evidence }
}

/** The documentation dimension: multi-language README, CHANGELOG, SECURITY presence. */
export function evaluateDocumentation(input: EvalInputs): DimensionScore {
  const weight = input.config.weights.documentation
  const base = { dimension: 'documentation' as const, weight }
  const rawFiles = input.repo?.files
  if (rawFiles === undefined || rawFiles.length === 0) {
    return {
      ...base, status: 'no-evidence', score: 0,
      summary: 'repository file list unavailable (cannot inspect docs)',
      evidence: [link('gh-api', 'no contents listing for the target', input.now)],
    }
  }
  const files = rawFiles.map(name => name.toLowerCase())
  const has = (name: string): boolean => files.includes(name)
  const readme = has('readme.md')
  const languages = ['readme.zh.md', 'readme.es.md', 'readme.pt.md', 'readme.hi.md'].filter(has).length
  const changelog = has('changelog.md')
  const security = has('security.md')

  const evidence = [link('gh-api', `root files: ${files.join(', ')}`, input.now)]
  if (!readme) {
    return { ...base, status: 'fail', score: 0, summary: 'README.md missing', evidence }
  }
  let score = 40 + languages * 10 + (changelog ? 10 : 0) + (security ? 10 : 0)
  let status: DimensionStatus
  if (score >= 80) status = 'pass'
  else if (score >= 50) status = 'warn'
  else status = 'fail'
  return {
    ...base, status, score,
    summary: `${languages}/4 language READMEs${changelog ? ' + CHANGELOG' : ''}${security ? ' + SECURITY' : ''}`,
    evidence,
  }
}

/** The security dimension: license compliance, secret leaks, and malicious script markers. */
export function evaluateSecurity(input: EvalInputs): DimensionScore {
  const weight = input.config.weights.security
  const base = { dimension: 'security' as const, weight }
  const { now } = input
  const evidence: { source: string; detail: string; observedAt: string }[] = []

  const spdx = input.repo?.licenseSpdx ?? input.npm?.license
  const license = licenseCompliance(spdx)
  if (spdx !== undefined) evidence.push(link(input.repo?.licenseSpdx !== undefined ? 'gh-api' : 'npm-cli', `license ${spdx}`, now))

  const packageJson = input.repo?.packageJson ?? input.npm?.packageJson
  const scannedText = [
    packageJson === undefined ? '' : JSON.stringify(packageJson),
    input.repo?.cordisPatch ?? '',
    input.repo?.readmeText ?? '',
  ].join('\n')
  const secretPatterns = scanSecretPatterns(scannedText)
  if (secretPatterns.length > 0) evidence.push(link('file-content', `secret patterns found: ${secretPatterns.join(', ')}`, now))

  const malicious = scanMaliciousScripts(packageJson)
  if (malicious.length > 0) evidence.push(link('file-content', `suspicious install scripts: ${malicious.join('; ')}`, now))

  if (!license.known && secretPatterns.length === 0 && malicious.length === 0 && scannedText.trim() === '') {
    return {
      ...base, status: 'no-evidence', score: 0,
      summary: 'no license or content available to scan',
      evidence: [link('gh-api', 'no license, package.json, or patch content', now)],
    }
  }

  let status: DimensionStatus = 'pass'
  let score = license.acceptable ? 100 : license.known ? 40 : 0
  if (!license.known) status = 'fail'
  else if (!license.acceptable) status = 'warn'
  if (secretPatterns.length > 0 || malicious.length > 0) {
    status = 'fail'
    score = Math.min(score, 10)
  }

  const summary = secretPatterns.length > 0
    ? `secrets leaked (${secretPatterns.join(', ')})`
    : malicious.length > 0
      ? `suspicious install scripts detected`
      : license.acceptable
        ? `license ${spdx ?? 'ok'}`
        : license.known
          ? `unrecognized license ${spdx ?? ''}`
          : 'license missing'
  return { ...base, status, score, summary, evidence }
}

/** The compliance dimension: `dsh.bundle.patch` manifest and `dsh-plugin` topic/keyword. */
export function evaluateCompliance(input: EvalInputs): DimensionScore {
  const weight = input.config.weights.compliance
  const base = { dimension: 'compliance' as const, weight }
  const { now } = input
  const evidence: { source: string; detail: string; observedAt: string }[] = []

  const packageJson = input.repo?.packageJson ?? input.npm?.packageJson
  let bundlePatch = false
  let dshManifest = false
  if (typeof packageJson === 'object' && packageJson !== null) {
    const dsh = (packageJson as Record<string, unknown>).dsh
    if (typeof dsh === 'object' && dsh !== null) {
      dshManifest = true
      const bundle = (dsh as Record<string, unknown>).bundle
      if (typeof bundle === 'object' && bundle !== null && typeof (bundle as Record<string, unknown>).patch === 'string') {
        bundlePatch = ((bundle as Record<string, unknown>).patch as string).length > 0
      }
    }
  }
  if (dshManifest) evidence.push(link('file-content', `dsh manifest ${bundlePatch ? 'with' : 'without'} bundle.patch`, now))

  const topics = input.repo?.topics ?? []
  const keywords = input.npm?.keywords ?? []
  const topicLabel = topics.includes('dsh-plugin') || keywords.includes('dsh-plugin')
  if (topicLabel) evidence.push(link('gh-api', "topic/keyword 'dsh-plugin' present", now))

  if (!dshManifest && !topicLabel && packageJson === undefined && topics.length === 0 && keywords.length === 0) {
    return {
      ...base, status: 'no-evidence', score: 0,
      summary: 'no manifest, topics, or keywords available',
      evidence: [link('gh-api', 'no package.json or topic/keyword data', now)],
    }
  }

  let score = 0
  if (bundlePatch) score += 60
  else if (dshManifest) score += 20
  if (topicLabel) score += 20
  if (topics.length > 0) score += Math.min(topics.length, 10) // richer topic set is a weak positive
  score = Math.min(score, 100)

  const status: DimensionStatus = score >= 80 ? 'pass' : score >= 40 ? 'warn' : 'fail'
  const summary = bundlePatch
    ? 'dsh.bundle.patch declared'
    : dshManifest
      ? 'dsh manifest without bundle.patch'
      : 'no dsh manifest'
  return { ...base, status, score, summary, evidence }
}

/** Evaluate all five dimensions for one target. */
export function evaluateAll(input: EvalInputs): Record<Dimension, DimensionScore> {
  return {
    install: evaluateInstall(input),
    maintenance: evaluateMaintenance(input),
    documentation: evaluateDocumentation(input),
    security: evaluateSecurity(input),
    compliance: evaluateCompliance(input),
  }
}
