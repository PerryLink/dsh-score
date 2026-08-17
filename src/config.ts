/**
 * Plugin configuration and its explicit resolve step. `resolveConfig` re-judges
 * every default and bound so programmatic construction that bypasses
 * Schemastery normalization still fails loud instead of running with hidden
 * defaults (the explicit-resolve contract). Every tunable is a Config field —
 * no scoring threshold or weight is hardcoded in the evaluators.
 *
 * @module dsh-score/config
 */

import z from '@deepseek-ai/schemastery'
import type { Dimension } from './result.ts'

/** Default deadline for one git/gh/npm probe command in milliseconds. */
export const DEFAULT_PROBE_TIMEOUT_MS = 60_000
export const MIN_PROBE_TIMEOUT_MS = 1_000
export const MAX_PROBE_TIMEOUT_MS = 600_000

/** Default cap on the sanitized output tail recorded per probe, in bytes. */
export const DEFAULT_OUTPUT_TAIL_BYTES = 8_000
export const MIN_OUTPUT_TAIL_BYTES = 256
export const MAX_OUTPUT_TAIL_BYTES = 256_000

/** Default staleness for a cached score card before it is re-scored. */
export const DEFAULT_CACHE_MAX_AGE_MS = 86_400_000
export const MAX_CACHE_MAX_AGE_MS = 2_592_000_000

/** Default commit-recency thresholds in days. */
export const DEFAULT_STALE_COMMIT_WARN_DAYS = 90
export const DEFAULT_STALE_COMMIT_FAIL_DAYS = 365

/** Default open-issue-age thresholds in days (issue response proxy). */
export const DEFAULT_STALE_ISSUE_WARN_DAYS = 30
export const DEFAULT_STALE_ISSUE_FAIL_DAYS = 180

/** Bound shared by every day-count threshold. */
export const MIN_DAYS = 1
export const MAX_DAYS = 3_650

/** Default batch cap and concurrency. */
export const DEFAULT_MAX_BATCH_TARGETS = 20
export const MAX_BATCH_TARGETS = 200
export const DEFAULT_BATCH_CONCURRENCY = 1
export const MAX_BATCH_CONCURRENCY = 4

/** Default dimension weights (sum 100). Install is the heaviest because it is the only measured signal. */
export const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  install: 25,
  maintenance: 20,
  documentation: 20,
  security: 20,
  compliance: 15,
}

/** Configuration for the dsh-score quality-scoring tools. */
export interface Config {
  /** Deadline for one git/gh/npm probe command in milliseconds (default 60000). */
  probeTimeoutMs?: number
  /** Cap on the sanitized output tail recorded per probe in bytes (default 8000). */
  outputTailBytes?: number
  /** How long a cached score card is reused before re-scoring, in milliseconds (default 86400000). */
  cacheMaxAgeMs?: number
  /** Commit age (days) at which maintenance drops to warn (default 90). */
  staleCommitWarnDays?: number
  /** Commit age (days) at which maintenance drops to fail (default 365). */
  staleCommitFailDays?: number
  /** Oldest-open-issue age (days) at which maintenance drops to warn (default 30). */
  staleIssueWarnDays?: number
  /** Oldest-open-issue age (days) at which maintenance drops to fail (default 180). */
  staleIssueFailDays?: number
  /** Maximum targets one `/score` batch accepts (default 20). */
  maxBatchTargets?: number
  /** Batch concurrency (default 1). */
  batchConcurrency?: number
  /** Per-dimension weights used to sum the total (defaults sum to 100). */
  weights?: Partial<Record<Dimension, number>>
}

/** Fully resolved configuration captured at plugin load. */
export interface ResolvedConfig {
  probeTimeoutMs: number
  outputTailBytes: number
  cacheMaxAgeMs: number
  staleCommitWarnDays: number
  staleCommitFailDays: number
  staleIssueWarnDays: number
  staleIssueFailDays: number
  maxBatchTargets: number
  batchConcurrency: number
  weights: Record<Dimension, number>
}

/** Schemastery schema for loader-validated configuration. */
export const Config: z<Config> = z.object({
  probeTimeoutMs: z.number().min(MIN_PROBE_TIMEOUT_MS).max(MAX_PROBE_TIMEOUT_MS).default(DEFAULT_PROBE_TIMEOUT_MS),
  outputTailBytes: z.number().min(MIN_OUTPUT_TAIL_BYTES).max(MAX_OUTPUT_TAIL_BYTES).default(DEFAULT_OUTPUT_TAIL_BYTES),
  cacheMaxAgeMs: z.number().min(0).max(MAX_CACHE_MAX_AGE_MS).default(DEFAULT_CACHE_MAX_AGE_MS),
  staleCommitWarnDays: z.number().min(MIN_DAYS).max(MAX_DAYS).default(DEFAULT_STALE_COMMIT_WARN_DAYS),
  staleCommitFailDays: z.number().min(MIN_DAYS).max(MAX_DAYS).default(DEFAULT_STALE_COMMIT_FAIL_DAYS),
  staleIssueWarnDays: z.number().min(MIN_DAYS).max(MAX_DAYS).default(DEFAULT_STALE_ISSUE_WARN_DAYS),
  staleIssueFailDays: z.number().min(MIN_DAYS).max(MAX_DAYS).default(DEFAULT_STALE_ISSUE_FAIL_DAYS),
  maxBatchTargets: z.number().min(1).max(MAX_BATCH_TARGETS).default(DEFAULT_MAX_BATCH_TARGETS),
  batchConcurrency: z.number().min(1).max(MAX_BATCH_CONCURRENCY).default(DEFAULT_BATCH_CONCURRENCY),
  weights: z.object({
    install: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.install),
    maintenance: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.maintenance),
    documentation: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.documentation),
    security: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.security),
    compliance: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.compliance),
  }).default({ ...DEFAULT_WEIGHTS }),
})

