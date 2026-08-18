/**
 * `resolveConfig` re-judges every default and bound so programmatic mounts
 * (bypassing Schemastery normalization) still fail loud.
 * @module dsh-score/test/config.spec
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_CACHE_MAX_AGE_MS,
  DEFAULT_MAX_BATCH_TARGETS,
  DEFAULT_OUTPUT_TAIL_BYTES,
  DEFAULT_PROBE_TIMEOUT_MS,
  DEFAULT_STALE_COMMIT_FAIL_DAYS,
  DEFAULT_STALE_COMMIT_WARN_DAYS,
  DEFAULT_STALE_ISSUE_FAIL_DAYS,
  DEFAULT_STALE_ISSUE_WARN_DAYS,
  DEFAULT_WEIGHTS,
  resolveConfig,
} from '../src/config.ts'

describe('resolveConfig defaults', () => {
  it('applies every documented default on an empty config', () => {
    const resolved = resolveConfig(undefined)
    expect(resolved.probeTimeoutMs).toBe(DEFAULT_PROBE_TIMEOUT_MS)
    expect(resolved.outputTailBytes).toBe(DEFAULT_OUTPUT_TAIL_BYTES)
    expect(resolved.cacheMaxAgeMs).toBe(DEFAULT_CACHE_MAX_AGE_MS)
    expect(resolved.staleCommitWarnDays).toBe(DEFAULT_STALE_COMMIT_WARN_DAYS)
    expect(resolved.staleCommitFailDays).toBe(DEFAULT_STALE_COMMIT_FAIL_DAYS)
    expect(resolved.staleIssueWarnDays).toBe(DEFAULT_STALE_ISSUE_WARN_DAYS)
    expect(resolved.staleIssueFailDays).toBe(DEFAULT_STALE_ISSUE_FAIL_DAYS)
    expect(resolved.maxBatchTargets).toBe(DEFAULT_MAX_BATCH_TARGETS)
    expect(resolved.batchConcurrency).toBe(DEFAULT_BATCH_CONCURRENCY)
    expect(resolved.weights).toEqual(DEFAULT_WEIGHTS)
  })

  it('honors every override', () => {
    const resolved = resolveConfig({
      probeTimeoutMs: 30_000,
      outputTailBytes: 1_024,
      cacheMaxAgeMs: 0,
      staleCommitWarnDays: 30,
      staleCommitFailDays: 200,
      staleIssueWarnDays: 10,
      staleIssueFailDays: 60,
      maxBatchTargets: 5,
      batchConcurrency: 2,
      weights: { install: 50, maintenance: 50, documentation: 0, security: 0, compliance: 0 },
    })
    expect(resolved.probeTimeoutMs).toBe(30_000)
    expect(resolved.outputTailBytes).toBe(1_024)
    expect(resolved.cacheMaxAgeMs).toBe(0)
    expect(resolved.staleCommitWarnDays).toBe(30)
    expect(resolved.staleCommitFailDays).toBe(200)
    expect(resolved.staleIssueWarnDays).toBe(10)
    expect(resolved.staleIssueFailDays).toBe(60)
    expect(resolved.maxBatchTargets).toBe(5)
    expect(resolved.batchConcurrency).toBe(2)
    expect(resolved.weights.install).toBe(50)
    expect(resolved.weights.compliance).toBe(0)
  })
})

describe('resolveConfig fails loud', () => {
  it('rejects probe timeouts outside the bounds', () => {
    expect(() => resolveConfig({ probeTimeoutMs: 10 })).toThrow(/config\.probeTimeoutMs/)
    expect(() => resolveConfig({ probeTimeoutMs: 9_999_999 })).toThrow(/config\.probeTimeoutMs/)
  })

  it('rejects an output tail cap outside the bounds', () => {
    expect(() => resolveConfig({ outputTailBytes: 10 })).toThrow(/config\.outputTailBytes/)
    expect(() => resolveConfig({ outputTailBytes: 2.5 })).toThrow(/config\.outputTailBytes/)
  })

  it('rejects commit fail not greater than warn', () => {
    expect(() => resolveConfig({ staleCommitWarnDays: 100, staleCommitFailDays: 100 })).toThrow(/config\.staleCommitFailDays/)
  })

  it('rejects issue fail not greater than warn', () => {
    expect(() => resolveConfig({ staleIssueWarnDays: 90, staleIssueFailDays: 60 })).toThrow(/config\.staleIssueFailDays/)
  })

  it('rejects batch bounds violations', () => {
    expect(() => resolveConfig({ maxBatchTargets: 0 })).toThrow(/config\.maxBatchTargets/)
    expect(() => resolveConfig({ maxBatchTargets: 201 })).toThrow(/config\.maxBatchTargets/)
    expect(() => resolveConfig({ batchConcurrency: 9 })).toThrow(/config\.batchConcurrency/)
  })

  it('rejects all-zero weights', () => {
    expect(() => resolveConfig({ weights: { install: 0, maintenance: 0, documentation: 0, security: 0, compliance: 0 } })).toThrow(/config\.weights/)
  })

  it('rejects out-of-range weight values', () => {
    expect(() => resolveConfig({ weights: { install: 101 } })).toThrow(/config\.weights\.install/)
  })

  it('accepts weights that do not sum to 100 (the total is a weighted average)', () => {
    // `computeTotal` divides by the weight sum, so weights are relative, not
    // absolute percentages — a non-100 sum is valid, not a misconfiguration.
    const resolved = resolveConfig({ weights: { install: 10, maintenance: 0, documentation: 0, security: 0, compliance: 0 } })
    expect(resolved.weights.install).toBe(10)
    expect(resolved.weights.compliance).toBe(0)
  })
})
