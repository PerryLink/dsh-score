/**
 * Shared test harness: REAL Cordis `Context`, REAL `SessionStore`/`Session`,
 * REAL `ToolRuntime`, REAL `LocalJobRegistry`, REAL `Storage` hub + `DomainFacility`
 * from the 0.1.1-rc.2 peers — plus a scriptable subprocess provider (a subclass
 * of the REAL `SubprocessRuntime`), a memory storage backend, a structural
 * commands registry, and a structurally complete fake agent. The `gh`/`npm`
 * process work is scripted data; the plugin contract, tool pipeline, job
 * lifecycle, and durable domain all run for real.
 *
 * @module dsh-score/test/harness
 */

import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentRegistry, { Inbox } from '@deepseek-ai/dsh-agent'
import LocalJobRegistry from '@deepseek-ai/dsh-jobs-local'
import SessionStore, { SessionId, type Session } from '@deepseek-ai/dsh-session'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import {
  SubprocessRuntime,
  type SubprocessCollectedOutputs,
  type SubprocessHandle,
  type SubprocessOutcome,
  type SubprocessOutputReader,
  type SubprocessSpawnSpec,
} from '@deepseek-ai/dsh-subprocess'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { CommandDefinition, CommandDescriptor } from '@deepseek-ai/dsh-commands'
import { MemoryStorageBackend } from './helpers/memory-backend.ts'

/** One scripted process outcome, popped per spawn in order. */
export interface ScriptedSpawn {
  stdout?: string
  stderr?: string
  exitCode?: number
  /** Never settle `done` — the caller's timeout/terminate path owns the outcome. */
  hang?: boolean
}

/** A subprocess provider whose spawns answer from scripted stdout/exit facts. */
export class FakeSubprocessRuntime extends SubprocessRuntime {
  scripts: ScriptedSpawn[] = []
  spawns: SubprocessSpawnSpec[] = []
  terminated: number[] = []

  constructor(ctx: Context, scripts: ScriptedSpawn[] = []) {
    super(ctx)
    this.scripts = [...scripts]
  }

  resolveExecutable(command: string): Promise<string> {
    return Promise.resolve(`C:\\Fake\\${command}.exe`)
  }

  spawn(spec: SubprocessSpawnSpec): SubprocessHandle {
    this.spawns.push(spec)
    const script = this.scripts.shift() ?? {}
    if (spec.signal?.aborted) {
      throw new Error(`aborted before spawn: ${String(spec.signal.reason ?? 'aborted')}`)
    }
    const stdout = script.stdout ?? ''
    const stderr = script.stderr ?? ''
    const exitCode = script.exitCode ?? 0
    const readerOf = (text: string): SubprocessOutputReader => ({
      readFrom: fromByte => ({ text: text.slice(fromByte), nextOffset: text.length, lossy: false }),
    })
    const collected: SubprocessCollectedOutputs = {
      stdout: readerOf(stdout),
      stderr: readerOf(stderr),
    }
    const outcome: SubprocessOutcome = { exitCode, signal: null }
    let settleDone: (outcome: SubprocessOutcome) => void = () => {}
    const done = script.hang === true
      ? new Promise<SubprocessOutcome>(resolve => { settleDone = resolve })
      : Promise.resolve(outcome)
    const onAbort = (): void => { terminate() }
    spec.signal?.addEventListener('abort', onAbort, { once: true })
    const terminate = (): void => {
      this.terminated.push(7777)
      settleDone({ exitCode: null, signal: 'SIGTERM' })
    }
    return {
      pid: 7777,
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      collected,
      done,
      terminate,
      waitForExit: async () => true,
    }
  }

  spawnTerminal(): never {
    throw new Error('not used by tests')
  }
}

/** Structural commands registry: records registrations and dispatches handlers. */
export class FakeCommandsRuntime {
  readonly definitions = new Map<string, CommandDefinition>()
  readonly registered: string[] = []

  register(definition: CommandDefinition): () => void {
    this.definitions.set(definition.name, definition)
    this.registered.push(definition.name)
    return () => { this.definitions.delete(definition.name) }
  }

  list(): CommandDescriptor[] {
    return [...this.definitions.values()].map(def => ({
      name: def.name,
      description: def.description,
      ...def.input === undefined ? {} : { input: def.input },
    }))
  }
}

/** Build a structurally complete fake agent over a real session. */
export function makeAgent(session: Session, scopeCtx: Context): Agent {
  const fake = {
    id: session.id,
    options: { provider: 'deepseek', model: 'demo-model' },
    session,
    inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle' as const,
    ctx: scopeCtx,
    send: () => undefined,
    followup: () => undefined,
    steer: () => ({ outcome: Promise.resolve({ status: 'rejected' as const }) }),
    inject: () => undefined,
    cancel: () => undefined,
    runMaintenance: async <T>(task: (signal: AbortSignal) => Promise<T>) => task(new AbortController().signal),
    whenIdle: async () => undefined,
  }
  return fake as unknown as Agent
}

/** Harness assembly options. */
export interface HarnessOptions {
  /** Raw plugin config. */
  config?: Record<string, unknown>
  /** Scripted subprocess outcomes. */
  scripts?: ScriptedSpawn[]
  /** Mount the real jobs registry (default true). */
  jobs?: boolean
  /** Mount the storage/domain stack (default true). */
  storage?: boolean
  /** Mount the structural commands registry (default true). */
  commands?: boolean
  /** Mount the plugin under test (default true). */
  plugin?: boolean
  /** Use the REAL local subprocess provider instead of the scripted fake (default false). */
  localSubprocess?: boolean
}

/** Everything a mounted harness hands back to a test. */
export interface Harness {
  readonly ctx: Context
  readonly session: Session
  readonly agent: Agent
  readonly subprocess: SubprocessRuntime
  readonly commands: FakeCommandsRuntime
  readonly backend: MemoryStorageBackend
}

/**
 * Mount real session/tools/jobs/storage services, scripted subprocess and
 * commands providers, and this plugin.
 *
 * @param options - assembly options.
 * @returns the mounted harness.
 */
export async function mountHarness(options: HarnessOptions = {}): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(SessionId('dsh-score-harness'))
  session.append('turn/start', { turn: 1 })
  ctx.provide('systemPrompt', { tools: () => () => undefined, section: () => () => undefined } as never)
  await ctx.plugin(ToolRuntime)

  if (options.jobs !== false) {
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(LocalJobRegistry)
    ctx.jobs.attachController('test-harness')
  }

  const backend = new MemoryStorageBackend()
  if (options.storage !== false) {
    await ctx.plugin(Storage)
    ctx.storage.backend.register('memory', backend)
    const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
    ctx.storage.mount('domain', facility)
    ctx.provide('storageDomain', facility)
  }

  const subprocess = options.localSubprocess === true ? new LocalSubprocessRuntime(ctx) : new FakeSubprocessRuntime(ctx, options.scripts ?? [])
  const commands = new FakeCommandsRuntime()
  if (options.commands !== false) ctx.provide('commands', commands)

  if (options.plugin !== false) {
    const plugin = await import('../src/index.ts')
    await ctx.plugin(plugin as unknown as import('@deepseek-ai/cordis').Plugin, options.config ?? {})
  }

  const agentCtx = ctx.plugin(() => {}).ctx
  const agent = makeAgent(session, agentCtx)
  if (options.jobs !== false) ctx.agents.register(agent)
  return { ctx, session, agent, subprocess, commands, backend }
}
