<div align="center">

# 🏆 dsh-score
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-score` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Puntuación de calidad multidimensional para plugins de DeepSeek Harness.**

*Cinco dimensiones, evidencia real de los CLI `gh`/`npm`, una tarjeta de riesgo ponderada y tabla de clasificación.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-score)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-score.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-score/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-score/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-score?label=version)](https://github.com/PerryLink/dsh-score/releases)
[![npm version](https://img.shields.io/npm/v/dsh-score)](https://www.npmjs.com/package/dsh-score)
[![npm downloads](https://img.shields.io/npm/dm/dsh-score)](https://www.npmjs.com/package/dsh-score)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-score?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-score?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibilidad

| Componente | Versión |
|---|---|
| DeepSeek Harness | **`dsh-v0.1.7-alpha.1`** (etiqueta de GitHub; el rango de pares admite la línea alpha.2: `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0`). Los pines de dev/test y la regla `typecheck:ci` siguen midiendo la línea publicada `0.1.5-rc.2` (verificado el 2026-09-18: puertas de tipos, suites unitarias/de ensamblaje, build de artefactos); no cambió código del plugin para la línea alpha.2. |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| Gestor de paquetes | `pnpm@11.7.0` |
| Plataforma | Windows / macOS / Linux (plugin solo host) |
| Herramientas externas | CLI `gh` en PATH (autenticado), CLI `npm` en PATH |

## Qué obtienes

- Herramienta `score` — un objetivo por la canalización de cinco dimensiones; devuelve la tarjeta de riesgo estructurada, o `{ kind: 'background', jobId }` con `background: true`.
- Comando `/score` — puntuación por lotes de una lista separada por espacios/comas como trabajo en segundo plano `score-batch` sobre `ctx.jobs`, produciendo una tabla (JSON + Markdown).
- Herramienta `score_report` — recupera una tarjeta (`sc_...`), una tabla (`lb_...`) o la última tabla.
- **Cinco dimensiones** (pesos configurables, suma 100 por defecto): instalación `25`, mantenimiento `20`, documentación `20`, seguridad `20`, cumplimiento `15`.
- **Disciplina de evidencia** — cada dimensión registra sus enlaces de auditoría; sin evidencia reporta `no-evidence` (puntuación 0, excluida del total), nunca un número inventado.
- Resultados estructurados — cada registro lleva `schema: "dsh-score/v1"`.

## Inicio rápido

### Canal git

```sh
dsh plugin --profile web add github:PerryLink/dsh-score#<commit-sha>
```

El primer `add` falla porque pnpm bloquea el `prepare`; copia la clave exacta impresa en `pnpm-workspace.yaml` y reintenta:

```yaml
allowBuilds:
  'dsh-score': true
