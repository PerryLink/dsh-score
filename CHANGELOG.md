# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.11] - 2026-09-12

### Fixed

- The documentation dimension counted the four translations through lowercase dotted literals (`readme.zh.md`, …) compared against the lowercased file list. The family-wide rename to `README-<lang>.md` is case-sensitive text substitution, so it rewrote the test fixture and the docs while leaving this line alone: every migrated repository silently lost the 40 language points and fell from `pass` to `warn`. The dimension now checks `readme-<lang>.md`, which is what `tests/dimensions.spec.ts` asserts.

### Changed

- Rename the four translated READMEs to `README-<lang>.md`. npm selects the package-page readme as the first markdown file matching its `{README,README.*}` glob (`@npmcli/package-json`, publish path), and that glob order puts `README.<lang>.md` ahead of `README.md` — so npm was serving the Simplified-Chinese file for this package too (measured on 15/15 sampled packages of the family). The new names sit outside the glob, so the English source is served again. No content changed apart from the language-switcher link each translation holds to its siblings, and the repo readme gate still passes. Takes effect with the next release; an already-published version cannot gain a corrected readme retroactively.
- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.2` line and record `0.1.5-rc.2` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.2`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

## [0.2.10] - 2026-09-10

### Changed

- Pin the `@deepseek-ai/dsh-*` dev/test dependencies to the published `0.1.5-rc.1` line and record `0.1.5-rc.1` in `dshWorkshop.compatibility.dshVersions`; the monthly Compat workflow now runs against `0.1.5-rc.1`. The peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` is unchanged, so no supported host line is dropped.

### Docs

- Refresh the five-language README compatibility baseline to `dsh-v0.1.5-rc.1` (verified 2026-09-10).

## [0.2.9] - 2026-09-09

### Changed

- Adapt to the dsh `0.1.5-alpha.1` seam: `Inbox` is now a type-only export (the concrete class moved loop-internal) and `SubprocessHandle` no longer carries `pid`; the test harness uses a structural `unsupportedInbox()`-shaped stand-in and drops the removed `pid` field. No behavior change; `src/` needed no edits.
- Refresh the compatibility baseline to `dsh-v0.1.5-alpha.1` across the five-language READMEs, `AGENTS.md`, and the compat workflow: published npm line `0.1.5-alpha.1` (npm `latest` is still `0.1.2-rc.1`), composite peer range `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0`, and `typecheck:ci` now checks the published `0.1.5-alpha.1` types. The `storageDomain` wording is corrected: the published `dsh-base` bundle mounts storage-domain from `0.1.2-rc.1` on, so the optional read is defensive rather than load-bearing.

## [0.2.8] - 2026-09-08

### Docs

- Repair GBK mojibake in the package.json description: the em dash was corrupted to the U+9225 U+003F marker pair; the description is restored to the clean pre-corruption text; no behavior change.

## [0.2.7] - 2026-09-07

### Docs

- Fix the DSH plugin badge URL: shields.io rejects the four-segment static badge form with "404 badge not found"; the label now uses the documented double-dash form (`dsh--plugin`), rendering identically; no behavior change.

## [0.2.6] - 2026-09-07

### Fixed

- Align the `@deepseek-ai/dsh-*` peer ranges to `>=0.1.2-rc.1 <0.2.0`: the older `>=0.1.0-rc.8 <0.2.0` band resolved to only the `0.1.0-rc.8` prerelease under registry-driven resolution and broke fresh tarball installs; no behavior change.

### Docs

- Refresh the five-language README support-version wording: the verified GitHub tag `dsh-v0.1.3-alpha.1` now leads the compatibility claim, while npm `0.1.2-rc.1` stays the published dependency-pin line (peers `>=0.1.2-rc.1 <0.2.0`); no behavior change.


## [0.2.5] - 2026-09-04

### Changed

- Align the devDependency pins to the published dsh `0.1.2-rc.1` line (12 `@deepseek-ai/dsh-*` packages), the `dshWorkshop` compatibility list, and the compat workflow's CLI/base/headless installs; the five-language READMEs record the rc.1 facts. No behavior change (the seam re-check on the 0.1.3-alpha.1 checkout found no consumer-facing break; the `test_drive` domain contract stays as-is for the dsh-test-drive dependency).

## [0.2.4] - 2026-09-02

### Docs

- Sync the five-language READMEs to the 0.1.2-alpha.5 facts; no behavior change.

## [0.2.3] - 2026-09-02

### Changed

- Align the devDependency pins to the published dsh 0.1.2-alpha.5 line and re-verify the adaptation claims; no behavior change.

## [0.2.2] - 2026-09-01

### Changed

- Align the devDependency pins to the published dsh `0.1.2-alpha.3` line (12 `@deepseek-ai/dsh-*` packages), align `cordis`/`schemastery` to `^4.0.2`/`^3.18.2`, and raise the compat probe pins and `dshWorkshop.compatibility.dshVersions` to `0.1.2-alpha.3`. No behavior change; the five-language READMEs record the alpha.3 fact.

## [0.2.1] - 2026-08-30

### Changed

- Compatibility wording: note that host `0.1.2-alpha.1` mounts `storage-domain` in the shipped `dsh-base` bundle (since `3a4232a8fa`), while the published `0.1.1-rc.2` line does not; `storageDomain` stays deliberately optional so the plugin boots on either line (docs/comments only, no behavior change).

### Fixed

- Test harness: derive synthetic tool-call ids from `tools.execute`'s input type instead of importing `CallId` (renamed to `ToolCallId` on host HEAD), keeping `typecheck` (checkout) and `typecheck:ci` (published `0.1.1-rc.2`) both green.

## [0.2.0] - 2026-08-26

### Added

- `score_badge` tool: an embeddable README badge (self-contained shields.io flat-style SVG, paste-ready endpoint URL, and Markdown embed snippet) plus a compact five-dimension JSON envelope (`schema: "dsh-score/badge/v1"`) for one scored target, from either a fresh `target` score or a stored score card `id` with an optional `refresh` cache bypass. A `no-evidence` dimension keeps its honest status and score 0 — the badge and JSON never fabricate a number.

## [0.1.3] - 2026-08-23

## [0.1.2] - 2026-08-22

### Changed

- Upgrade all `@deepseek-ai/dsh-*` peers to the DSH `0.1.1-rc.2` release: devDependencies pin `0.1.1-rc.2` exactly (including `dsh-attachment`), the `dshWorkshop.compatibility.dshVersions` marker and the README compatibility tables follow, and the compat workflow installs `@deepseek-ai/dsh@0.1.1-rc.2` with `dsh-base`/`dsh-headless` at `0.1.1-rc.2`. Peer dependencies stay `>=0.1.0-rc.8 <0.2.0` because the plugin uses no rc2-only API.
- `typecheck`/`typecheck:ci` and the test harness now validate against the published `0.1.1-rc.2` types.

## [0.1.1] - 2026-08-21

### Changed

- Upgrade all `@deepseek-ai/dsh-*` peers to the DSH `0.1.0-rc.8` release: peerDependencies now declare `>=0.1.0-rc.8 <0.2.0`, devDependencies pin `0.1.0-rc.8` exactly, and the `dshWorkshop.compatibility.dshVersions` marker and README compatibility tables follow.
- `typecheck`/`typecheck:ci` and the test harness now validate against the published `0.1.0-rc.8` types.

## [0.1.0] - 2026-08-17

### Added

- `score` tool: multi-dimensional quality scoring of one repo or npm package from real `gh`/`npm` CLI evidence (install success, maintenance, documentation, security, protocol compliance), with a risk card, weighted total, letter grade, and per-dimension audit links.
- `/score` slash command: batch scoring over `ctx.jobs` producing a leaderboard snapshot (JSON + Markdown).
- `score_report` tool: fetch score cards (`sc_...`), leaderboards (`lb_...`), or the latest leaderboard.
- Structured result contract `dsh-score/v1` stored in the `score` storage domain, with a deterministic score cache keyed by target.
- Reserved dsh-test-drive consumer: the install dimension reads the already-open `test_drive` domain (best-effort; `no-evidence` when absent — no hard dependency).
- Evidence discipline: every conclusion carries a source, sanitized detail, and audit timestamp; dimensions without evidence report `no-evidence` and are excluded from the weighted total.
- Pure sanitizers and detectors for token literals, URL credentials, bearer headers, secret-leak patterns, and malicious install scripts.
- Five-language README, cordis.patch.yml with per-key comments, CI/compat/release workflows, issue forms, pull request template, and the full gate chain.