/** Throw the standard fail-loud config error for one invalid field. */
function invalid(field: string, detail: string): never {
  throw new Error(`dsh-score: config.${field} ${detail}`)
}

/** Validate one integer bound with a numeric range. */
function assertInt(value: number, field: string, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    invalid(field, `must be an integer between ${min} and ${max}`)
  }
}

/**
 * Resolve raw config to the runtime policy, re-validating defaults and bounds.
 *
 * @param config - raw loader config; `undefined` for a bare row.
 * @returns the frozen resolved config.
 */
export function resolveConfig(config: Config | undefined): ResolvedConfig {
  const probeTimeoutMs = config?.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS
  assertInt(probeTimeoutMs, 'probeTimeoutMs', MIN_PROBE_TIMEOUT_MS, MAX_PROBE_TIMEOUT_MS)

  const outputTailBytes = config?.outputTailBytes ?? DEFAULT_OUTPUT_TAIL_BYTES
  assertInt(outputTailBytes, 'outputTailBytes', MIN_OUTPUT_TAIL_BYTES, MAX_OUTPUT_TAIL_BYTES)

  const cacheMaxAgeMs = config?.cacheMaxAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS
  assertInt(cacheMaxAgeMs, 'cacheMaxAgeMs', 0, MAX_CACHE_MAX_AGE_MS)

  const staleCommitWarnDays = config?.staleCommitWarnDays ?? DEFAULT_STALE_COMMIT_WARN_DAYS
  const staleCommitFailDays = config?.staleCommitFailDays ?? DEFAULT_STALE_COMMIT_FAIL_DAYS
  assertInt(staleCommitWarnDays, 'staleCommitWarnDays', MIN_DAYS, MAX_DAYS)
  assertInt(staleCommitFailDays, 'staleCommitFailDays', MIN_DAYS, MAX_DAYS)
  if (staleCommitFailDays <= staleCommitWarnDays) {
    invalid('staleCommitFailDays', `must be greater than staleCommitWarnDays (${staleCommitWarnDays})`)
  }

  const staleIssueWarnDays = config?.staleIssueWarnDays ?? DEFAULT_STALE_ISSUE_WARN_DAYS
  const staleIssueFailDays = config?.staleIssueFailDays ?? DEFAULT_STALE_ISSUE_FAIL_DAYS
  assertInt(staleIssueWarnDays, 'staleIssueWarnDays', MIN_DAYS, MAX_DAYS)
  assertInt(staleIssueFailDays, 'staleIssueFailDays', MIN_DAYS, MAX_DAYS)
  if (staleIssueFailDays <= staleIssueWarnDays) {
    invalid('staleIssueFailDays', `must be greater than staleIssueWarnDays (${staleIssueWarnDays})`)
  }

  const maxBatchTargets = config?.maxBatchTargets ?? DEFAULT_MAX_BATCH_TARGETS
  assertInt(maxBatchTargets, 'maxBatchTargets', 1, MAX_BATCH_TARGETS)

  const batchConcurrency = config?.batchConcurrency ?? DEFAULT_BATCH_CONCURRENCY
  assertInt(batchConcurrency, 'batchConcurrency', 1, MAX_BATCH_CONCURRENCY)

  const weights: Record<Dimension, number> = {
    install: config?.weights?.install ?? DEFAULT_WEIGHTS.install,
    maintenance: config?.weights?.maintenance ?? DEFAULT_WEIGHTS.maintenance,
    documentation: config?.weights?.documentation ?? DEFAULT_WEIGHTS.documentation,
    security: config?.weights?.security ?? DEFAULT_WEIGHTS.security,
    compliance: config?.weights?.compliance ?? DEFAULT_WEIGHTS.compliance,
  }
  let weightSum = 0
  for (const key of ['install', 'maintenance', 'documentation', 'security', 'compliance'] as const) {
    assertInt(weights[key], `weights.${key}`, 0, 100)
    weightSum += weights[key]
  }
  if (weightSum === 0) invalid('weights', 'at least one dimension weight must be greater than 0')

  return Object.freeze({
    probeTimeoutMs,
    outputTailBytes,
    cacheMaxAgeMs,
    staleCommitWarnDays,
    staleCommitFailDays,
    staleIssueWarnDays,
    staleIssueFailDays,
    maxBatchTargets,
    batchConcurrency,
    weights: Object.freeze(weights),
  })
}
