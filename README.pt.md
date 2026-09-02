<div align="center">

# 🏆 dsh-score
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-score` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Pontuação de qualidade multidimensional para plugins do DeepSeek Harness.**

*Cinco dimensões, evidência real dos CLIs `gh`/`npm`, um cartão de risco ponderado e ranking.*

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

## Compatibilidade

| Componente | Versão |
|---|---|
| DeepSeek Harness | `0.1.2-alpha.5` (dependências de pares `>=0.1.0-rc.8 <0.2.0`) (adaptado em 2026-09-02): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda. |
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

## Instalação e desinstalação

```sh
dsh plugin --profile web add dsh-score     # instalar (npm) — ou o formulário git acima
dsh plugin --profile web remove dsh-score  # desinstalar
```

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
- Cartões e rankings são armazenados no domínio `score` (tabelas `scores`, `leaderboards`; ponteiro do último ranking). Sem `storageDomain`, as ferramentas seguem funcionando e a persistência é desativada com motivo registrado.
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

Este projeto é um dos [33 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisão de segundo modelo na cadeia de aprovação, com falha fechada por padrão | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes filhos em segundo plano duráveis com barra lateral de UI web, mensagens e interrupção | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações de sessão, restauração de uso único | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migre sessões, memória, habilidades e CLAUDE.md do Claude Code para o DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardião de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de desempenho só de leitura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Relatórios de pesquisa deterministas para fundos mútuos públicos chineses | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integração de PR/issues do GitHub para o DSH, cada escrita controlada por aprovação | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conhecimento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formatação, autocompletar, ações de código e renomeação LSP sobre servidores de linguagem | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Painel de tempo de execução MCP somente leitura: comando /mcp + aba Settings com status, ferramentas e erros | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memória entre sessões controlada por aprovação: costura ctx.memory + SQLite + ferramenta de memória | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Troca de estilo em tempo de execução equivalente ao outputStyles do Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Regras de permissão declarativas allow/deny/ask estilo Claude Code com auditoria | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conhecimento de desenvolvimento de plugins como habilidade de agente sob demanda | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Motor de relatórios de pesquisa verificáveis com evidência endereçada por conteúdo | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Fixe sessões na barra lateral web com ordenação durável | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Pacote de habilidades de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. | |

## Licença

[Apache-2.0](LICENSE)
