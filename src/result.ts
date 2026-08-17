/**
 * The structured scoring contract `dsh-score/v1`: one score card per target,
 * plus the leaderboard record that aggregates them. The zod schemas are the
 * single source of truth — the same schemas validate records at the durable
 * boundary of the `score` storage domain, and the compiled types type the
 * runtime.
 *
 * Every conclusion a score card carries is backed by an {@link EvidenceLink}
 * (source, sanitized detail, and an audit timestamp). A dimension that has no
 * evidence reports `no-evidence` — it never fabricates a number.
 *
 * @module dsh-score/result
 */

import { z } from 'zod'

/** Schema discriminator of every record this plugin writes (version 1). */
export const RESULT_SCHEMA = 'dsh-score/v1' as const

/** The five scored dimensions, in canonical order. */
export const DIMENSIONS = ['install', 'maintenance', 'documentation', 'security', 'compliance'] as const
export type Dimension = (typeof DIMENSIONS)[number]

/** Outcome of one dimension: passing, concerning, failing, or no evidence gathered. */
export const DimensionStatusSchema = z.union([
  z.literal('pass'),
  z.literal('warn'),
  z.literal('fail'),
  z.literal('no-evidence'),
])
export type DimensionStatus = z.infer<typeof DimensionStatusSchema>

/** How the target was addressed. */
export const TargetKindSchema = z.union([z.literal('repo'), z.literal('npm')])
export type TargetKind = z.infer<typeof TargetKindSchema>

/** One audit link: where a fact came from, what was observed, and when. */
export const EvidenceLinkSchema = z.object({
  /** Provenance class: `gh-api`, `npm-cli`, `git`, `test-drive`, or `none`. */
  source: z.string().min(1),
  /** Sanitized one-line description of the exact command or record. */
  detail: z.string(),
  /** ISO-8601 timestamp of the observation. */
  observedAt: z.string().min(1),
})
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>

/** One dimension's verdict: status, 0..100 score, weight, summary, and evidence. */
export const DimensionScoreSchema = z.object({
  /** Dimension id, see {@link Dimension}. */
  dimension: z.enum(DIMENSIONS),
  /** Verdict, see {@link DimensionStatus}. */
  status: DimensionStatusSchema,
  /** Dimension score in 0..100 (0 when there is no evidence). */
  score: z.number().min(0).max(100),
  /** Weight used when summing into the total (0..100). */
  weight: z.number().min(0).max(100),
  /** Sanitized one-line verdict. */
  summary: z.string(),
  /** Audit links backing the score. */
  evidence: z.array(EvidenceLinkSchema),
})
export type DimensionScore = z.infer<typeof DimensionScoreSchema>

/** One complete score card for a target. */
export const ScoreResultSchema = z.object({
  /** Discriminator {@link RESULT_SCHEMA}. */
  schema: z.literal(RESULT_SCHEMA),
  /** Unique score id (also the `scores` table key). */
  scoreId: z.string().min(1),
  /** Scored target. */
  target: z.object({
    kind: TargetKindSchema,
    /** Sanitized target spec exactly as supplied. */
    spec: z.string().min(1),
  }),
  /** ISO-8601 audit timestamp of the whole score. */
  scoredAt: z.string().min(1),
  /** Wall-clock duration of the scoring run in milliseconds. */
  durationMs: z.number().finite(),
  /** Producer version. */
  pluginVersion: z.string().min(1),
  /** Five dimension scores keyed by dimension id. */
  dimensions: z.object({
    install: DimensionScoreSchema,
    maintenance: DimensionScoreSchema,
    documentation: DimensionScoreSchema,
    security: DimensionScoreSchema,
    compliance: DimensionScoreSchema,
  }),
  /** Weighted total over dimensions that have evidence, 0..100. */
  total: z.number().min(0).max(100),
  /** Letter grade derived from the total, or `N/A` when nothing had evidence. */
  grade: z.string(),
  /** One-line sanitized summary of the whole card. */
  verdict: z.string(),
})
export type ScoreResult = z.infer<typeof ScoreResultSchema>

