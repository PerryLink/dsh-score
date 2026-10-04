// scripts/loader-runner.mjs — real Loader composition runner (community
// five-layer model, layer 4). An independent process boots a real Context,
// mounts the vendored Loader with the Include builtin, reads the given
// cordis.yml (the real `dsh-tools` service row + the built plugin row), then
// asserts the plugin's `score`/`score_report` tools and the `/score` command
// registered — proving inject resolution and that `storageDomain` (deliberately
// optional) can be absent while the plugin still boots.
//
// Usage: node scripts/loader-runner.mjs <cordis.yml>
// Exit 0 prints DSH_LOADER_RESULT <json>; any assertion or load failure exits
// non-zero with the reason on stderr (used by the invalid-config and
// default-export regression cases).

import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const configArgument = process.argv[2]
if (configArgument === undefined) {
  console.error('usage: loader-runner.mjs <cordis.yml>')
  process.exit(2)
}

const configPath = resolve(configArgument)
// Resolve bare package rows from this repository's dependency tree so the
// composition works with config files written anywhere (e.g. a temp dir).
const configRequire = createRequire(resolve(import.meta.dirname, '../package.json'))

const ctx = new Context()
try {
  // The plugin injects tools/commands/subprocess/jobs. `tools` comes from the
  // real `dsh-tools` row; `commands`/`subprocess`/`jobs` are stubbed (the plugin
  // only registers a command and warms CLI locations at apply time), and the
  // `systemPrompt` stub is ToolRuntime's peer. `storageDomain` is deliberately
  // NOT provided — the plugin must still boot (score persistence degrades).
  const registeredCommands = []
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined })
  ctx.provide('commands', {
    register(definition) {
      registeredCommands.push(definition)
      return () => { const index = registeredCommands.indexOf(definition); if (index >= 0) registeredCommands.splice(index, 1) }
    },
    list() { return registeredCommands.map(definition => ({ name: definition.name })) },
  })
  ctx.provide('subprocess', {
    resolveExecutable: async program => `C:\\Fake\\${program}.exe`,
    spawn: () => { throw new Error('dsh-score loader-runner: spawn is not used at apply time') },
  })
  ctx.provide('jobs', {})

  ctx.baseUrl = `${pathToFileURL(dirname(configPath)).href}/`
  await ctx.plugin(Loader)
  ctx.loader.internal = /** @type {any} */ ({
    version: 'v2',
    async import(specifier) {
      if (specifier.startsWith('file:')) return import(specifier)
      if (specifier.startsWith('node:')) return import(specifier)
      const absolute = /^([a-zA-Z]:)?[\\/]/u.test(specifier)
      return import(pathToFileURL(absolute ? specifier : configRequire.resolve(specifier)).href)
    },
  })
  ctx.loader.builtins.include = Include
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()
  await rethrowFirstFailedRow()

  // Authoritative registries carry the plugin's contributions.
  const toolNames = ctx.tools.schemas().map(schema => schema.name)
  for (const name of ['score', 'score_report']) {
    if (!toolNames.includes(name)) {
      throw new Error(`Loader composition: ${name} tool is missing from the tools registry`)
    }
  }
  if (!registeredCommands.some(definition => definition.name === 'score')) {
    throw new Error('Loader composition: /score command is missing from the commands registry')
  }

  process.stdout.write(`DSH_LOADER_RESULT ${JSON.stringify({ tools: toolNames.sort(), command: 'score', storageDomainOptional: true })}\n`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await ctx.fiber.dispose()
}

/**
 * Re-throw the first FAILED loader row's own reason.
 *
 * `cordis-plugin-loader` 1.0.6 dropped the failure surface `await()` had in 1.0.4: the old body
 * collected every `entry._await()` outcome and threw the single failure (or an AggregateError),
 * while the new body only drains `_initTask || fiber.inertia` and so resolves even when a row's
 * `apply` threw. Without this the negative composition regressions report the runner's own
 * downstream symptom instead of the reason they assert. `fiber.await()` still rethrows the
 * stored error, so the reason comes back without touching the logger.
 *
 * `DSH_LOADER_RUNNER_NO_RETHROW=1` disables it for re-measurement only.
 */
async function rethrowFirstFailedRow() {
  if (process.env.DSH_LOADER_RUNNER_NO_RETHROW === '1') return
  const failures = []
  for (const entry of ctx.loader.entries()) {
    // FiberState.FAILED === 3 (const enum, erased at runtime).
    if (entry?.fiber?.state !== 3) continue
    try {
      await entry.fiber.await()
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)))
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1) throw new AggregateError(failures, 'loader fibers failed')
}
