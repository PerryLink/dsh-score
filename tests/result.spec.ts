/**
 * Total/grade/tally derivation over dimension scores, including the
 * no-evidence renormalization rule (a dimension without evidence is excluded
 * from the weighted average, never counted as zero).
 * @module dsh-score/test/result.spec
 */

import { describe, expect, it } from 'vitest'
import type { DimensionScore, LeaderboardRow } from '../src/result.ts'
import { computeTotal, gradeOf, hasEvidence, totalsOf, verdictOf } from '../src/result.ts'

function dim(overrides: Partial<DimensionScore> & { dimension: DimensionScore['dimension'] }): DimensionScore {
  return {
    status: 'pass',
    score: 100,
    weight: 20,
    summary: 'ok',
    evidence: [],
    ...overrides,
  }
}

describe('computeTotal', () => {
  it('is a weighted average over evidenced dimensions', () => {
    const total = computeTotal([
      dim({ dimension: 'install', score: 100, weight: 25 }),
      dim({ dimension: 'maintenance', score: 0, weight: 25 }),
    ])
    expect(total).toBe(50)
  })

  it('excludes no-evidence dimensions and renormalizes', () => {
    const total = computeTotal([
      dim({ dimension: 'install', score: 100, weight: 25 }),
      dim({ dimension: 'maintenance', status: 'no-evidence', score: 0, weight: 25 }),
    ])
    expect(total).toBe(100)
  })

  it('returns 0 when nothing has evidence', () => {
    expect(computeTotal([
      dim({ dimension: 'install', status: 'no-evidence', score: 0, weight: 25 }),
      dim({ dimension: 'maintenance', status: 'no-evidence', score: 0, weight: 25 }),
    ])).toBe(0)
  })
})

describe('gradeOf and verdictOf', () => {
  it('maps totals to letter grades', () => {
    expect(gradeOf(95, true)).toBe('A')
    expect(gradeOf(80, true)).toBe('B')
    expect(gradeOf(65, true)).toBe('C')
    expect(gradeOf(45, true)).toBe('D')
    expect(gradeOf(20, true)).toBe('F')
    expect(gradeOf(0, false)).toBe('N/A')
  })

  it('says no evidence when nothing was measured', () => {
    expect(verdictOf(0, false)).toBe('no evidence gathered from any dimension')
    expect(verdictOf(80, true)).toBe('healthy (weighted total 80/100)')
  })
})

describe('hasEvidence', () => {
  it('is true when at least one dimension is measured', () => {
    expect(hasEvidence([dim({ dimension: 'install', status: 'no-evidence' })])).toBe(false)
    expect(hasEvidence([dim({ dimension: 'install', status: 'fail' })])).toBe(true)
  })
})

describe('totalsOf', () => {
  function row(overrides: Partial<LeaderboardRow>): LeaderboardRow {
    return {
      target: 'x',
      kind: 'repo',
      total: 80,
      grade: 'B',
      verdict: 'ok',
      durationMs: 1,
      install: 'pass',
      maintenance: 'pass',
      documentation: 'pass',
      security: 'pass',
      compliance: 'pass',
      ...overrides,
    }
  }

  it('buckets rows by total and detects fully inconclusive cards', () => {
    const totals = totalsOf([
      row({ total: 90 }),
      row({ total: 70, grade: 'C', verdict: 'acceptable' }),
      row({ total: 30, grade: 'F', verdict: 'poor' }),
      row({ total: 0, grade: 'N/A', verdict: 'no evidence', install: 'no-evidence', maintenance: 'no-evidence', documentation: 'no-evidence', security: 'no-evidence', compliance: 'no-evidence' }),
    ])
    expect(totals).toEqual({ total: 4, pass: 1, warn: 1, fail: 1, noEvidence: 1 })
  })
})
