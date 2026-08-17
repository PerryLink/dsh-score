# dsh-score

Pontuação de qualidade multidimensional para plugins do [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Dado um repositório ou pacote npm, coleta **evidência real dos CLIs `gh`/`npm`** e pontua cinco dimensões — sucesso de instalação (consumindo resultados do `dsh-test-drive` quando presentes), atividade de manutenção, completude da documentação, varredura de segurança e conformidade de protocolo — em um cartão de risco com total ponderado e nota por letra, além de um ranking JSON/Markdown.

[English](README.md) · [Español](README.es.md) · [हिन्दी](README.hi.md) · [中文](README.zh.md)

## Compatibilidade

| Componente | Versão |
|---|---|
| DeepSeek Harness | `0.1.0-rc.6` (peer dependencies fixadas) |
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

## Licença

[Apache-2.0](LICENSE)
