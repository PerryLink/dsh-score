/**
 * Sanitizer contract: secrets redacted, control characters stripped, tails
 * bounded, and secret DETECTION (for the security dimension) reporting the
 * pattern names — extreme inputs included.
 * @module dsh-score/test/sanitize.spec
 */

import { describe, expect, it } from 'vitest'
import { REDACTED, redactSecrets, sanitizeTarget, scanSecretPatterns, tailText } from '../src/sanitize.ts'

describe('redactSecrets', () => {
  it('redacts GitHub and npm tokens', () => {
    // Fake tokens are built programmatically: real tokens never belong in
    // commits, and literal pattern-shaped strings trip GitHub push protection.
    const fakeGhp = 'ghp_' + '0'.repeat(36)
    const fakeNpm = 'npm_' + '0'.repeat(36)
    expect(redactSecrets(`push with ${fakeGhp} ok`)).toContain(REDACTED)
    expect(redactSecrets(`token ${fakeNpm} end`)).toContain(REDACTED)
    expect(redactSecrets('ghp_short')).toBe('ghp_short')
  })

  it('redacts API keys and bearer headers', () => {
    expect(redactSecrets('key sk-abcdefghijklmnop')).toContain(REDACTED)
    expect(redactSecrets('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc')).toContain(REDACTED)
  })

  it('redacts credentials embedded in URLs but keeps scheme and host', () => {
    const out = redactSecrets('fetch https://user:hunter2@github.com/owner/repo.git now')
    expect(out).not.toContain('hunter2')
    expect(out).toContain('https://')
    expect(out).toContain('github.com')
  })
})

describe('scanSecretPatterns', () => {
  it('reports the matching pattern names', () => {
    const fakeGhp = 'ghp_' + '0'.repeat(36)
    expect(scanSecretPatterns(`leak ${fakeGhp}`)).toContain('github-token')
    expect(scanSecretPatterns('plain text')).toEqual([])
  })
})

describe('sanitizeTarget', () => {
  it('strips control characters and redacts credentials', () => {
    expect(sanitizeTarget('dsh-foo\u0000\n\r')).toBe('dsh-foo')
    expect(sanitizeTarget('https://u:p@example.com/x.git')).not.toContain('u:p@')
  })

  it('caps the length', () => {
    expect(sanitizeTarget('x'.repeat(5_000)).length).toBeLessThanOrEqual(1_000)
  })
})

describe('tailText', () => {
  it('keeps short text verbatim and the END of long text', () => {
    expect(tailText('short', 100)).toBe('short')
    expect(tailText('x'.repeat(500) + 'END', 5)).toBe('…<truncated, showing last 5 chars>…xxEND')
  })
})
