/**
 * The scoring pipeline end-to-end against scripted `gh`/`npm` output, plus the
 * reserved test-drive consumer (`readTestDriveEvidence`) reading the
 * already-open `test_drive` domain. Asserts evidence-backed totals, honest
 * no-evidence install when test-drive is absent, and score-cache reuse.
 * @module dsh-score/test/score.spec
 */

import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { scoreDomainSpec } from '../src/domain.ts'
import { ProbeDriver } from '../src/probe.ts'
import { readTestDriveEvidence, ScoreRunner } from '../src/score.ts'
import { FakeSubprocessRuntime, mountHarness, type ScriptedSpawn } from './harness.ts'

const RECENT = '2026-08-15T00:00:00.000Z'

/** Scripted gh responses for one healthy repo target, in probe order. */
const GOOD_REPO_SCRIPTS: ScriptedSpawn[] = [
  { exitCode: 0, stdout: JSON.stringify({ pushed_at: RECENT, open_issues_count: 0, default_branch: 'main', archived: false, license: { spdx_id: 'MIT' }, topics: ['dsh-plugin', 'deepseek-harness'] }) },
  { exitCode: 0, stdout: JSON.stringify([{ commit: { committer: { date: RECENT } } }]) },
  { exitCode: 0, stdout: JSON.stringify([{ name: 'README.md' }, { name: 'README.zh.md' }, { name: 'CHANGELOG.md' }, { name: 'SECURITY.md' }]) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from(JSON.stringify({ name: 'demo', dsh: { bundle: { patch: './cordis.patch.yml' } } }), 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# patch', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# readme', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify([]) },
]

function makeRunner(ctx: import('@deepseek-ai/cordis').Context) {
  const facility = ctx.get('storageDomain')
  if (facility === undefined) throw new Error('storageDomain absent')
  const config = resolveConfig(undefined)
  const log = (): void => {}
  const driver = new ProbeDriver({ ctx, config, log })
  // Single-flight domain open: every `domain()` call returns the same promise,
  // so the cache check and the record write share one open handle.
  const domainPromise = facility.open(scoreDomainSpec)
  return { runner: new ScoreRunner({ ctx, config, driver, log, domain: () => domainPromise }), facility, config }
}

describe('ScoreRunner.score', () => {
  it('scores a repo from scripted gh evidence and reports no-evidence install', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [...GOOD_REPO_SCRIPTS] })
    const { runner } = makeRunner(harness.ctx)
    const result = await runner.score('owner/repo')
    expect(result.schema).toBe('dsh-score/v1')
    expect(result.target.spec).toBe('owner/repo')
    expect(result.dimensions.install.status).toBe('no-evidence')
    expect(result.dimensions.maintenance.status).toBe('pass')
    expect(result.dimensions.security.status).toBe('pass')
    expect(result.dimensions.compliance.status).toBe('pass')
    expect(result.total).toBeGreaterThan(0)
    expect(result.grade).not.toBe('N/A')
    // Every scored dimension carries at least one audit link.
    for (const dimension of Object.values(result.dimensions)) {
      expect(dimension.evidence.length).toBeGreaterThan(0)
    }
  })

  it('returns the cached card on a second score within the TTL', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [...GOOD_REPO_SCRIPTS] })
    const { runner } = makeRunner(harness.ctx)
    const first = await runner.score('owner/repo')
    const second = await runner.score('owner/repo')
    expect(second.scoredAt).toBe(first.scoredAt)
    expect(second.scoreId).toBe(first.scoreId)
  })

  it('bypasses the cache with refresh: true and re-gathers evidence', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [...GOOD_REPO_SCRIPTS, ...GOOD_REPO_SCRIPTS] })
    const { runner } = makeRunner(harness.ctx)
    const fake = harness.subprocess as FakeSubprocessRuntime
    await runner.score('owner/repo')
    const spawnsBefore = fake.spawns.length
    await runner.score('owner/repo', { refresh: true })
    expect(fake.spawns.length).toBe(spawnsBefore * 2)
  })
})

describe('readTestDriveEvidence', () => {
  const driveRunSchema = z.object({
    schema: z.literal('dsh-test-drive/v1'),
    run: z.object({ runId: z.string(), finishedAt: z.string() }),
    target: z.object({ spec: z.string(), resolved: z.object({ packageName: z.string() }).optional() }),
    verdict: z.string(),
    verdictReason: z.string(),
  }).passthrough()

  async function openTestDrive(ctx: import('@deepseek-ai/cordis').Context) {
    const facility = ctx.get('storageDomain')
    if (facility === undefined) throw new Error('storageDomain absent')
    return facility.open(defineDomain({
      name: 'test_drive',
      version: 1,
      tables: { runs: domainTable(driveRunSchema) },
    }))
  }

  function runRecord(spec: string, verdict: string, finishedAt: string, runId: string): z.infer<typeof driveRunSchema> {
    return { schema: 'dsh-test-drive/v1', run: { runId, finishedAt }, target: { spec }, verdict, verdictReason: 'ok' }
  }

  it('returns the newest matching drive verdict', async () => {
    const harness = await mountHarness({ plugin: false })
    const domain = await openTestDrive(harness.ctx)
    await domain.table('runs').put('tdr_a', runRecord('owner/repo', 'pass', '2026-08-01T00:00:00.000Z', 'tdr_a'))
    await domain.table('runs').put('tdr_b', runRecord('owner/repo', 'partial', '2026-08-02T00:00:00.000Z', 'tdr_b'))
    const evidence = readTestDriveEvidence(harness.ctx, 'owner/repo', undefined)
    expect(evidence?.verdict).toBe('partial')
    expect(evidence?.detail).toContain('tdr_b')
  })

  it('returns undefined when no test_drive domain is open', async () => {
    const harness = await mountHarness({ plugin: false })
    expect(readTestDriveEvidence(harness.ctx, 'owner/repo', undefined)).toBeUndefined()
  })

  it('returns undefined for a non-matching target', async () => {
    const harness = await mountHarness({ plugin: false })
    const domain = await openTestDrive(harness.ctx)
    await domain.table('runs').put('tdr_x', runRecord('other/repo', 'pass', '2026-08-01T00:00:00.000Z', 'tdr_x'))
    expect(readTestDriveEvidence(harness.ctx, 'owner/repo', undefined)).toBeUndefined()
  })
})
