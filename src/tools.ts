/**
 * The two model tools: `score` (one target through the full scoring pipeline,
 * optionally as a background job) and `score_report` (fetch a stored score
 * card or leaderboard by id, or the latest leaderboard). Canonical outputs are
 * the structured records themselves; the renderers turn them into Markdown.
 *
 * @module dsh-score/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Domain } from '@deepseek-ai/dsh-storage-domain'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { BADGE_SCHEMA, badgeJson } from './badge.ts'
import type { BadgeJson } from './badge.ts'
import { startBatchJob } from './batch.ts'
import type { BatchDeps } from './batch.ts'
import type { ResolvedConfig } from './config.ts'
import type { scoreDomainSpec } from './domain.ts'
import { renderLeaderboard, renderScoreCard } from './report.ts'
import { RESULT_SCHEMA } from './result.ts'
import type { LeaderboardRecord, ScoreResult } from './result.ts'
import { ScoreRunner } from './score.ts'
import { SCORE_KEY_PREFIX } from './score.ts'
import { sanitizeTarget } from './sanitize.ts'

/** Everything both tools need; assembled by `src/index.ts`. */
export interface ToolServices extends BatchDeps {
  ctx: Context
  config: ResolvedConfig
  domain: () => Promise<Domain<typeof scoreDomainSpec>>
  runner: ScoreRunner
}

/** JSON-schema fragment for one evidence link. */
const evidenceLinkSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    source: { type: 'string' },
    detail: { type: 'string' },
    observedAt: { type: 'string' },
  },
} as const

/** JSON-schema fragment for one dimension score. */
const dimensionScoreSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dimension: { type: 'string' },
    status: { type: 'string' },
    score: { type: 'number' },
    weight: { type: 'number' },
    summary: { type: 'string' },
    evidence: { type: 'array', items: evidenceLinkSchema },
  },
} as const

/**
 * Full JSON-schema fragment for the score-card branch of both tool outputs.
 * The compiled type doubles as the compile-time assertion that the canonical
 * `ScoreResult` value matches the declared tool contract.
 */
const scoreResultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema: { type: 'string', const: RESULT_SCHEMA },
    scoreId: { type: 'string' },
    target: {
      type: 'object',
      additionalProperties: false,
      properties: { kind: { type: 'string' }, spec: { type: 'string' } },
    },
    scoredAt: { type: 'string' },
    durationMs: { type: 'integer' },
    pluginVersion: { type: 'string' },
    dimensions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        install: dimensionScoreSchema,
        maintenance: dimensionScoreSchema,
        documentation: dimensionScoreSchema,
        security: dimensionScoreSchema,
        compliance: dimensionScoreSchema,
      },
    },
    total: { type: 'number' },
    grade: { type: 'string' },
    verdict: { type: 'string' },
  },
} as const

/** Full JSON-schema fragment for the leaderboard branch of `score_report`. */
const leaderboardSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema: { type: 'string', const: RESULT_SCHEMA },
    id: { type: 'string' },
    createdAt: { type: 'string' },
    durationMs: { type: 'integer' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string' },
          kind: { type: 'string' },
          total: { type: 'number' },
          grade: { type: 'string' },
          verdict: { type: 'string' },
          durationMs: { type: 'integer' },
          install: { type: 'string' },
          maintenance: { type: 'string' },
          documentation: { type: 'string' },
          security: { type: 'string' },
          compliance: { type: 'string' },
        },
      },
    },
    totals: {
      type: 'object',
      additionalProperties: false,
      properties: {
        total: { type: 'integer' },
        pass: { type: 'integer' },
        warn: { type: 'integer' },
        fail: { type: 'integer' },
        noEvidence: { type: 'integer' },
      },
    },
  },
} as const

/** JSON-schema fragment for one compact dimension entry of the badge JSON. */
const dimensionScoreSummarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string' },
    status: { type: 'string' },
    score: { type: 'number' },
    weight: { type: 'number' },
    summary: { type: 'string' },
  },
} as const

/** JSON-schema fragment for the total badge surface (SVG + endpoint + markdown). */
const badgeSurfaceSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    endpoint: { type: 'string' },
    markdown: { type: 'string' },
    svg: { type: 'string' },
  },
} as const

/** JSON-schema fragment for one per-dimension badge (endpoint + markdown). */
const badgeEndpointSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    endpoint: { type: 'string' },
    markdown: { type: 'string' },
  },
} as const

