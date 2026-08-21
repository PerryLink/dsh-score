/**
 * `/score` parsing and the command handler: target splitting, batch-cap
 * enforcement, and the real jobs registry start behind the command.
 * @module dsh-score/test/command.spec
 */

import { CommandId } from '@deepseek-ai/dsh-commands'
import type { CommandInvocation } from '@deepseek-ai/dsh-commands'
import { JobId } from '@deepseek-ai/dsh-jobs'
import { describe, expect, it } from 'vitest'
import type { BatchDeps } from '../src/batch.ts'
import { handleScore, parseTargets } from '../src/command.ts'
import { resolveConfig } from '../src/config.ts'
import type { Config } from '../src/config.ts'
import { scoreDomainSpec } from '../src/domain.ts'
import { ProbeDriver } from '../src/probe.ts'
import { mountHarness, type Harness, type ScriptedSpawn } from './harness.ts'

const RECENT = '2026-08-15T00:00:00.000Z'

const GOOD_REPO_SCRIPTS: ScriptedSpawn[] = [
  { exitCode: 0, stdout: JSON.stringify({ pushed_at: RECENT, open_issues_count: 0, license: { spdx_id: 'MIT' }, topics: ['dsh-plugin'] }) },
  { exitCode: 0, stdout: JSON.stringify([{ commit: { committer: { date: RECENT } } }]) },
  { exitCode: 0, stdout: JSON.stringify([{ name: 'README.md' }]) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from(JSON.stringify({ dsh: { bundle: { patch: './cordis.patch.yml' } } }), 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# patch', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# readme', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify([]) },
]

function invocation(rawInput: string, harness: Harness): CommandInvocation {
  return {
    commandId: CommandId('cmd-test'),
    agent: harness.agent,
    rawInput,
    // rc8: CommandInvocation carries durably admitted image blocks; the
    // /score command declares no `input.images`, so the empty list matches.
    attachments: [],
    signal: new AbortController().signal,
  }
}

describe('parseTargets', () => {
  it('splits on whitespace and commas and drops empties', () => {
    expect(parseTargets('  a, b  c\t d\ne ')).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(parseTargets('   , ')).toEqual([])
  })
})

describe('handleScore', () => {
  it('rejects an empty target list', async () => {
    const harness = await mountHarness({ plugin: false })
    const result = handleScore(batchDeps(harness), invocation('   ', harness))
    expect(result.kind).toBe('error')
    expect(result.text).toContain('Usage')
  })

  it('rejects a batch over the configured cap', async () => {
    const harness = await mountHarness({ plugin: false })
    const result = handleScore(batchDeps(harness, { maxBatchTargets: 2 }), invocation('a b c', harness))
    expect(result.kind).toBe('error')
    expect(result.text).toContain('cap')
  })

  it('starts a score-batch job that settles into a leaderboard', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [...GOOD_REPO_SCRIPTS] })
    const deps = batchDeps(harness)
    const result = handleScore(deps, invocation('owner/repo', harness))
    expect(result.kind).toBe('success')
    const jobId = JobId((result as { text: string }).text.match(/score-batch-\d+/u)?.[0] ?? '')
    const snapshot = await harness.ctx.jobs.wait(jobId, 10_000, harness.agent)
    expect(snapshot.status).toBe('completed')
    const domain = await deps.domain()
    const leaderboards = [...domain.table('leaderboards').entries()]
    expect(leaderboards).toHaveLength(1)
    expect(leaderboards[0]?.[1].totals.total).toBe(1)
  })
})

/** Build the batch deps the command handler needs from a plugin-less harness. */
function batchDeps(harness: Harness, overrides: Config = {}): BatchDeps {
  const config = resolveConfig(overrides)
  const log = (): void => {}
  const driver = new ProbeDriver({ ctx: harness.ctx, config, log })
  const domain = (async () => harness.ctx.storageDomain.open(scoreDomainSpec))()
  return { ctx: harness.ctx, config, driver, log, domain: () => domain }
}
