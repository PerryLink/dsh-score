# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `score` tool: multi-dimensional quality scoring of one repo or npm package from real `gh`/`npm` CLI evidence (install success, maintenance, documentation, security, protocol compliance), with a risk card, weighted total, letter grade, and per-dimension audit links.
- `/score` slash command: batch scoring over `ctx.jobs` producing a leaderboard snapshot (JSON + Markdown).
- `score_report` tool: fetch score cards (`sc_...`), leaderboards (`lb_...`), or the latest leaderboard.
- Structured result contract `dsh-score/v1` stored in the `score` storage domain, with a deterministic score cache keyed by target.
- Reserved dsh-test-drive consumer: the install dimension reads the already-open `test_drive` domain (best-effort; `no-evidence` when absent — no hard dependency).
- Evidence discipline: every conclusion carries a source, sanitized detail, and audit timestamp; dimensions without evidence report `no-evidence` and are excluded from the weighted total.
- Pure sanitizers and detectors for token literals, URL credentials, bearer headers, secret-leak patterns, and malicious install scripts.
- Five-language README, cordis.patch.yml with per-key comments, CI/compat/release workflows, issue forms, pull request template, and the full gate chain.