/** One leaderboard row: the per-target total plus per-dimension statuses. */
export const LeaderboardRowSchema = z.object({
  /** Sanitized target spec. */
  target: z.string().min(1),
  /** Address kind. */
  kind: TargetKindSchema,
  /** Weighted total, 0..100. */
  total: z.number().min(0).max(100),
  /** Letter grade. */
  grade: z.string(),
  /** Sanitized one-line verdict. */
  verdict: z.string(),
  /** Scoring duration in milliseconds. */
  durationMs: z.number().finite(),
  /** Per-dimension statuses for the leaderboard table. */
  install: DimensionStatusSchema,
  maintenance: DimensionStatusSchema,
  documentation: DimensionStatusSchema,
  security: DimensionStatusSchema,
  compliance: DimensionStatusSchema,
})
export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>

/** Aggregated leaderboard record keyed by its id. */
export const LeaderboardRecordSchema = z.object({
  /** Discriminator {@link RESULT_SCHEMA}. */
  schema: z.literal(RESULT_SCHEMA),
  /** Leaderboard id (also the `leaderboards` table key). */
  id: z.string().min(1),
  /** ISO-8601 creation timestamp. */
  createdAt: z.string().min(1),
  /** Total wall-clock duration of the batch in milliseconds. */
  durationMs: z.number().finite(),
  /** Per-target rows, ordered by descending total. */
  rows: z.array(LeaderboardRowSchema),
  /** Per-target totals. */
  totals: z.object({
    total: z.number().int().min(0),
    pass: z.number().int().min(0),
    warn: z.number().int().min(0),
    fail: z.number().int().min(0),
    noEvidence: z.number().int().min(0),
  }),
})
export type LeaderboardRecord = z.infer<typeof LeaderboardRecordSchema>

/** Weighted average over dimensions that actually gathered evidence. */
export function computeTotal(dimensions: readonly DimensionScore[]): number {
  let weightSum = 0
  let productSum = 0
  for (const dimension of dimensions) {
    if (dimension.status === 'no-evidence') continue
    weightSum += dimension.weight
    productSum += dimension.score * dimension.weight
  }
  if (weightSum === 0) return 0
  return Math.round(productSum / weightSum)
}

/** Whether any dimension gathered evidence (as opposed to a fully inconclusive card). */
export function hasEvidence(dimensions: readonly DimensionScore[]): boolean {
  return dimensions.some(dimension => dimension.status !== 'no-evidence')
}

/** Letter grade for a weighted total; `N/A` when no dimension had evidence. */
export function gradeOf(total: number, evidenced: boolean): string {
  if (!evidenced) return 'N/A'
  if (total >= 90) return 'A'
  if (total >= 75) return 'B'
  if (total >= 60) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

/** One-line whole-card verdict from the total and evidence coverage. */
export function verdictOf(total: number, evidenced: boolean): string {
  if (!evidenced) return 'no evidence gathered from any dimension'
  if (total >= 75) return `healthy (weighted total ${total}/100)`
  if (total >= 60) return `acceptable (weighted total ${total}/100)`
  if (total >= 40) return `concerning (weighted total ${total}/100)`
  return `poor (weighted total ${total}/100)`
}

/** Compile the per-target tallies for one leaderboard record. */
export function totalsOf(rows: readonly LeaderboardRow[]): LeaderboardRecord['totals'] {
  const totals = { total: rows.length, pass: 0, warn: 0, fail: 0, noEvidence: 0 }
  for (const row of rows) {
    if (row.install === 'no-evidence' && row.maintenance === 'no-evidence' && row.documentation === 'no-evidence'
      && row.security === 'no-evidence' && row.compliance === 'no-evidence') {
      totals.noEvidence += 1
      continue
    }
    if (row.total >= 75) totals.pass += 1
    else if (row.total >= 60) totals.warn += 1
    else totals.fail += 1
  }
  return totals
}
