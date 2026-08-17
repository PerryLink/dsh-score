/**
 * The `score` storage domain: the durable home of score cards and leaderboard
 * records. Opened through `ctx.storageDomain` (a public service), with record
 * schemas validated at the durable boundary; the domain stays open for the
 * plugin's lifetime and closes through the registered effect.
 *
 * @module dsh-score/domain
 */

import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { LeaderboardRecordSchema, ScoreResultSchema } from './result.ts'

/** Domain name (also the backend unit name; UNIT_NAME_RE forbids hyphens). */
export const DOMAIN_NAME = 'score'

/** Domain format version; bump when a record format changes incompatibly. */
export const DOMAIN_VERSION = 1

/** Latest-leaderboard pointer value; `''` id means "no leaderboard yet". */
export const LatestLeaderboardSchema = z.object({
  leaderboardId: z.string(),
  createdAt: z.string(),
})

/** Storage-domain spec: one table of score cards, one of leaderboards, plus the latest pointer. */
export const scoreDomainSpec = defineDomain({
  name: DOMAIN_NAME,
  version: DOMAIN_VERSION,
  global: { schema: LatestLeaderboardSchema, initial: { leaderboardId: '', createdAt: '' } },
  tables: {
    scores: domainTable(ScoreResultSchema),
    leaderboards: domainTable(LeaderboardRecordSchema),
  },
})
