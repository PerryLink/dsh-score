/**
 * Pure sanitizers for every string that reaches a report, a log, or the model.
 * Nothing here reads the environment or the clock: report content is the only
 * caller, and the sanitizers must stay testable with extreme inputs (token
 * literals, credential-bearing URLs, hostile repo specs, machine-local paths).
 *
 * The same secret patterns drive two jobs — redaction for display and
 * detection for the security dimension — so the compiled regexes are exported.
 *
 * @module dsh-score/sanitize
 */

/** GitHub personal access tokens (`ghp_` prefix, ≥20 body chars). */
export const GITHUB_TOKEN = /ghp_[A-Za-z0-9]{20,}/gu

/** npm access tokens (`npm_` prefix, ≥20 body chars). */
export const NPM_TOKEN = /npm_[A-Za-z0-9]{20,}/gu

/** OpenAI-style keys (`sk-` prefix, ≥16 body chars) and common jwt/aws/twilio shapes. */
export const API_KEY = /(?:sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})/gu

/** `scheme://user:pass@host` — keeps the scheme and host, drops the credentials. */
export const URL_CREDENTIALS = /(\b[a-z][a-z0-9+.-]*:\/\/)[^/@\s:]+(?::[^/@\s]*)?@/giu

/** `Authorization: Bearer <token>`-style header lines. */
export const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu

/** Control characters that must never survive into a one-line report field. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/gu

/** Maximum length of a sanitized target spec recorded in a report. */
export const MAX_TARGET_SPEC_LENGTH = 1_000

/** Marker substituted for every redacted secret. */
export const REDACTED = '***REDACTED***'

/** Secret pattern name → the compiled matcher, in a stable display order. */
export const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: 'github-token', pattern: GITHUB_TOKEN },
  { name: 'npm-token', pattern: NPM_TOKEN },
  { name: 'api-key', pattern: API_KEY },
  { name: 'url-credentials', pattern: URL_CREDENTIALS },
  { name: 'bearer-header', pattern: BEARER },
]

/**
 * Replace credential-shaped substrings with {@link REDACTED}.
 *
 * @param text - any output or user-supplied string.
 * @returns the same text with secrets redacted.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(GITHUB_TOKEN, REDACTED)
    .replace(NPM_TOKEN, REDACTED)
    .replace(API_KEY, REDACTED)
    .replace(URL_CREDENTIALS, '$1***@')
    .replace(BEARER, `$1${REDACTED}`)
}

/**
 * Detect which secret pattern names occur in a text block, de-duplicated in
 * a stable order. Detection (unlike redaction) reports the full pattern name.
 *
 * @param text - any scanned content.
 * @returns the matched pattern names, in stable order.
 */
export function scanSecretPatterns(text: string): string[] {
  const found: string[] = []
  for (const { name, pattern } of SECRET_PATTERNS) {
    // Each matcher is a global regex with shared lastIndex; reset before reuse.
    pattern.lastIndex = 0
    if (pattern.test(text)) found.push(name)
  }
  return found
}

/**
 * Sanitize one user-supplied target spec for recording and display: strip
 * control characters, redact embedded credentials, cap the length, and keep
 * surrounding whitespace off the recorded value.
 *
 * @param spec - the raw target as the user supplied it.
 * @returns the sanitized spec; never throws.
 */
export function sanitizeTarget(spec: string): string {
  return redactSecrets(spec.replace(CONTROL_CHARS, ' ').trim()).slice(0, MAX_TARGET_SPEC_LENGTH)
}

/**
 * Bound a multi-line output stream to a short tail for one-line summaries.
 * The tail keeps the END of the text (errors and final results cluster there).
 *
 * @param text - collected output.
 * @param maxChars - retained character count.
 * @returns the tail, prefixed with a truncation marker when shortened.
 */
export function tailText(text: string, maxChars: number): string {
  const clean = text.replace(/\s+$/u, '')
  if (clean.length <= maxChars) return clean
  return `…<truncated, showing last ${maxChars} chars>…${clean.slice(-maxChars)}`
}