```

### Canal npm

```sh
dsh plugin --profile web add dsh-score
```

## Instalación y desinstalación

```sh
dsh plugin --profile web add dsh-score     # instalar (npm) — o el formulario git anterior
dsh plugin --profile web remove dsh-score  # desinstalar
```

## Configuración

Todas las claves son opcionales (valores por defecto mostrados); los valores inválidos fallan en voz alta al cargar.

| Clave | Predeterminado | Descripción |
|---|---|---|
| `probeTimeoutMs` | `60000` | Plazo para un comando de sondeo `gh`/`npm`. |
| `outputTailBytes` | `8000` | Tope de la cola de salida saneada por sondeo. |
| `cacheMaxAgeMs` | `86400000` | Tiempo de reutilización de una tarjeta cacheada. |
| `staleCommitWarnDays` | `90` | Edad de commit a `warn`. |
| `staleCommitFailDays` | `365` | Edad de commit a `fail`. |
| `staleIssueWarnDays` | `30` | Edad de issue abierto más antiguo a `warn`. |
| `staleIssueFailDays` | `180` | Edad de issue abierto más antiguo a `fail`. |
| `maxBatchTargets` | `20` | Tope de lote de `/score`. |
| `batchConcurrency` | `1` | Concurrencia del lote. |
| `weights` | `{install:25, maintenance:20, documentation:20, security:20, compliance:15}` | Pesos por dimensión. |

## Herramientas y superficies

### `score`

```
score(target: string, refresh?: boolean, background?: boolean)
```

- `target` — repositorio de GitHub (`github:owner/repo`, `owner/repo`, URL git/https) o nombre de paquete npm.
- `refresh: true` omite la caché y vuelve a recopilar evidencia.
- `background: true` inicia un trabajo `score-batch`.

### `/score <targets...>`

Inicia un trabajo por lotes en segundo plano; la última línea nombra el id de tabla para `score_report`.

### `score_report(id?)`

Devuelve una tarjeta (`sc_...`), una tabla (`lb_...`) o, sin id, la última tabla.

### `score_badge(target? | id?, refresh?)`

Genera una insignia embebible en README y el JSON de cinco dimensiones para un objetivo:

- `target` — puntúa un repositorio de GitHub o un paquete npm (a través de la caché) y le pone insignia; mutuamente excluyente con `id`.
- `id` — pone insignia a una tarjeta almacenada (`sc_...`) sin volver a puntuar.
- `refresh: true` — omite la caché de puntuación (solo aplica a `target`).

Devuelve la insignia (SVG + endpoint + inserción Markdown) y el JSON compacto de cinco dimensiones — ver «Insignia y API JSON» abajo.

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

Puntuación: el total es una media ponderada sobre las dimensiones con evidencia (las dimensiones no-evidence se excluyen y se renormalizan); `A` ≥ 90, `B` ≥ 75, `C` ≥ 60, `D` ≥ 40, si no `F`, y `N/A` cuando nada tuvo evidencia.

## Insignia y API JSON

`score_badge` genera una insignia embebible en README y el JSON de cinco dimensiones para un objetivo puntuado.

### Insignia

- **Insignia** — SVG plano de shields.io (campo `badge.svg` / `renderScoreBadge`), URL de endpoint documentada y fragmento Markdown de inserción.

Inserta la insignia total:

```markdown
![dsh-score: B · 84/100](https://img.shields.io/badge/dsh--score-B_%C2%B7_84%2F100-green)
```

### JSON de cinco dimensiones

- **JSON de cinco dimensiones** — `install`/`maintenance`/`documentation`/`security`/`compliance` con `status`/`score`/`weight`/`summary`, más el `total` ponderado y la `grade` (`schema: "dsh-score/badge/v1"`).

Una dimensión `no-evidence` conserva su estado honesto y puntúa 0 — la insignia y el JSON nunca inventan números.

## Permisos y datos

- Solo servicios públicos: `ctx.subprocess`, `ctx.jobs`, `ctx.storageDomain`, `ctx.tools`, `ctx.commands`.
- Las tarjetas y tablas se almacenan en el dominio `score` (tablas `scores`, `leaderboards`; puntero a la última tabla). Sin `storageDomain`, las herramientas siguen funcionando y la persistencia se desactiva con motivo registrado. El bundle `dsh-base` publicado monta storage-domain desde `0.1.2-rc.1` (verificado con los tarballs `0.1.2-rc.1` y `0.1.5-alpha.1`), así que la persistencia está activa en la línea publicada.
- Los procesos hijos heredan un entorno sin credenciales; `gh` usa su propio almacén. Ningún valor de entorno se registra.

## Límites de seguridad

- **Sin ejecución de código.** Solo se ejecutan `gh api` y `npm view`.
- **Subprocesos solo argv.** Nunca se interpreta una shell; los segmentos owner/repo se validan antes de usarse.
- **Disciplina de evidencia.** Un sondeo fallido produce `no-evidence`, nunca un número.
- **Detección vs saneado.** Detección de secretos y scripts maliciosos comparte las mismas regex puras que el saneado.

## Limitaciones conocidas

- Los sondeos de repositorio requieren `gh` autenticado y red; los de npm requieren `npm` y acceso al registry.
- Sin un repositorio de GitHub resoluble, documentación/seguridad/cumplimiento reportan `no-evidence`.
- El éxito de instalación depende de `dsh-test-drive` montado con el objetivo registrado.
- La «respuesta a issues» es un proxy (edad del issue abierto más antiguo).
- Los resultados se cachean por objetivo; usa `refresh: true` para forzar re-puntuación.

## Desarrollo

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm test
pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack
```

## Temas

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `plugin-scoring`, `quality-score`, `leaderboard`, `supply-chain`

## Contribuidores

[PerryLink](https://github.com/PerryLink) — diseño e implementación.

## PerryLink DSH Plugin Family

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.

## Licencia

[Apache-2.0](LICENSE)
