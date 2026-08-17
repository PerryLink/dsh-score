# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through the GitHub Security Advisory
interface: **Security → Report a vulnerability** on
[github.com/PerryLink/dsh-score](https://github.com/PerryLink/dsh-score/security/advisories/new).

**Sanitize before you paste.** Logs, transcripts, and reproductions must be
redacted first: remove tokens, API keys, passwords, authorization headers,
personal data, and full machine-local paths. Never include secrets in the
report body; describe them by kind and position instead.

## What to expect

- First response (acknowledgment): typically within 7 days.
- The reporter receives credit in the advisory and release notes unless they
  ask to stay anonymous.
- Fixes are released through the normal release flow with a
  `SECURITY:`-tagged changelog entry and a GitHub Security Advisory.

## Security model of this plugin

`dsh-score` never executes the target's code. It only reads public metadata
and public file contents through the `gh` and `npm` CLIs over `ctx.subprocess`.
Its own boundaries are:

- **No code execution.** The scoring pipeline runs `gh api` and `npm view`
  only; it never installs, builds, or runs a target. The most a malicious
  target can influence is the text of the files those commands return.
- **Argv-only subprocesses.** Every CLI invocation is passed as an argv array,
  never through a shell, so a hostile target spec cannot inject commands.
  Repo owner/repo segments are validated against a restricted character set
  before being used in a `gh api` endpoint.
- **Credential hygiene.** Child processes inherit the subprocess provider's
  credential-scrubbed environment; `gh` reads its own credential store. No
  environment value is ever logged, and every report string passes the pure
  sanitizers (token literals, URL credentials, bearer headers, control chars,
  byte-capped tails).
- **Evidence discipline.** A score is only as trustworthy as its evidence.
  Every dimension records its audit links (source + sanitized detail +
  timestamp); when no evidence is available the dimension reports
  `no-evidence` with score 0 and is excluded from the weighted total — the
  plugin never fabricates a number.

## Out of scope

Findings ABOUT a target (secret leaks, malicious scripts, missing license) are
the point of the security dimension, not a vulnerability of this package.
Report issues in this plugin's probe layer, parsing, sanitization, or scoring
logic.

## Acknowledgments & disclosure

Fixes follow coordinated disclosure: the advisory goes out with the release
that contains the fix. Security researchers who follow this policy are
thanked in the advisory and the changelog.
