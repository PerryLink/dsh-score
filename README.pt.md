<div align="center">

# 🏆 dsh-score

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
| DeepSeek Harness | `0.1.0-rc.8` (dependências de pares `>=0.1.0-rc.8 <0.2.0`) |
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

Este projeto é um dos [29 complementos do DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também ajudarão:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | Auto-revisão com segundo modelo na cadeia de aprovação, falha fechada por padrão |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Agentes filhos em segundo plano e duráveis com barra lateral Web, mensagens e interrupção |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações e restauração de uma vez |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Migra sessões, memória, skills e CLAUDE.md do Claude Code para o DSH |
| [dsh-click](https://github.com/PerryLink/dsh-click) | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guarda de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Diagnóstico de desempenho somente leitura para DeepSeek Harness. |
| [dsh-github](https://github.com/PerryLink/dsh-github) | Integração de PR/issues do GitHub para DSH, toda escrita com aprovação |
| [dsh-library](https://github.com/PerryLink/dsh-library) | Base de conhecimento documental local para DeepSeek Harness. |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | Integração de modelos locais (Ollama) para DeepSeek Harness. |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | Diagnóstico, formatação, completação, ações e renomeação LSP via servidores de linguagem |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | Middleware de mascaramento de PII para DeepSeek Harness — anonimiza antes do modelo e restaura na camada de exibição. |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | Painel MCP somente leitura: comando /mcp + aba de configurações com status, ferramentas e erros |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memória entre sessões com porta de aprovação: seam ctx.memory + SQLite + ferramenta memory |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Troca de estilos em tempo de execução equivalente ao outputStyles do Claude Code |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Regras declarativas allow/deny/ask estilo Claude Code com auditoria |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | Base de conhecimento de desenvolvimento de plugins como skill de agente sob demanda |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Pontuação de qualidade multidimensional para plugins do DeepSeek Harness. |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Fixa sessões na barra lateral Web com ordenação durável |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | Pacote de skills de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Testes isolados de instalação e inicialização para plugins do DeepSeek Harness. |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. |

## Licença

[Apache-2.0](LICENSE)
