/**
 * The probe driver against the scripted subprocess provider (sealed): success,
 * non-zero exit, malformed JSON, and empty output all resolve to honest
 * evidence (a value or none), and a stalled process is terminated at the probe
 * deadline. No real gh/npm/network is touched.
 * @module dsh-score/test/probe-driver.spec
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { ProbeDriver } from '../src/probe.ts'
import { FakeSubprocessRuntime, mountHarness } from './harness.ts'

function makeDriver(harness: Awaited<ReturnType<typeof mountHarness>>, config?: Parameters<typeof resolveConfig>[0]): ProbeDriver {
  return new ProbeDriver({ ctx: harness.ctx, config: resolveConfig(config), log: () => {} })
}

describe('ProbeDriver gh/npm behaviors', () => {
  it('parses a successful gh api response into a value', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [{ exitCode: 0, stdout: JSON.stringify({ pushed_at: 'x' }) }] })
    const outcome = await makeDriver(harness).ghJson('repos/o/r')
    expect(outcome.value).toEqual({ pushed_at: 'x' })
    expect(outcome.evidence).toHaveLength(1)
  })

  it('records no value on a non-zero gh exit', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [{ exitCode: 1, stderr: 'gh: not found' }] })
    const outcome = await makeDriver(harness).ghJson('repos/o/r')
    expect(outcome.value).toBeUndefined()
    expect(outcome.evidence).toHaveLength(1)
  })

  it('records no value on malformed gh JSON', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [{ exitCode: 0, stdout: 'not json' }] })
    const outcome = await makeDriver(harness).ghJson('repos/o/r')
    expect(outcome.value).toBeUndefined()
  })

  it('records no value on empty gh output', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [{ exitCode: 0, stdout: '' }] })
    const outcome = await makeDriver(harness).ghJson('repos/o/r')
    expect(outcome.value).toBeUndefined()
  })

  it('parses a successful npm view response and a failed npm view honestly', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [
      { exitCode: 0, stdout: JSON.stringify({ name: 'dsh-click', version: '0.2.0' }) },
      { exitCode: 1, stderr: 'npm ERR! 404' },
    ] })
    const driver = makeDriver(harness)
    const good = await driver.npmJson('dsh-click')
    expect(good.value).toMatchObject({ name: 'dsh-click' })
    const bad = await driver.npmJson('dsh-missing')
    expect(bad.value).toBeUndefined()
  })

  it('terminates a stalled process at the probe deadline and reports timedOut', async () => {
    const harness = await mountHarness({ plugin: false, scripts: [{ hang: true }] })
    const driver = makeDriver(harness, { probeTimeoutMs: 1_000 })
    const run = await driver.run('gh', ['api', 'repos/o/r'])
    expect(run.timedOut).toBe(true)
    expect((harness.subprocess as FakeSubprocessRuntime).terminated).toContain(7777)
  }, 10_000)
})
