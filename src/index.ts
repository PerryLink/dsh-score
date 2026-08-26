/**
 * `dsh-score` — multi-dimensional quality scoring for DeepSeek Harness plugins.
 *
 * Host-only function plugin — no default export (the Loader unwraps
 * `exports.default ?? exports`). It scores one target at a time across five
 * dimensions (install success via reserved dsh-test-drive evidence, maintenance
 * activity, documentation completeness, security scan, and protocol compliance),
 * all from real `gh`/`npm` CLI evidence with audit links and timestamps. Score
 * cards land as structured records (JSON) in the `score` storage domain, render
 * as Markdown, and feed ranking pipelines; batches run as `score-batch`
 * background jobs over `ctx.jobs`.
 *
 * @module dsh-score
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation } from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-tools'
import type { Domain } from '@deepseek-ai/dsh-storage-domain'
import type { BatchDeps } from './batch.ts'
import { handleScore } from './command.ts'
import { Config, resolveConfig } from './config.ts'
import { scoreDomainSpec } from './domain.ts'
import { ProbeDriver } from './probe.ts'
import { ScoreRunner } from './score.ts'
import { allTools } from './tools.ts'
import type { ToolServices } from './tools.ts'

export const name = 'dsh-score'

/**
 * Public services only. `storageDomain` is deliberately OPTIONAL: the shipped
 * `dsh-base` bundle (headless profile) does not mount it, and the plugin must
 * still boot there — score persistence degrades to disabled with a logged
 * reason, tools keep working. Install evidence reads the already-open
 * `test_drive` domain via the same optional service, never a hard dependency.
 */
export const inject = ['tools', 'commands', 'subprocess', 'jobs']

export { VERSION } from './version.ts'
export { Config, resolveConfig } from './config.ts'
export { RESULT_SCHEMA, DIMENSIONS, computeTotal, hasEvidence, gradeOf, verdictOf, totalsOf, ScoreResultSchema, LeaderboardRecordSchema } from './result.ts'
export type { Dimension, DimensionStatus, TargetKind, EvidenceLink, DimensionScore, ScoreResult, LeaderboardRow, LeaderboardRecord } from './result.ts'
export { BADGE_SCHEMA, DIMENSION_BADGE_LABELS, gradeColor, statusColor, renderShieldsSvg, shieldsEndpointUrl, badgeJson, renderScoreBadge, renderDimensionBadges, renderBadgeMarkdown } from './badge.ts'
export type { BadgeDimension, BadgeSurface, BadgeJson } from './badge.ts'
export { sanitizeTarget, redactSecrets, scanSecretPatterns, tailText, REDACTED, SECRET_PATTERNS } from './sanitize.ts'
export { classifyTarget, parseRepoRef, extractRepoFromNpmUrl, parseRepoMeta, parseLatestCommit, parseFileList, parseGithubContent, parseOldestOpenIssue, parseNpmView, parseNpmShim, ProbeDriver } from './probe.ts'
export type { RepoRef, RepoFacts, NpmFacts, TargetEvidence, ProbeOutcome, ChildRunResult } from './probe.ts'
export { evaluateAll, evaluateInstall, evaluateMaintenance, evaluateDocumentation, evaluateSecurity, evaluateCompliance, scanMaliciousScripts, licenseCompliance, daysSince, LICENSE_ALLOWLIST, MALICIOUS_SCRIPT_MARKERS } from './dimensions.ts'
export type { InstallEvidence, EvalInputs } from './dimensions.ts'
export { ScoreRunner, scoreKey, readTestDriveEvidence, SCORE_KEY_PREFIX } from './score.ts'
export type { ScoreDeps } from './score.ts'
export { renderScoreCard, renderLeaderboard, statusMark, formatDuration } from './report.ts'
export { SCORE_BATCH_KIND, startBatchJob, runBatch, leaderboardSummary, rowOf, progressLine, freshLeaderboardId, LEADERBOARD_ID_PREFIX } from './batch.ts'
export { parseTargets } from './command.ts'
export { scoreDomainSpec, DOMAIN_NAME, DOMAIN_VERSION } from './domain.ts'

/**
 * Mount the plugin: resolve config, open the score domain (lazily), register
 * the tools and the `/score` command as effects, and own the domain handle
 * through an effect disposer (teardown closes it).
 *
 * @param ctx - context carrying tools/commands/subprocess/jobs/storageDomain.
 * @param config - raw loader config; defaults applied through {@link resolveConfig}.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  const log = (line: string): void => { ctx.logger('score').info(line) }

  // Single-flight domain open; failures surface at first use (the earliest
  // resolvable point for an async open) and are logged once.
  const storageDomain = ctx.get('storageDomain')
  const domainPromise: Promise<Domain<typeof scoreDomainSpec>> = storageDomain === undefined
    ? Promise.reject(new Error('dsh-score: storageDomain service not mounted in this composition; score persistence disabled'))
    : (async () => storageDomain.open(scoreDomainSpec))()
  domainPromise.catch((error: unknown) => { log(`score domain unavailable: ${String(error)}`) })
  const domain = (): typeof domainPromise => domainPromise
  ctx.effect(() => () => {
    void domainPromise.then(handle => handle.close()).catch(() => { /* open failure has nothing to close */ })
  }, 'dsh-score score domain close')

  const driver = new ProbeDriver({ ctx, config: resolved, log })
  const deps: BatchDeps = { ctx, config: resolved, driver, log, domain }
  const runner = new ScoreRunner(deps)
  const services: ToolServices = { ...deps, runner }

  for (const tool of allTools(services)) {
    ctx.effect(() => ctx.tools.register(tool), `dsh-score: ${tool.name} tool`)
  }

  ctx.effect(() => ctx.commands.register({
    name: 'score',
    description: 'Batch score plugin targets (background job + leaderboard snapshot)',
    input: { hint: 'repo or npm targets, space-separated' },
    handler: (invocation: CommandInvocation) => handleScore(services, invocation),
  }), 'dsh-score: /score command')

  // Warm the CLI locations once at load: a missing gh/npm then fails the first
  // score immediately instead of mid-pipeline.
  void driver.locate('gh').catch((error: unknown) => { log(`gh CLI unavailable: ${String(error)}`) })
  void driver.locate('npm').catch((error: unknown) => { log(`npm CLI unavailable: ${String(error)}`) })
}
