/**
 * Pure parsing helpers of the probe layer: target classification, repo-ref
 * extraction, and gh/npm JSON parsing — each with the tolerant (absent →
 * undefined) behavior the dimension evaluators rely on.
 * @module dsh-score/test/probe.spec
 */

import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  classifyTarget,
  extractRepoFromNpmUrl,
  parseFileList,
  parseGithubContent,
  parseLatestCommit,
  parseNpmShim,
  parseNpmView,
  parseOldestOpenIssue,
  parseRepoMeta,
  parseRepoRef,
} from '../src/probe.ts'

describe('classifyTarget', () => {
  it('classifies github/git specs as repo and bare names as npm', () => {
    expect(classifyTarget('github:owner/repo#main')).toBe('repo')
    expect(classifyTarget('git+https://github.com/o/r.git')).toBe('repo')
    expect(classifyTarget('owner/repo')).toBe('repo')
    expect(classifyTarget('dsh-click')).toBe('npm')
    expect(classifyTarget('@scope/dsh-click')).toBe('npm')
  })
})

describe('parseRepoRef', () => {
  it('extracts owner/repo from every supported form', () => {
    expect(parseRepoRef('github:owner/repo#main')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepoRef('owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepoRef('https://github.com/owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepoRef('git@github.com:owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('rejects unsafe or non-github specs', () => {
    expect(parseRepoRef('../../etc/passwd')).toBeUndefined()
    expect(parseRepoRef('dsh-click')).toBeUndefined()
    expect(parseRepoRef('https://evil.com/owner/repo')).toBeUndefined()
  })
})

describe('extractRepoFromNpmUrl', () => {
  it('extracts a github repository URL and drops the .git suffix', () => {
    expect(extractRepoFromNpmUrl('git+https://github.com/owner/repo.git')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(extractRepoFromNpmUrl('git+https://gitlab.com/owner/repo.git')).toBeUndefined()
  })
})

describe('parseRepoMeta', () => {
  it('extracts pushed_at, issues, license, branch, archived, and topics', () => {
    const facts = parseRepoMeta({
      pushed_at: '2026-08-15T00:00:00Z',
      open_issues_count: 3,
      default_branch: 'main',
      archived: false,
      license: { spdx_id: 'Apache-2.0' },
      topics: ['dsh-plugin', 'deepseek-harness'],
    })
    expect(facts.pushedAt).toBe('2026-08-15T00:00:00Z')
    expect(facts.openIssues).toBe(3)
    expect(facts.licenseSpdx).toBe('Apache-2.0')
    expect(facts.defaultBranch).toBe('main')
    expect(facts.archived).toBe(false)
    expect(facts.topics).toEqual(['dsh-plugin', 'deepseek-harness'])
  })

  it('records MISSING for an absent license', () => {
    expect(parseRepoMeta({ license: null }).licenseSpdx).toBe('MISSING')
  })
})

describe('parseLatestCommit / parseFileList / parseOldestOpenIssue', () => {
  it('parses the newest commit date', () => {
    expect(parseLatestCommit([{ commit: { committer: { date: '2026-08-15T00:00:00Z' } } }])).toBe('2026-08-15T00:00:00Z')
    expect(parseLatestCommit([])).toBeUndefined()
  })

  it('parses the root file-name list', () => {
    expect(parseFileList([{ name: 'README.md' }, { name: 'CHANGELOG.md' }, 'junk'])).toEqual(['README.md', 'CHANGELOG.md'])
  })

  it('parses the oldest open issue date', () => {
    expect(parseOldestOpenIssue([{ created_at: '2025-01-01T00:00:00Z' }])).toBe('2025-01-01T00:00:00Z')
    expect(parseOldestOpenIssue([])).toBeUndefined()
  })
})

describe('parseGithubContent', () => {
  it('decodes base64 content', () => {
    const encoded = Buffer.from('{"name":"x"}', 'utf8').toString('base64')
    expect(parseGithubContent({ content: encoded })).toBe('{"name":"x"}')
    expect(parseGithubContent({ content: '!!!not-base64!!!' })).toBeUndefined()
  })
})

describe('parseNpmView', () => {
  it('extracts name, version, license, repository, keywords, and modified time', () => {
    const facts = parseNpmView({
      name: 'dsh-click',
      version: '0.2.0',
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/o/r.git' },
      keywords: ['dsh-plugin'],
      time: { modified: '2026-08-01T00:00:00Z' },
    })
    expect(facts.name).toBe('dsh-click')
    expect(facts.version).toBe('0.2.0')
    expect(facts.license).toBe('MIT')
    expect(facts.repositoryUrl).toBe('git+https://github.com/o/r.git')
    expect(facts.keywords).toEqual(['dsh-plugin'])
    expect(facts.modifiedAt).toBe('2026-08-01T00:00:00Z')
  })

  it('handles an object license', () => {
    expect(parseNpmView({ license: { type: 'MIT' } }).license).toBe('MIT')
  })
})

describe('parseNpmShim', () => {
  it('extracts the dp0-relative JS target', () => {
    const shim = 'IF EXIST "%dp0%\\node.exe" ...\n"%dp0%\\node_modules\\npm\\bin\\npm-cli.js" %*'
    expect(parseNpmShim('C:\\npm\\npm.cmd', shim)).toContain('npm-cli.js')
  })

  it('throws when no dp0 JS target is present', () => {
    expect(() => parseNpmShim('x.cmd', 'echo hi')).toThrow(/cannot parse npm shim/)
  })
})