/** Full JSON-schema fragment for the `score_badge` five-dimension JSON output. */
const badgeJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema: { type: 'string', const: BADGE_SCHEMA },
    target: {
      type: 'object',
      additionalProperties: false,
      properties: { kind: { type: 'string' }, spec: { type: 'string' } },
    },
    scoredAt: { type: 'string' },
    pluginVersion: { type: 'string' },
    total: { type: 'number' },
    grade: { type: 'string' },
    verdict: { type: 'string' },
    dimensions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        install: dimensionScoreSummarySchema,
        maintenance: dimensionScoreSummarySchema,
        documentation: dimensionScoreSummarySchema,
        security: dimensionScoreSummarySchema,
        compliance: dimensionScoreSummarySchema,
      },
    },
    badge: badgeSurfaceSchema,
    dimensionBadges: {
      type: 'object',
      additionalProperties: false,
      properties: {
        install: badgeEndpointSchema,
        maintenance: badgeEndpointSchema,
        documentation: badgeEndpointSchema,
        security: badgeEndpointSchema,
        compliance: badgeEndpointSchema,
      },
    },
  },
} as const

/** Canonical background branch returned when `score` runs as a job. */
export interface BackgroundHandle {
  kind: 'background'
  jobId: string
}

/** Render one `score` result (score card or background handle). */
function renderScore(value: ScoreResult | BackgroundHandle): { type: 'text'; text: string }[] {
  if ((value as BackgroundHandle).kind === 'background') {
    return [{ type: 'text', text: `Started background scoring job ${(value as BackgroundHandle).jobId}. Read its output for progress; the final line names the leaderboard id for score_report.` }]
  }
  return [{ type: 'text', text: renderScoreCard(value as ScoreResult) }]
}

/** Render one `score_report` result (leaderboard or score card). */
function renderReport(value: ScoreResult | LeaderboardRecord): { type: 'text'; text: string }[] {
  const text = 'rows' in value ? renderLeaderboard(value) : renderScoreCard(value)
  return [{ type: 'text', text }]
}

/** Render one `score_badge` result: Markdown embed + the five-dimension JSON. */
function renderBadge(value: BadgeJson): { type: 'text'; text: string }[] {
  const lines = [
    '# Score badge',
    '',
    `- Target: \`${value.target.spec}\` — grade **${value.grade}** (${value.total}/100)`,
    `- Scored: ${value.scoredAt}`,
    '',
    '## Embed',
    '',
    value.badge.markdown,
    '',
    '## Five-dimension JSON',
    '',
    '```json',
    JSON.stringify({ schema: value.schema, target: value.target, scoredAt: value.scoredAt, pluginVersion: value.pluginVersion, total: value.total, grade: value.grade, verdict: value.verdict, dimensions: value.dimensions }, null, 2),
    '```',
  ]
  return [{ type: 'text', text: lines.join('\n') }]
}

/** The deadline for one foreground score: every probe deadline plus slack. */
function scoreDeadlineMs(config: ResolvedConfig): number {
  return config.probeTimeoutMs * 10 + 60_000
}

/** Owner for a background branch; background work needs a live agent to collect it. */
function requireOwner(exec: ToolRunContext): Agent {
  if (exec.agent === undefined) throw new Error('dsh-score: background scoring requires an owning agent')
  return exec.agent
}

