/**
 * The `/score` slash command: parse a whitespace/comma-separated target list
 * from the command input and start one `score-batch` background job over
 * `ctx.jobs`. The command itself never runs the scores — the job owns the
 * work, the progress stream, and the final leaderboard snapshot.
 *
 * @module dsh-score/command
 */

import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { BatchDeps } from './batch.ts'
import { startBatchJob } from './batch.ts'

/** Split raw command input into target specs (whitespace and commas separate). */
export function parseTargets(rawInput: string): string[] {
  return rawInput
    .split(/[\s,]+/u)
    .map(token => token.trim())
    .filter(token => token.length > 0)
}

/**
 * Execute `/score <targets...>`: validate the target list against the
 * configured batch cap and start the batch job for the invoking agent.
 *
 * @param deps - batch dependencies.
 * @param invocation - the command invocation.
 * @returns the command result naming the started job.
 */
export function handleScore(deps: BatchDeps, invocation: CommandInvocation): CommandResult {
  const targets = parseTargets(invocation.rawInput)
  if (targets.length === 0) {
    return { kind: 'error', text: 'Usage: /score <target> [<target> ...] — one or more plugin repos or npm packages' }
  }
  if (targets.length > deps.config.maxBatchTargets) {
    return { kind: 'error', text: `Too many targets: ${targets.length} exceeds the configured batch cap of ${deps.config.maxBatchTargets}` }
  }
  const jobId = startBatchJob(deps, targets, invocation.agent, `/score ${targets.join(' ')}`)
  return {
    kind: 'success',
    text: `Started background scoring job ${String(jobId)} for ${targets.length} target(s). Progress streams through the job output; the final line names the leaderboard id for score_report.`,
  }
}
