<div align="center">

# 🏆 dsh-score
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-score` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Pontuação de qualidade multidimensional para plugins do DeepSeek Harness.**

*Cinco dimensões, evidência real dos CLIs `gh`/`npm`, um cartão de risco ponderado e ranking.*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-score?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-score?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-score
```


</div>

---


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Instalação e desinstalação

```sh
dsh plugin --profile web add dsh-score     # instalar (npm) — ou o formulário git acima
dsh plugin --profile web remove dsh-score  # desinstalar
```

## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-score?

Pontuação de qualidade multidimensional para plugins do DeepSeek Harness.

Cinco dimensões, evidência real dos CLIs `gh`/`npm`, um cartão de risco ponderado e ranking.

![Diagrama de fluxo de dsh-score: pergunta → fontes seladas → relatório.](docs/assets/dsh-score-flow.svg)

*Visão geral do fluxo: pergunta → fontes seladas → relatório. Os exemplos abaixo usam a superfície real de comandos.*


*A mesma execução, animada.*

## Comparison

![Gráfico comparativo medido do dsh-score](https://raw.githubusercontent.com/PerryLink/dsh-score/main/docs/assets/dsh-score-evidence.png)

## Compatibilidade

| Componente | Versão |
|---|---|
| DeepSeek Harness | **`dsh-v0.2.1-rc.2`** (GitHub tag). The `engines.dsh` gate is `>=0.2.1-0 <0.3.0`; dev/test pins and the `typecheck:ci` ruler measure `0.2.1-rc.2`. The `ctx.jobs` seam uses the `SessionId` contract. |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| Gerenciador de pacotes | `pnpm@11.7.0` |
| Plataforma | Windows / macOS / Linux (plugin somente host) |
| Ferramentas externas | CLI `gh` no PATH (autenticado), CLI `npm` no PATH |

## O que você recebe

- Ferramenta `score` — um alvo pela pipeline de cinco dimensões; retorna o cartão estruturado ou `{ kind: 'background', jobId }` com `background: true`.
- Comando `/score` — pontuação em lote de uma lista separada por espaços/vírgulas como job `score-batch` sobre `ctx.jobs`, produzindo um ranking (JSON + Markdown).
- Ferramenta `score_report` — busca um cartão (`sc_...`), um ranking (`lb_...`) ou o último ranking.
- **Cinco dimensões** (pesos configuráveis, soma 100 por padrão): instalação `25`, manutenção `20`, documentação `20`, segurança `20`, conformidade `15`.
- **Disciplina de evidência** — cada dimensão registra seus links de auditoria; sem evidência reporta `no-evidence` (pontuação 0, excluída do total), nunca um número inventado.
- Resultados estruturados — cada registro carrega `schema: "dsh-score/v1"`.

## Início rápido

### Canal git

```sh
dsh plugin --profile web add github:PerryLink/dsh-score#<commit-sha>
```

O primeiro `add` falha porque o pnpm bloqueia o `prepare`; copie a chave exata impressa em `pnpm-workspace.yaml` e tente de novo:

```yaml
allowBuilds:
  'dsh-score': true
```

### Canal npm

```sh
dsh plugin --profile web add dsh-score
```

### Exemplos

São os pontos de entrada reais; instale e chame um.

#### Exemplo detalhado

**Comando**

~~~sh
score({ target: "owner/repo" })
~~~

**Saída**

~~~text
# Score sc_65e817eec8cd71ed

- Target: `owner/repo` (repo)
- Grade: **B** — total 88/100
- Verdict: healthy (weighted total 88/100)

| Dimension | Status | Score | Weight | Summary |
|---|---|---|---|---|
| Install success | ⬜ no-evidence | 0 | 25 | no dsh-test-drive result recorded for this target (install success unmeasured) |
| Maintenance | ✅ pass | 100 | 20 | active (2026-08-15T00:00:00.000Z; 0 open issues) |
| Documentation | 🟠 warn | 70 | 20 | 1/4 language READMEs + CHANGELOG + SECURITY |
| Security | ✅ pass | 100 | 20 | license MIT |
| Protocol compliance | ✅ pass | 81 | 15 | dsh.bundle.patch declared |
~~~

*Observado em `README.md:141-149,169-191; tests/tools.spec.ts:64-65; tests/score.spec.ts:50-55; src/report.ts:40-53`*

#### Ramo de falha

**Entrada**

~~~text
{"id":"sc_nope"}
~~~

**Saída**

~~~text
isError=true; error.message=dsh-score: no score recorded with id sc_nope
~~~

*Observado em `plugins/dsh-score/src/tools.ts:351-354 (throw); plugins/dsh-score/tests/tools.spec.ts:95-99 (unknown id); plugins/dsh-score/README.md:179-181 (score_report); exercised through plugins/dsh-score/tests/harness.ts`*

#### Exemplos breves



## Configuração

Todas as chaves são opcionais (padrões mostrados); valores inválidos falham em voz alta ao carregar.

| Chave | Padrão | Descrição |
|---|---|---|
| `probeTimeoutMs` | `60000` | Prazo para um comando de sondagem `gh`/`npm`. |
| `outputTailBytes` | `8000` | Teto da cauda de saída saneada por sondagem. |
| `cacheMaxAgeMs` | `86400000` | Tempo de reuso de um cartão em cache. |
| `staleCommitWarnDays` | `90` | Idade de commit para `warn`. |
| `staleCommitFailDays` | `365` | Idade de commit para `fail`. |
| `staleIssueWarnDays` | `30` | Idade da issue aberta mais antiga para `warn`. |
| `staleIssueFailDays` | `180` | Idade da issue aberta mais antiga para `fail`. |
| `maxBatchTargets` | `20` | Teto de lote do `/score`. |
| `batchConcurrency` | `1` | Concorrência do lote. |
| `weights` | `{install:25, maintenance:20, documentation:20, security:20, compliance:15}` | Pesos por dimensão. |

## Ferramentas e superfícies

### `score`

```
score(target: string, refresh?: boolean, background?: boolean)
```

- `target` — repositório GitHub (`github:owner/repo`, `owner/repo`, URL git/https) ou nome de pacote npm.
- `refresh: true` ignora o cache e recoleta evidência.
- `background: true` inicia um job `score-batch`.

### `/score <targets...>`

Inicia um job em lote em segundo plano; a última linha nomeia o id do ranking para `score_report`.

### `score_report(id?)`

Retorna um cartão (`sc_...`), um ranking (`lb_...`) ou, sem id, o último ranking.

### `score_badge(target? | id?, refresh?)`

Gera uma insígnia embebível em README e o JSON de cinco dimensões para um alvo:

- `target` — pontua um repositório do GitHub ou um pacote npm (via cache) e gera a insígnia; mutuamente exclusivo com `id`.
- `id` — gera a insígnia de um cartão armazenado (`sc_...`) sem repontuar.
- `refresh: true` — ignora o cache de pontuação (aplica-se apenas a `target`).

Retorna a insígnia (SVG + endpoint + trecho Markdown) e o JSON compacto de cinco dimensões — veja «Insígnia e API JSON» abaixo.

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

Pontuação: o total é uma média ponderada sobre as dimensões com evidência (dimensões no-evidence são excluídas e renormalizadas); `A` ≥ 90, `B` ≥ 75, `C` ≥ 60, `D` ≥ 40, senão `F`, e `N/A` quando nada teve evidência.

## Insígnia e API JSON

`score_badge` gera uma insígnia embebível em README e o JSON de cinco dimensões para um alvo pontuado.

### Insígnia

- **Insígnia** — SVG plano do shields.io (campo `badge.svg` / `renderScoreBadge`), URL de endpoint documentada e trecho Markdown de incorporação.

Incorpore a insígnia total:

```markdown
![dsh-score: B · 84/100](https://img.shields.io/badge/dsh--score-B_%C2%B7_84%2F100-green)
```

### JSON de cinco dimensões

- **JSON de cinco dimensões** — `install`/`maintenance`/`documentation`/`security`/`compliance` com `status`/`score`/`weight`/`summary`, além do `total` ponderado e da `grade` (`schema: "dsh-score/badge/v1"`).

Uma dimensão `no-evidence` mantém seu estado honesto e pontua 0 — a insígnia e o JSON nunca fabricam números.

## Permissões e dados

- Apenas serviços públicos: `ctx.subprocess`, `ctx.jobs`, `ctx.storageDomain`, `ctx.tools`, `ctx.commands`.
- Cartões e rankings são armazenados no domínio `score` (tabelas `scores`, `leaderboards`; ponteiro do último ranking). Sem `storageDomain`, as ferramentas seguem funcionando e a persistência é desativada com motivo registrado. O bundle `dsh-base` publicado monta storage-domain desde `0.1.2-rc.1` (verificado nos tarballs `0.1.2-rc.1` e `0.1.5-alpha.1`), então a persistência está ativa na linha publicada.
- Processos filhos herdam um ambiente sem credenciais; `gh` usa seu próprio armazenamento. Nenhum valor de ambiente é registrado.

## Limites de segurança

- **Sem execução de código.** Apenas `gh api` e `npm view` são executados.
- **Subprocessos somente argv.** Nunca via shell; segmentos owner/repo são validados antes do uso.
- **Disciplina de evidência.** Sondagem com falha produz `no-evidence`, nunca um número.
- **Detecção vs saneamento.** Detecção de segredos e scripts maliciosos compartilha as mesmas regex puras do saneamento.

## Limitações conhecidas

- Sondagens de repositório exigem `gh` autenticado e rede; as de npm exigem `npm` e acesso ao registry.
- Sem repositório GitHub resolvível, documentação/segurança/conformidade reportam `no-evidence`.
- O sucesso de instalação depende do `dsh-test-drive` montado com o alvo registrado.
- A «resposta a issues» é um proxy (idade da issue aberta mais antiga).
- Resultados são cacheados por alvo; use `refresh: true` para forçar nova pontuação.

## Desenvolvimento

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm test
pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack
```

## Tópicos

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `plugin-scoring`, `quality-score`, `leaderboard`, `supply-chain`

## Contribuidores

[PerryLink](https://github.com/PerryLink) — design e implementação.

## PerryLink DSH Plugin Family

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>

## Licença

[Apache-2.0](LICENSE)
