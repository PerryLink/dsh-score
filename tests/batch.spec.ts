/**
 * Batch producer: row projection, progress lines, and `runBatch` producing a
 * sorted leaderboard with correct tallies and the latest-leaderboard pointer.
 * @module dsh-score/test/batch.spec
 */

import { describe, expect, it } from 'vitest'
import type { BatchDeps } from '../src/batch.ts'
import { leaderboardSummary, progressLine, rowOf, runBatch } from '../src/batch.ts'
import { resolveConfig } from '../src/config.ts'
import { scoreDomainSpec } from '../src/domain.ts'
import { ProbeDriver } from '../src/probe.ts'
import type { Dimension, LeaderboardRecord, ScoreResult } from '../src/result.ts'
import { mountHarness, type Harness, type ScriptedSpawn } from './harness.ts'

const RECENT = '2026-08-15T00:00:00.000Z'

const GOOD_REPO_SCRIPTS: ScriptedSpawn[] = [
  { exitCode: 0, stdout: JSON.stringify({ pushed_at: RECENT, open_issues_count: 0, license: { spdx_id: 'MIT' }, topics: ['dsh-plugin'] }) },
  { exitCode: 0, stdout: JSON.stringify([{ commit: { committer: { date: RECENT } } }]) },
  { exitCode: 0, stdout: JSON.stringify([{ name: 'README.md' }, { name: 'CHANGELOG.md' }, { name: 'SECURITY.md' }]) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from(JSON.stringify({ dsh: { bundle: { patch: './cordis.patch.yml' } } }), 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# patch', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# readme', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify([]) },
]

function makeScore(target: string, total: number): ScoreResult {
  const dim = (dimension: Dimension) => ({ dimension, status: 'pass' as const, score: total, weight: 20, summary: 'ok', evidence: [] })
  return {
    schema: 'dsh-score/v1',
    scoreId: 'sc_test',
    target: { kind: 'repo', spec: target },
    scoredAt: '2026-08-20T00:00:00.000Z',
    durationMs: 1,
    pluginVersion: '0.1.0',
    dimensions: {
      install: dim('install'),
      maintenance: dim('maintenance'),
      documentation: dim('documentation'),
      security: dim('security'),
      compliance: dim('compliance'),
    },
    total,
    grade: 'A',
    verdict: 'ok',
  }
}

describe('rowOf / progressLine / leaderboardSummary', () => {
  it('projects a score card into a leaderboard row', () => {
    const row = rowOf(makeScore('owner/repo', 88))
    expect(row.target).toBe('owner/repo')
    expect(row.total).toBe(88)
    expect(row.install).toBe('pass')
  })

  it('formats a progress line and a summary', () => {
    expect(progressLine(1, 3, makeScore('owner/repo', 88))).toContain('[1/3] owner/repo → A (88/100')
    const record: LeaderboardRecord = { schema: 'dsh-score/v1', id: 'lb_x', createdAt: '', durationMs: 1, rows: [], totals: { total: 0, pass: 0, warn: 0, fail: 0, noEvidence: 0 } }
    expect(leaderboardSummary(record)).toContain('0 pass')
  })
})

describe('runBatch', () => {
  it('scores a target and writes a leaderboard with the latest pointer', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [...GOOD_REPO_SCRIPTS] })
    const deps = batchDeps(harness)
    const lines: string[] = []
    const { leaderboard, leaderboardId } = await runBatch(deps, ['owner/repo'], new AbortController().signal, line => { lines.push(line) })
    expect(leaderboard.schema).toBe('dsh-score/v1')
    expect(leaderboard.id).toBe(leaderboardId)
    expect(leaderboard.rows).toHaveLength(1)
    expect(leaderboard.totals.total).toBe(1)
    expect(lines).toHaveLength(1)
    const domain = await deps.domain()
    expect(domain.global.get().leaderboardId).toBe(leaderboardId)
  })
})

function batchDeps(harness: Harness): BatchDeps {
  const config = resolveConfig(undefined)
  const log = (): void => {}
  const driver = new ProbeDriver({ ctx: harness.ctx, config, log })
  const domain = (async () => harness.ctx.storageDomain.open(scoreDomainSpec))()
  return { ctx: harness.ctx, config, driver, log, domain: () => domain }
}
