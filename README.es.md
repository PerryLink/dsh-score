# dsh-score

Puntuación de calidad multidimensional para plugins de [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Dado un repositorio o paquete npm, recopila **evidencia real de los CLI `gh`/`npm`** y puntúa cinco dimensiones — éxito de instalación (consumiendo resultados de `dsh-test-drive` cuando están presentes), actividad de mantenimiento, completitud de la documentación, análisis de seguridad y cumplimiento de protocolo — en una tarjeta de riesgo con total ponderado y nota por letra, más una tabla de clasificación JSON/Markdown.

[English](README.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md) · [中文](README.zh.md)

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

## Licencia

[Apache-2.0](LICENSE)
