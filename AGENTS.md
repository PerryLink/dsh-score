# AGENTS.md

Standalone DeepSeek Harness plugin repository (`dsh-score`). Development follows the dsh-plugin-guide skill and the official plugin contract; this file records repo-local decisions.

## Layout

- `src/index.ts` — function-plugin contract (`name`/`inject`/`Config`/`apply`; NO default export). Injects `tools`, `commands`, `subprocess`, `jobs`; `storageDomain` is deliberately OPTIONAL (`ctx.get`): the published `dsh-base` bundle (0.1.2-rc.1 line) does not mount it, while host HEAD mounts storage-domain (0.1.3-alpha.1) — the plugin must still boot on the published line, so score persistence degrades to disabled with a logged reason when the service is absent.
- `src/config.ts` — Schemastery schema + explicit `resolveConfig` (no hidden `?? default`); every default, threshold, and weight is re-judged there so plain-JS mounts fail loud too.
- `src/result.ts` — the structured score contract `dsh-score/v1`; the zod schemas are the single source of truth and validate records at the durable boundary of the `score` storage domain.
- `src/probe.ts` — the `gh`/`npm` CLI probe layer over `ctx.subprocess` (argv-only, never a shell) plus the pure JSON parsers. `src/dimensions.ts` — the five pure dimension evaluators. `src/score.ts` — the single-target pipeline + the reserved test-drive consumer. `src/batch.ts` — the `score-batch` job producer over `ctx.jobs`.
- `tests/` — vitest; real Cordis `Context` + real `SessionStore`/`Session`/`ToolRuntime`/`AgentRegistry`/`LocalJobRegistry`/`Storage`+`DomainFacility` from the `0.1.2-rc.1` peers; the subprocess provider is a scripted subclass of the REAL `SubprocessRuntime`.

## Hard rules applied here

- **Evidence discipline is load-bearing.** Every conclusion must come from real `gh`/`npm` output (or a real test-drive record), never invented. Each dimension records audit links; `no-evidence` (score 0, excluded from the weighted total) is the honest answer when a probe failed or returned nothing.
- **Install evidence is reserved, not hard-dependent.** The install dimension reads the ALREADY-OPEN `test_drive` domain through `ctx.storageDomain.get('test_drive')` — it never opens that domain itself (the facility enforces single-open per name). Absent test-drive → `no-evidence`.
- **Credentials never leak.** The probe driver passes no explicit env, so children inherit the provider's scrubbed base; `gh` uses its own credential store. Every report/log string passes the sanitizers; secret detection and redaction share one set of regexes.
- **Model-visible ⟺ logged.** The only model-visible content is tool output (durable `tool/result`) and job progress/notices; the plugin registers no session events and never injects agent context.
- **Registration = effect.** Tools and the command register through `ctx.tools.register` / `ctx.commands.register` inside `ctx.effect`; the score domain closes through an effect disposer.
- **Waterfall discipline.** This plugin registers no waterfall listeners today; if it ever does, allow/passthrough MUST call `next()`.
- **Loud misconfiguration.** Out-of-bounds timeouts, day thresholds, batch caps, and weights fail `resolveConfig` at load, never silently.

## Checks

`pnpm run typecheck && pnpm run typecheck:ci && pnpm test && pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack`

- `typecheck` resolves `@deepseek-ai/*` through tsconfig paths to the local harness checkout; `typecheck:ci` clears the paths and checks against the published `0.1.2-rc.1` types. Both must stay green.
- `test` runs the scripted suites against the real peers with a scripted subprocess provider. Real-CLI scoring (`gh`/`npm` on PATH + `gh` authenticated) is exercised manually, not in CI.

## Release

`node scripts/release.mjs <x.y.z>` bumps package.json + `src/version.ts`, stamps the CHANGELOG `[Unreleased]` section, re-runs the full gate, and commits + tags (never pushes). `git push origin main --follow-tags` triggers `.github/workflows/release.yml`, which re-runs the gate, publishes to npm with provenance, and creates the GitHub Release from the stamped CHANGELOG section.

## Docs

- Five-language READMEs (`README.md`, `README.zh.md`, `README.es.md`, `README.pt.md`, `README.hi.md`) — keep all five in sync; the English file is the source of truth.
- GitHub topics mirror `package.json` keywords (`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `plugin-scoring`, `quality-score`, `leaderboard`, `supply-chain`).
- License is Apache-2.0 (`LICENSE` + the package.json `license` field). `THIRD_PARTY_NOTICES.md` documents the runtime/build dependencies.
