/**
 * The `score-batch` background-job producer over `ctx.jobs`. One job scores a
 * list of targets (serially or with bounded concurrency), streams per-target
 * progress lines through `readOutput`, and on settlement writes the leaderboard
 * record (JSON) into the storage domain plus the latest-leaderboard pointer, so
 * `score_report` can fetch the Markdown/JSON pair by id.
 *
 * @module dsh-score/batch
 */

import { randomBytes } from 'node:crypto'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Context } from '@deepseek-ai/cordis'
import type { JobHooks, JobId, JobKind, JobOutcome } from '@deepseek-ai/dsh-jobs'
import { RESULT_SCHEMA, totalsOf } from './result.ts'
import type { LeaderboardRecord, LeaderboardRow, ScoreResult } from './result.ts'
import { sanitizeTarget } from './sanitize.ts'
import { ScoreRunner } from './score.ts'
import type { ScoreDeps } from './score.ts'

/** The job kind this producer registers (declaration-merged into JobKindMap). */
export const SCORE_BATCH_KIND = 'score-batch' as const

declare module '@deepseek-ai/dsh-jobs' {
  interface JobKindMap {
    'score-batch': typeof SCORE_BATCH_KIND
  }
}

/** id prefix of a leaderboard record. */
export const LEADERBOARD_ID_PREFIX = 'lb_'

/** Fresh unique leaderboard id. */
export function freshLeaderboardId(): string {
  return `${LEADERBOARD_ID_PREFIX}${randomBytes(12).toString('hex')}`
}

/** Everything one batch job needs; assembled by `src/index.ts`. */
export interface BatchDeps extends ScoreDeps {
  ctx: Context
}

/** Settled leaderboard-write facts (tests assert the pointer landed). */
export interface BatchSettlement {
  leaderboardId: string
  leaderboard: LeaderboardRecord
}

/** Project one score card into a leaderboard row. */
export function rowOf(result: ScoreResult): LeaderboardRow {
  return {
    target: result.target.spec,
    kind: result.target.kind,
    total: result.total,
    grade: result.grade,
    verdict: result.verdict,
    durationMs: result.durationMs,
    install: result.dimensions.install.status,
    maintenance: result.dimensions.maintenance.status,
    documentation: result.dimensions.documentation.status,
    security: result.dimensions.security.status,
    compliance: result.dimensions.compliance.status,
  }
}

/** One progress line after a target settles. */
export function progressLine(index: number, total: number, result: ScoreResult): string {
  return `[${index}/${total}] ${result.target.spec} → ${result.grade} (${result.total}/100, ${result.verdict})`
}

/** The batch work function shared by the job producer and direct tests. */
export async function runBatch(
  deps: BatchDeps,
  targets: readonly string[],
  signal: AbortSignal,
  onProgress: (line: string) => void,
): Promise<BatchSettlement> {
  const leaderboardId = freshLeaderboardId()
  const started = Date.now()
  const runner = new ScoreRunner(deps)
  const rows: LeaderboardRow[] = []
  const queue = [...targets]

  async function worker(): Promise<void> {
    for (;;) {
      if (signal.aborted) return
      const target = queue.shift()
      if (target === undefined) return
      const result = await runner.score(target, { signal })
      rows.push(rowOf(result))
      onProgress(progressLine(rows.length, targets.length, result))
    }
  }

  const workers = Array.from({ length: deps.config.batchConcurrency }, () => worker())
  await Promise.all(workers)

  rows.sort((a, b) => b.total - a.total)
  const leaderboard: LeaderboardRecord = {
    schema: RESULT_SCHEMA,
    id: leaderboardId,
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    rows,
    totals: totalsOf(rows),
  }
  try {
    const domain = await deps.domain()
    await domain.table('leaderboards').put(leaderboardId, leaderboard)
    await domain.global.set({ leaderboardId, createdAt: leaderboard.createdAt })
  } catch (error) {
    deps.log(`score: failed to persist leaderboard ${leaderboardId}: ${String(error)}`)
  }
  return { leaderboardId, leaderboard }
}

/** One-line settlement summary for notices and the final flush. */
export function leaderboardSummary(leaderboard: LeaderboardRecord): string {
  const { totals } = leaderboard
  return `leaderboard ${leaderboard.id}: ${totals.pass} pass, ${totals.warn} warn, ${totals.fail} fail, ${totals.noEvidence} no-evidence (of ${totals.total})`
}

/**
 * Start one `score-batch` background job. The returned id doubles as the
 * handle the model uses to read output and, via the final flush line, to find
 * the leaderboard record for `score_report`.
 *
 * @param deps - batch dependencies.
 * @param targets - raw target specs.
 * @param owner - the owning agent (from the command invocation).
 * @param label - one-line model-facing label.
 * @returns the registry-issued job id.
 */
export function startBatchJob(deps: BatchDeps, targets: readonly string[], owner: Agent, label: string): JobId {
  const sanitized = targets.map(sanitizeTarget).filter(spec => spec.length > 0)
  const kind: JobKind = SCORE_BATCH_KIND
  return deps.ctx.jobs.start({
    kind,
    label,
    owner,
    run: (): JobHooks => {
      const abort = new AbortController()
      const progress: string[] = []
      const done = Promise.withResolvers<JobOutcome>()
      let settled = false
      const settle = (outcome: JobOutcome): JobOutcome => {
        if (settled) return outcome
        settled = true
        progress.push(`${outcome.status === 'completed' ? 'batch finished' : 'batch stopped'}: ${outcome.detail ?? ''}`)
        done.resolve(outcome)
        return outcome
      }
      void runBatch(deps, sanitized, abort.signal, line => { progress.push(line) })
        .then(({ leaderboardId, leaderboard }) => {
          progress.push(`leaderboard ${leaderboardId} — fetch with score_report("${leaderboardId}")`)
          progress.push(renderScoreCardForBatch(leaderboard))
          settle({ status: 'completed', detail: leaderboardSummary(leaderboard) })
        })
        .catch((error: unknown) => {
          deps.log(`score: batch job failed: ${String(error)}`)
          settle({ status: 'failed', detail: tailDetail(String(error)) })
        })
      return {
        cancel(reason?: string): void {
          abort.abort(reason ?? 'cancelled')
          progress.push(`cancelling (${reason ?? 'no reason given'})`)
          settle({ status: 'killed', detail: `cancelled: ${reason ?? 'no reason given'}` })
        },
        done: done.promise,
        readOutput: (): string => {
          if (progress.length === 0) return ''
          return `${progress.splice(0, progress.length).join('\n')}\n`
        },
      }
    },
  })
}

/** Compact leaderboard body for the final batch flush (Markdown). */
function renderScoreCardForBatch(leaderboard: LeaderboardRecord): string {
  const lines = [`# Leaderboard ${leaderboard.id}`, '', `Created ${leaderboard.createdAt}`, '', '| # | Target | Grade | Total |', '|---|---|---|---|']
  leaderboard.rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | \`${row.target}\` | ${row.grade} | ${row.total} |`)
  })
  return lines.join('\n')
}

/** Bound an error message for job detail lines. */
function tailDetail(text: string): string {
  const clean = text.replace(/\s+/gu, ' ').trim()
  return clean.length <= 200 ? clean : `${clean.slice(0, 197)}…`
}
