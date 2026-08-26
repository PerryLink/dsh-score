/**
 * Embeddable badge rendering and the five-dimension JSON API: pure SVG/endpoint
 * generation over a settled score card plus the `score_badge` tool through the
 * real registry. Asserts honest no-evidence degradation, grade/status color
 * mapping, and safe XML escaping.
 * @module dsh-score/test/badge.spec
 */

import { CallId } from '@deepseek-ai/dsh-llm'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { BADGE_SCHEMA, badgeJson, gradeColor, renderBadgeMarkdown, renderScoreBadge, renderShieldsSvg, shieldsEndpointUrl, statusColor } from '../src/badge.ts'
import type { DimensionScore, ScoreResult } from '../src/result.ts'
import { mountHarness, type Harness, type ScriptedSpawn } from './harness.ts'

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

function dim(dimension: DimensionScore['dimension'], overrides: Partial<DimensionScore>): DimensionScore {
  return {
    dimension,
    status: 'pass',
    score: 80,
    weight: 20,
    summary: 'ok',
    evidence: [],
    ...overrides,
  }
}

function makeResult(): ScoreResult {
  return {
    schema: 'dsh-score/v1',
    scoreId: 'sc_test',
    target: { kind: 'repo', spec: 'owner/repo' },
    scoredAt: RECENT,
    durationMs: 10,
    pluginVersion: '0.1.3',
    dimensions: {
      install: dim('install', { status: 'no-evidence', score: 0 }),
      maintenance: dim('maintenance', { status: 'pass', score: 90 }),
      documentation: dim('documentation', { status: 'pass', score: 85 }),
      security: dim('security', { status: 'warn', score: 60 }),
      compliance: dim('compliance', { status: 'pass', score: 100 }),
    },
    total: 84,
    grade: 'B',
    verdict: 'healthy (weighted total 84/100)',
  }
}

describe('renderShieldsSvg', () => {
  it('renders a valid flat-style SVG with both segments', () => {
    const svg = renderShieldsSvg('dsh-score', 'B · 84/100', gradeColor('B'))
    expect(svg).toContain('<svg')
    expect(svg).toContain('dsh-score')
    expect(svg).toContain('B · 84/100')
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('</svg>')
  })

  it('escapes XML metacharacters in the label', () => {
    const svg = renderShieldsSvg('a<b>&"c"', 'x', '#4c1')
    expect(svg).not.toContain('a<b>')
    expect(svg).toContain('a&lt;b&gt;&amp;&quot;c&quot;')
  })
})

describe('shieldsEndpointUrl', () => {
  it('escapes dashes, underscores, spaces, slashes, and the middle dot', () => {
    const url = shieldsEndpointUrl('dsh-score', 'B · 84/100', 'green')
    expect(url).toBe('https://img.shields.io/badge/dsh--score-B_%C2%B7_84%2F100-green')
  })
})

describe('gradeColor and statusColor', () => {
  it('maps grades and statuses to shields colors', () => {
    expect(gradeColor('A')).toBe('#4c1')
    expect(gradeColor('F')).toBe('#e05d44')
    expect(gradeColor('N/A')).toBe('#9f9f9f')
    expect(statusColor('pass')).toBe('#4c1')
    expect(statusColor('warn')).toBe('#fe7d37')
    expect(statusColor('fail')).toBe('#e05d44')
    expect(statusColor('no-evidence')).toBe('#9f9f9f')
  })
})

describe('badgeJson', () => {
  it('emits the five-dimension JSON with honest no-evidence install', () => {
    const json = badgeJson(makeResult())
    expect(json.schema).toBe(BADGE_SCHEMA)
    expect(json.total).toBe(84)
    expect(json.grade).toBe('B')
    expect(json.dimensions.install.status).toBe('no-evidence')
    expect(json.dimensions.install.score).toBe(0)
    expect(json.dimensions.maintenance.score).toBe(90)
    expect(json.badge.endpoint).toContain('img.shields.io')
    expect(json.badge.svg).toContain('<svg')
    expect(json.dimensionBadges.install.markdown).toContain('![')
  })

  it('derives the offline total badge SVG and Markdown embed', () => {
    const result = makeResult()
    const svg = renderScoreBadge(result)
    const markdown = renderBadgeMarkdown(result)
    expect(svg).toContain('dsh-score')
    expect(svg).toContain('B · 84/100')
    expect(markdown).toMatch(/^!\[dsh-score: B · 84\/100\]\(https:\/\/img\.shields\.io\/badge\//u)
  })
})

describe('score_badge tool', () => {
  let callCounter = 0
  async function callTool(harness: Harness, name: string, args: unknown): Promise<ToolExecutionResult> {
    callCounter += 1
    return harness.ctx.tools.execute({
      callId: CallId(`badge-spec-${callCounter}`),
      name,
      arguments: args,
      agent: harness.agent,
      signal: new AbortController().signal,
    })
  }

  it('registers score_badge', async () => {
    const harness = await mountHarness()
    expect(harness.ctx.tools.get('score_badge')).toBeDefined()
  })

  it('badges a target and renders the embed and JSON', async () => {
    const harness = await mountHarness({ scripts: [...GOOD_REPO_SCRIPTS] })
    const result = await callTool(harness, 'score_badge', { target: 'owner/repo' })
    expect(result.isError).toBe(false)
    const value = result.value as Record<string, unknown>
    expect(value.schema).toBe(BADGE_SCHEMA)
    const text = result.content.map(block => ('text' in block ? block.text : '')).join('')
    expect(text).toContain('![dsh-score:')
    expect(text).toContain('## Five-dimension JSON')
  })

  it('badges a stored card by id without re-scoring', async () => {
    const harness = await mountHarness({ scripts: [...GOOD_REPO_SCRIPTS] })
    const scored = await callTool(harness, 'score', { target: 'owner/repo' })
    const scoreId = (scored.value as Record<string, unknown>).scoreId as string
    const badged = await callTool(harness, 'score_badge', { id: scoreId })
    expect(badged.isError).toBe(false)
    expect((badged.value as Record<string, unknown>).grade).toBe((scored.value as Record<string, unknown>).grade)
  })

  it('fails honestly when neither or both of target and id are supplied', async () => {
    const harness = await mountHarness({ scripts: [] })
    const neither = await callTool(harness, 'score_badge', {})
    expect(neither.isError).toBe(true)
    const both = await callTool(harness, 'score_badge', { target: 'owner/repo', id: 'sc_x' })
    expect(both.isError).toBe(true)
  })
})
