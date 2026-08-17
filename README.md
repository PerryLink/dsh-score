<div align="center">

# 🏆 dsh-score

**Multi-dimensional quality scoring for DeepSeek Harness plugins.**

*Five dimensions, real `gh`/`npm` evidence, one weighted risk card and leaderboard.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-score/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-score/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-score?label=version)](https://github.com/PerryLink/dsh-score/releases)
[![npm version](https://img.shields.io/npm/v/dsh-score)](https://www.npmjs.com/package/dsh-score)
[![npm downloads](https://img.shields.io/npm/dm/dsh-score)](https://www.npmjs.com/package/dsh-score)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

| Component | Version |
|---|---|
| DeepSeek Harness | `0.1.0-rc.6` (peer dependencies pinned) |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| Package manager | `pnpm@11.7.0` |
| Platform | Windows / macOS / Linux (host-only plugin) |
| External tools | `gh` CLI on PATH (authenticated for API reads), `npm` CLI on PATH |

## What you get

- `score` tool — one target through the five-dimension pipeline; returns the structured risk card, or `{ kind: 'background', jobId }` with `background: true`.
- `/score` command — batch scoring of a whitespace/comma-separated target list as a `score-batch` background job over `ctx.jobs`, producing a leaderboard snapshot (JSON + Markdown).
- `score_report` tool — fetch any stored score card (`sc_...`), leaderboard (`lb_...`), or the latest leaderboard.
- **Five dimensions** (weights configurable, defaults sum to 100): install success `25`, maintenance `20`, documentation `20`, security `20`, compliance `15`.
- **Evidence discipline** — every dimension records its audit links (`source`, sanitized `detail`, `observedAt`); a dimension without evidence reports `no-evidence` (score 0, excluded from the weighted total), never a fabricated number.
- Structured results — every record carries `schema: "dsh-score/v1"` with first-class fields; this is the machine-readable contract downstream tooling consumes.

## Quick start

### Git channel

```sh
dsh plugin --profile web add github:PerryLink/dsh-score#<commit-sha>
```

The first `add` fails because pnpm blocks the package's `prepare` build; copy the exact key pnpm printed into the profile's `pnpm-workspace.yaml` and re-run:

```yaml
allowBuilds:
  'dsh-score': true
```

### npm channel

```sh
dsh plugin --profile web add dsh-score
```

Prebuilt packages need no build allowance. Restart the profile, then use `score` / `/score` from a session.

## Install & uninstall

```sh
dsh plugin --profile web add dsh-score     # install (npm) — or the git form above
dsh plugin --profile web remove dsh-score  # uninstall
```

## Configuration

All keys are optional (defaults shown); invalid values fail loudly at load.

| Key | Default | Description |
|---|---|---|
| `probeTimeoutMs` | `60000` | Deadline for one `gh`/`npm` probe command. |
| `outputTailBytes` | `8000` | Cap on the sanitized output tail recorded per probe. |
| `cacheMaxAgeMs` | `86400000` | How long a cached score card is reused before re-scoring (0 disables the cache). |
| `staleCommitWarnDays` | `90` | Commit/publish age at which maintenance drops to `warn`. |
| `staleCommitFailDays` | `365` | Commit/publish age at which maintenance drops to `fail`. |
| `staleIssueWarnDays` | `30` | Oldest-open-issue age (response proxy) at which maintenance drops to `warn`. |
| `staleIssueFailDays` | `180` | Oldest-open-issue age at which maintenance drops to `fail`. |
| `maxBatchTargets` | `20` | `/score` batch cap. |
| `batchConcurrency` | `1` | Batch concurrency (serial avoids API-rate contention). |
| `weights` | `{install:25, maintenance:20, documentation:20, security:20, compliance:15}` | Per-dimension weights (each 0–100; at least one must be > 0). |

## Tools & surfaces

### `score`

```
score(target: string, refresh?: boolean, background?: boolean)
```

- `target` — a GitHub repo (`github:owner/repo`, `owner/repo`, a git/https URL) or an npm package name.
- `refresh: true` bypasses the score cache and re-gathers evidence.
- `background: true` starts a `score-batch` job and returns its id.

### `/score <targets...>`

Starts one background batch job; progress streams through the job output, and the final line names the leaderboard id for `score_report`.

### `score_report(id?)`

Returns a score card (`sc_...`), a leaderboard (`lb_...`), or — with no id — the latest leaderboard.

### Structured result sample

```json
{
  "schema": "dsh-score/v1",
  "scoreId": "sc_8f1c2e4a9b3d7f01",
  "target": { "kind": "repo", "spec": "github:owner/dsh-click#abc123" },
  "scoredAt": "2026-08-16T00:00:00.000Z",
  "durationMs": 3210,
  "pluginVersion": "0.1.0",
  "dimensions": {
    "install": { "dimension": "install", "status": "no-evidence", "score": 0, "weight": 25,
                 "summary": "no dsh-test-drive result recorded for this target (install success unmeasured)",
                 "evidence": [{ "source": "test-drive", "detail": "no test-drive record found in the test_drive domain", "observedAt": "2026-08-16T00:00:00.000Z" }] },
    "maintenance": { "dimension": "maintenance", "status": "pass", "score": 100, "weight": 20,
                     "summary": "active (2026-08-10T00:00:00Z; 0 open issues)",
                     "evidence": [{ "source": "gh-api", "detail": "last activity 2026-08-10T00:00:00Z", "observedAt": "2026-08-16T00:00:00.000Z" }] }
  },
  "total": 88,
  "grade": "B",
  "verdict": "healthy (weighted total 88/100)"
}
```

Scoring: the total is a weighted average over dimensions that gathered evidence (no-evidence dimensions are excluded and renormalized); `A` ≥ 90, `B` ≥ 75, `C` ≥ 60, `D` ≥ 40, else `F`, and `N/A` when nothing had evidence.

## Permissions & data

- Only public services are consumed: `ctx.subprocess`, `ctx.jobs`, `ctx.storageDomain`, `ctx.tools`, `ctx.commands`.
- Score cards and leaderboards are stored in the `score` storage-domain (tables `scores`, `leaderboards`; latest-leaderboard pointer). When the composition has no `storageDomain` (e.g. the shipped headless profile), tools still work and score persistence is disabled with a logged reason.
- Child processes inherit the provider's credential-scrubbed environment; `gh` reads its own credential store. No environment value is ever logged.
- All report/log strings pass through pure sanitizers: token literals, URL credentials, and bearer headers are redacted, and tails are byte-capped.

## Security boundaries

- **No code execution.** The pipeline runs `gh api` and `npm view` only; it never installs, builds, or runs a target.
- **Argv-only subprocesses.** Every CLI invocation is an argv array, never shell-interpreted; repo owner/repo segments are validated against a restricted character set before use in an endpoint.
- **Evidence discipline.** No score is fabricated: a probe that fails or returns unparsable output yields `no-evidence`, never a number.
- **Detection vs redaction.** Secret-leak and malicious-install-script detection share the same pure regexes as redaction; both are unit-tested against extreme inputs.

## Known limitations

- Repository probes require `gh` to be authenticated and network access to GitHub; npm probes require `npm` and registry access.
- A target without a resolvable GitHub repository cannot be inspected for documentation, security, or compliance (those dimensions report `no-evidence`).
- Install success depends on `dsh-test-drive` being mounted and having recorded the target; otherwise it is honestly `no-evidence`.
- The maintenance "issue response" signal is a proxy (oldest open issue age), not a direct response-time measurement.
- Score results are cached per target; use `refresh: true` (or wait past `cacheMaxAgeMs`) to force re-scoring.

## Development

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm test
pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack
```

- `typecheck` resolves `@deepseek-ai/*` through the local harness checkout; `typecheck:ci` checks against the published `0.1.0-rc.6` types.
- Tests use the real `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/storage stack with a scripted subprocess provider.
- Real-CLI scoring (requires `gh`/`npm` on PATH, `gh` authenticated): invoke `score` from a mounted profile.
- Release: `node scripts/release.mjs <x.y.z>` (bumps, stamps CHANGELOG, re-runs the gate, commits + tags; never pushes).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `plugin-scoring`, `quality-score`, `leaderboard`, `supply-chain`

## Contributors

[PerryLink](https://github.com/PerryLink) — design and implementation.

## PerryLink DSH Plugin Family

This project is one of the [29 DeepSeek Harness plugins](https://github.com/PerryLink) maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Second-model auto-review on the approval chain, fail-closed by default |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Durable background child agents with a Web UI sidebar, messaging and interrupt |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | Cross-platform native desktop control for DeepSeek Harness — Windows first. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Terminal-style input history for the web composer: arrows, Ctrl+R search |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Engineering-discipline guard: requirements grill, test gates, adversary review |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Unified static-image generation routing for DeepSeek Harness. |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Read-only performance diagnostics for DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | GitHub PR/issues integration for DSH, every write gated by approval |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Local document knowledge base for DeepSeek Harness. |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | Local-model (Ollama) integration for DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | LSP diagnostics, formatting, completion, code actions and rename over language servers |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | PII masking middleware for DeepSeek Harness — anonymize personal data before it reaches the model, restore it at the display layer. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-equivalent runtime style switching |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-style declarative allow/deny/ask permission rules with audit |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Plugin-development knowledge base as an on-demand agent skill |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Pin sessions in the Web sidebar with durable ordering |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Security-audit skill pack: secret scan, dependency and supply-chain review |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |

## License

[Apache-2.0](LICENSE)
