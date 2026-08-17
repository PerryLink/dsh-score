/**
 * Pure Markdown renderers for score cards and leaderboards. These are the
 * human-readable half of the report pair (JSON is the canonical record in the
 * storage domain); the renderers are pure functions of their inputs so they
 * stay replay-safe and trivially testable.
 *
 * @module dsh-score/report
 */

import type { DimensionStatus, LeaderboardRecord, ScoreResult } from './result.ts'

/** Emoji/symbol mark for a dimension status. */
export function statusMark(status: DimensionStatus): string {
  switch (status) {
    case 'pass': return '✅'
    case 'warn': return '🟠'
    case 'fail': return '❌'
    default: return '⬜'
  }
}

/** Human-duration rendering for one number of milliseconds. */
export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms} ms`
  return `${(ms / 1_000).toFixed(1)} s`
}

/** Dimension display order for the risk card. */
const DIMENSION_LABELS: ReadonlyArray<{ key: keyof ScoreResult['dimensions']; label: string }> = [
  { key: 'install', label: 'Install success' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'security', label: 'Security' },
  { key: 'compliance', label: 'Protocol compliance' },
]

/** Render one score card as a Markdown risk card. */
export function renderScoreCard(result: ScoreResult): string {
  const lines = [
    `# Score ${result.scoreId}`,
    '',
    `- Target: \`${result.target.spec}\` (${result.target.kind})`,
    `- Grade: **${result.grade}** — total ${result.total}/100`,
    `- Verdict: ${result.verdict}`,
    `- Scored: ${result.scoredAt} (${formatDuration(result.durationMs)})`,
    '',
    '| Dimension | Status | Score | Weight | Summary |',
    '|---|---|---|---|---|',
  ]
  for (const { key, label } of DIMENSION_LABELS) {
    const dimension = result.dimensions[key]
    lines.push(`| ${label} | ${statusMark(dimension.status)} ${dimension.status} | ${dimension.score} | ${dimension.weight} | ${dimension.summary} |`)
  }
  lines.push('', '## Evidence', '')
  for (const { key, label } of DIMENSION_LABELS) {
    const dimension = result.dimensions[key]
    for (const link of dimension.evidence) {
      lines.push(`- \`${label}\` [${link.source} @ ${link.observedAt}]: ${link.detail}`)
    }
  }
  return lines.join('\n')
}

/** Render one leaderboard as a Markdown report. */
export function renderLeaderboard(record: LeaderboardRecord): string {
  const lines = [
    `# Score leaderboard ${record.id}`,
    '',
    `- Created: ${record.createdAt}`,
    `- Duration: ${formatDuration(record.durationMs)}`,
    `- Totals: ${record.totals.pass} pass, ${record.totals.warn} warn, ${record.totals.fail} fail, ${record.totals.noEvidence} no-evidence (of ${record.totals.total})`,
    '',
    '| # | Target | Grade | Total | Install | Maint. | Docs | Security | Compliance |',
    '|---|---|---|---|---|---|---|---|---|',
  ]
  record.rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | \`${row.target}\` | ${row.grade} | ${row.total} | ${statusMark(row.install)} | ${statusMark(row.maintenance)} | ${statusMark(row.documentation)} | ${statusMark(row.security)} | ${statusMark(row.compliance)} |`)
  })
  const weak = record.rows.filter(row => row.total < 60)
  if (weak.length > 0) {
    lines.push('', '## Attention', '')
    for (const row of weak) {
      lines.push(`- ${row.grade} \`${row.target}\`: ${row.verdict}`)
    }
  }
  return lines.join('\n')
}
