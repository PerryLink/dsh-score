<div align="center">

# 🏆 dsh-score

**Puntuación de calidad multidimensional para plugins de DeepSeek Harness.**

*Cinco dimensiones, evidencia real de los CLI `gh`/`npm`, una tarjeta de riesgo ponderada y tabla de clasificación.*

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

## Compatibilidad

| Componente | Versión |
|---|---|
| DeepSeek Harness | `0.1.0-rc.6` (peer dependencies fijadas) |
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

## Permisos y datos

- Solo servicios públicos: `ctx.subprocess`, `ctx.jobs`, `ctx.storageDomain`, `ctx.tools`, `ctx.commands`.
- Las tarjetas y tablas se almacenan en el dominio `score` (tablas `scores`, `leaderboards`; puntero a la última tabla). Sin `storageDomain`, las herramientas siguen funcionando y la persistencia se desactiva con motivo registrado.
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

Este proyecto es uno de los [29 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, los demás probablemente también:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Auto-revisión con segundo modelo en la cadena de aprobación, cerrado ante fallo por defecto |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Agentes secundarios en segundo plano y duraderos con barra lateral Web, mensajería e interrupción |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Gobernanza de costes para DeepSeek Harness: presupuestos, carbono y latencia en un panel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Equivalente a /rewind de Claude Code: instantáneas, bifurcaciones y restauración de una vez |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migra sesiones, memoria, skills y CLAUDE.md de Claude Code a DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | Control de escritorio nativo multiplataforma para DeepSeek Harness — Windows primero. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Historial de entrada estilo terminal para el compositor web: flechas, búsqueda Ctrl+R |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Defensa contra inyección de prompts, jailbreak y fuga de secretos para DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guardia de disciplina de ingeniería: interrogatorio de requisitos, puertas de test, revisión adversaria |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Enrutamiento unificado de generación de imágenes estáticas para DeepSeek Harness. |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Diagnóstico de rendimiento de solo lectura para DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | Integración de PR/issues de GitHub para DSH, cada escritura con aprobación |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Base de conocimiento documental local para DeepSeek Harness. |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | Integración de modelos locales (Ollama) para DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | Diagnóstico, formato, completado, acciones y renombrado LSP vía servidores de lenguaje |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | Middleware de enmascarado PII para DeepSeek Harness — anonimiza antes del modelo y restaura en la capa de visualización. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Panel MCP de solo lectura: comando /mcp + pestaña de ajustes con estado, herramientas y errores |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memoria entre sesiones con puerta de aprobación: seam ctx.memory + SQLite + herramienta memory |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | Exportador de observabilidad OpenTelemetry y Langfuse para DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Cambio de estilos en tiempo de ejecución equivalente a outputStyles de Claude Code |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Reglas declarativas allow/deny/ask estilo Claude Code con auditoría |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Base de conocimiento de desarrollo de complementos como skill de agente bajo demanda |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Puntuación de calidad multidimensional para complementos de DeepSeek Harness. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Fija sesiones en la barra lateral Web con orden durable |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Sincronización de sesiones entre dispositivos para DeepSeek Harness — un espejo git dedicado de tu almacén de sesiones. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Paquete de skills de auditoría de seguridad: escaneo de secretos, revisión de dependencias y cadena de suministro |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Bucle de sesión con voz para DeepSeek Harness: háblale y escucha su respuesta. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Pruebas de instalación y arranque aisladas para complementos de DeepSeek Harness. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness. |

## Licencia

[Apache-2.0](LICENSE)
