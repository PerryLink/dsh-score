/**
 * Tool surface through the REAL registry: registration, canonical output
 * values, render content, `score_report` reads (score id, leaderboard id,
 * latest leaderboard), and honest errors for unknown ids.
 * @module dsh-score/test/tools.spec
 */

import { JobId } from '@deepseek-ai/dsh-jobs'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { mountHarness, type Harness, type ScriptedSpawn } from './harness.ts'

/**
 * Brand a synthetic tool-call id without naming the host line's brand: the
 * published `0.1.1-rc.2` line exports `CallId` while host HEAD renamed it to
 * `ToolCallId` — deriving the type from `tools.execute` keeps both typecheck
 * rulers green.
 */
type ToolExecInput = Parameters<Harness['ctx']['tools']['execute']>[0]
const makeCallId = (id: string): ToolExecInput['callId'] => id as ToolExecInput['callId']

const RECENT = '2026-08-15T00:00:00.000Z'

const GOOD_REPO_SCRIPTS: ScriptedSpawn[] = [
  { exitCode: 0, stdout: JSON.stringify({ pushed_at: RECENT, open_issues_count: 0, default_branch: 'main', archived: false, license: { spdx_id: 'MIT' }, topics: ['dsh-plugin'] }) },
  { exitCode: 0, stdout: JSON.stringify([{ commit: { committer: { date: RECENT } } }]) },
  { exitCode: 0, stdout: JSON.stringify([{ name: 'README.md' }, { name: 'README.zh.md' }, { name: 'CHANGELOG.md' }, { name: 'SECURITY.md' }]) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from(JSON.stringify({ dsh: { bundle: { patch: './cordis.patch.yml' } } }), 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# patch', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify({ content: Buffer.from('# readme', 'utf8').toString('base64') }) },
  { exitCode: 0, stdout: JSON.stringify([]) },
]

let callCounter = 0

async function callTool(harness: Harness, name: string, args: unknown): Promise<ToolExecutionResult> {
  callCounter += 1
  return harness.ctx.tools.execute({
    callId: makeCallId(`tools-spec-${callCounter}`),
    name,
    arguments: args,
    agent: harness.agent,
    signal: new AbortController().signal,
  })
}

describe('registration', () => {
  it('registers score and score_report', async () => {
    const harness = await mountHarness()
    expect(harness.ctx.tools.get('score')).toBeDefined()
    expect(harness.ctx.tools.get('score_report')).toBeDefined()
  })
})

describe('score render', () => {
  it('scores a repo and renders the risk card as Markdown', async () => {
    const harness = await mountHarness({ scripts: [...GOOD_REPO_SCRIPTS] })
    const result = await callTool(harness, 'score', { target: 'owner/repo' })
    expect(result.isError).toBe(false)
    const value = result.value as Record<string, unknown>
    expect(value.schema).toBe('dsh-score/v1')
    expect((value.dimensions as Record<string, unknown>).install).toBeDefined()
    const text = result.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('# Score')
    expect(text).toContain('| Dimension |')
  })
})

describe('score_report', () => {
  it('returns a stored score by id', async () => {
    const harness = await mountHarness({ scripts: [...GOOD_REPO_SCRIPTS] })
    const scored = await callTool(harness, 'score', { target: 'owner/repo' })
    const scoreId = (scored.value as Record<string, unknown>).scoreId as string
    const report = await callTool(harness, 'score_report', { id: scoreId })
    expect(report.isError).toBe(false)
    expect((report.value as Record<string, unknown>).scoreId).toBe(scoreId)
  })

  it('returns the latest leaderboard with no id after a batch job', async () => {
    const harness = await mountHarness({ scripts: [...GOOD_REPO_SCRIPTS] })
    const background = await callTool(harness, 'score', { target: 'owner/repo', background: true })
    const jobId = String((background.value as Record<string, unknown>).jobId)
    await harness.ctx.jobs.wait(JobId(jobId), 10_000, harness.agent)
    const report = await callTool(harness, 'score_report', {})
    expect(report.isError).toBe(false)
    const value = report.value as Record<string, unknown>
    expect(value.id).toMatch(/^lb_/)
    const totals = value.totals as Record<string, unknown>
    expect(totals.total).toBe(1)
    const text = report.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('# Score leaderboard')
  })

  it('fails honestly for unknown and malformed ids', async () => {
    const harness = await mountHarness({ scripts: [] })
    const unknown = await callTool(harness, 'score_report', { id: 'sc_nope' })
    expect(unknown.isError).toBe(true)
    const malformed = await callTool(harness, 'score_report', { id: 'whatever' })
    expect(malformed.isError).toBe(true)
  })

  it('fails honestly when no leaderboard exists yet', async () => {
    const harness = await mountHarness({ scripts: [] })
    const empty = await callTool(harness, 'score_report', {})
    expect(empty.isError).toBe(true)
  })
})