/** Build both tool definitions over the shared services. */
export function allTools(services: ToolServices) {
  const score = defineTool({
    name: 'score',
    description:
      'Score one DeepSeek Harness plugin target (a GitHub repo spec or an npm package name) across five dimensions from REAL CLI evidence: install success (consuming dsh-test-drive results when present), maintenance activity, documentation completeness, security scan (license, secret leaks, malicious install scripts), and protocol compliance (dsh.bundle.patch + dsh-plugin topic). Every conclusion carries an evidence link and audit timestamp; a dimension without evidence is honestly reported as no-evidence, never fabricated. Returns a risk card with a weighted total and letter grade. Use background: true for a slow target.',
    parameters: {
      target: {
        type: 'string',
        required: true as const,
        description: 'Plugin target: a GitHub repo (github:owner/repo, owner/repo, a git/https URL) or an npm package name.',
      },
      refresh: {
        type: 'boolean',
        description: 'Bypass the score cache and re-score from fresh evidence (default false).',
      },
      background: {
        type: 'boolean',
        description: 'Score as a background job and return its job id instead of waiting.',
      },
    },
    output: {
      schema: {
        oneOf: [
          scoreResultSchema,
          {
            type: 'object',
            additionalProperties: false,
            properties: { kind: { type: 'string', const: 'background' }, jobId: { type: 'string' } },
          },
        ],
      },
      render: (_args, value) => renderScore(value as unknown as ScoreResult | BackgroundHandle),
    },
    timeoutMs: scoreDeadlineMs(services.config),
    async execute(args, exec) {
      const target = sanitizeTarget(args.target)
      if (target.length === 0) throw new Error('dsh-score: target must be a non-empty string')
      if (args.background === true) {
        const owner = requireOwner(exec)
        const jobId = startBatchJob(services, [target], owner, `score ${target}`)
        return { kind: 'background' as const, jobId: String(jobId) }
      }
      return services.runner.score(target, { signal: exec.signal, refresh: args.refresh === true })
    },
  })

  const scoreReport = defineTool({
    name: 'score_report',
    description:
      'Fetch a stored score record by id: a score card (sc_...), a leaderboard (lb_...), or — with no id — the latest leaderboard. Returns the structured record and renders it as Markdown.',
    parameters: {
      id: {
        type: 'string',
        description: 'Score id (sc_...), leaderboard id (lb_...); omitted = the latest leaderboard.',
      },
    },
    output: {
      schema: { oneOf: [scoreResultSchema, leaderboardSchema] },
      render: (_args, value) => renderReport(value as unknown as ScoreResult | LeaderboardRecord),
    },
    async execute(args) {
      const domain = await services.domain()
      if (args.id === undefined || args.id === '') {
        const latest = domain.global.get()
        if (latest.leaderboardId === '') throw new Error('dsh-score: no leaderboard recorded yet — run /score or score first')
        const leaderboard = domain.table('leaderboards').get(latest.leaderboardId)
        if (leaderboard === undefined) throw new Error(`dsh-score: latest leaderboard ${latest.leaderboardId} not found`)
        return leaderboard
      }
      if (args.id.startsWith(SCORE_KEY_PREFIX)) {
        const card = domain.table('scores').get(args.id)
        if (card === undefined) throw new Error(`dsh-score: no score recorded with id ${args.id}`)
        return card
      }
      if (args.id.startsWith('lb_')) {
        const leaderboard = domain.table('leaderboards').get(args.id)
        if (leaderboard === undefined) throw new Error(`dsh-score: no leaderboard recorded with id ${args.id}`)
        return leaderboard
      }
      throw new Error(`dsh-score: unknown report id ${args.id} (expected sc_... score or lb_... leaderboard)`)
    },
  })

  const scoreBadge = defineTool({
    name: 'score_badge',
    description:
      'Generate an embeddable README badge and the five-dimension JSON for one plugin target. Scores the target through the cache (or fetches a stored score card by id) and returns a shields.io flat SVG badge, its documented endpoint URL, a Markdown embed snippet, and the compact five-dimension JSON (install/maintenance/documentation/security/compliance each with status, score, weight, summary) plus the weighted total and letter grade. A dimension without evidence is reported honestly as no-evidence (grey, score 0), never fabricated.',
    parameters: {
      target: {
        type: 'string',
        description: 'Plugin target to badge: a GitHub repo or an npm package name (mutually exclusive with id).',
      },
      id: {
        type: 'string',
        description: 'Stored score id (sc_...) to badge without re-scoring (mutually exclusive with target).',
      },
      refresh: {
        type: 'boolean',
        description: 'Bypass the score cache and re-score from fresh evidence (default false; only applies to target).',
      },
    },
    output: {
      schema: badgeJsonSchema,
      render: (_args, value) => renderBadge(value as unknown as BadgeJson),
    },
    timeoutMs: scoreDeadlineMs(services.config),
    async execute(args, exec) {
      const hasTarget = args.target !== undefined && args.target !== ''
      const hasId = args.id !== undefined && args.id !== ''
      if (hasTarget === hasId) {
        throw new Error('dsh-score: score_badge requires exactly one of target or id')
      }
      let result: ScoreResult
      if (hasId) {
        const domain = await services.domain()
        const card = domain.table('scores').get(String(args.id))
        if (card === undefined) throw new Error(`dsh-score: no score recorded with id ${String(args.id)}`)
        result = card
      } else {
        const target = sanitizeTarget(String(args.target))
        if (target.length === 0) throw new Error('dsh-score: target must be a non-empty string')
        result = await services.runner.score(target, { signal: exec.signal, refresh: args.refresh === true })
      }
      return badgeJson(result)
    },
  })

  return [score, scoreBadge, scoreReport]
}
