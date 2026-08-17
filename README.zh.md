# dsh-score

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件提供多指标质量评分。给定一个仓库或 npm 包，它采集**真实的 `gh`/`npm` CLI 证据**，对五个维度打分——安装成功率（有 dsh-test-drive 结果时消费其产出）、维护活跃度、文档完整性、安全扫描、协议合规——输出带加权总分与字母等级的风险卡，以及 JSON/Markdown 排行榜。

**一句话定位**: 基于真实 gh/npm 证据对 DSH 插件做五维质量评分（安装成功率/维护活跃度/文档完整性/安全扫描/协议合规），输出风险卡与排行榜。

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

## 兼容性

| 组件 | 版本 |
|---|---|
| DeepSeek Harness | `0.1.0-rc.6`（peer 依赖钉死） |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| 包管理器 | `pnpm@11.7.0` |
| 平台 | Windows / macOS / Linux（纯 host 插件） |
| 外部工具 | PATH 上的 `gh` CLI（已认证用于 API 读取）、PATH 上的 `npm` CLI |

## 你会得到什么

- `score` 工具——对单个目标跑五维评分流水线；返回结构化风险卡，传 `background: true` 时返回 `{ kind: 'background', jobId }`。
- `/score` 命令——把空白/逗号分隔的目标列表作为 `score-batch` 后台任务（`ctx.jobs`）批量评分，产出排行榜快照（JSON + Markdown）。
- `score_report` 工具——按 id 取回评分卡（`sc_...`）、排行榜（`lb_...`）或最新排行榜。
- **五个维度**（权重可配置，默认合计 100）：安装成功率 `25`、维护 `20`、文档 `20`、安全 `20`、合规 `15`。
- **证据纪律**——每个维度记录其审计链接（`source`、脱敏后的 `detail`、`observedAt`）；无证据的维度如实报告 `no-evidence`（得分 0，从加权总分中剔除），绝不编造数字。
- 结构化结果——每条记录带 `schema: "dsh-score/v1"` 判别符，字段一等公民化，是下游工具消费的机器可读契约。

## 快速开始

### git 通道

```sh
dsh plugin --profile web add github:PerryLink/dsh-score#<commit-sha>
```

首次 `add` 会因 pnpm 拦截该包的 `prepare` 构建而失败；把 pnpm 打印的精确键复制到 profile 的 `pnpm-workspace.yaml` 后重试：

```yaml
allowBuilds:
  'dsh-score': true
```

### npm 通道

```sh
dsh plugin --profile web add dsh-score
```

预构建包无需构建许可。重启 profile 后即可在会话中使用 `score` / `/score`。

## 安装与卸载

```sh
dsh plugin --profile web add dsh-score     # 安装（npm）——或上面的 git 形式
dsh plugin --profile web remove dsh-score  # 卸载
```

## 配置

所有键均可选（括号为默认值）；非法值在加载期响亮失败。

| 键 | 默认值 | 说明 |
|---|---|---|
| `probeTimeoutMs` | `60000` | 单条 `gh`/`npm` 探测命令的截止时间（毫秒）。 |
| `outputTailBytes` | `8000` | 每条探测记录的脱敏输出尾部上限（字节）。 |
| `cacheMaxAgeMs` | `86400000` | 缓存评分卡复用的时长（0 关闭缓存）。 |
| `staleCommitWarnDays` | `90` | 提交/发布年龄超过该值维护维度降为 `warn`。 |
| `staleCommitFailDays` | `365` | 提交/发布年龄超过该值维护维度降为 `fail`。 |
| `staleIssueWarnDays` | `30` | 最久未关闭 issue 年龄（响应代理）超过该值降为 `warn`。 |
| `staleIssueFailDays` | `180` | 最久未关闭 issue 年龄超过该值降为 `fail`。 |
| `maxBatchTargets` | `20` | `/score` 批量上限。 |
| `batchConcurrency` | `1` | 批量并发（串行可避免 API 限流竞争）。 |
| `weights` | `{install:25, maintenance:20, documentation:20, security:20, compliance:15}` | 各维度权重（每个 0–100；至少一个 > 0）。 |

## 工具与界面

### `score`

```
score(target: string, refresh?: boolean, background?: boolean)
```

- `target`——GitHub 仓库（`github:owner/repo`、`owner/repo`、git/https URL）或 npm 包名。
- `refresh: true` 绕过评分缓存重新采集证据。
- `background: true` 启动 `score-batch` 任务并返回其 id。

### `/score <targets...>`

启动一个后台批量任务；进度经任务输出流式返回，最后一行给出供 `score_report` 使用的排行榜 id。

### `score_report(id?)`

返回评分卡（`sc_...`）、排行榜（`lb_...`），或不传 id 时返回最新排行榜。

## 权限与数据

- 只消费公开服务：`ctx.subprocess`、`ctx.jobs`、`ctx.storageDomain`、`ctx.tools`、`ctx.commands`。
- 评分卡与排行榜存于 `score` 存储域（表 `scores`、`leaderboards`；最新排行榜指针）。组合里没有 `storageDomain`（如官方 headless profile）时工具仍可用，评分持久化被禁用并记录原因。
- 子进程继承 provider 已剥离凭据的环境；`gh` 读取其自身的凭据存储。任何环境变量值都不被记录。
- 所有报告/日志字符串经过纯脱敏函数：token 字面量、URL 凭据、bearer 头被脱敏，尾部按字节截断。

## 安全边界

- **不执行代码**。流水线只运行 `gh api` 与 `npm view`；绝不安装、构建或运行目标。
- **仅 argv 子进程**。每次 CLI 调用都是 argv 数组，绝不经过 shell 解释；owner/repo 段在用于端点前先做受限字符集校验。
- **证据纪律**。不编造评分：探测失败或输出不可解析时返回 `no-evidence`，绝不填数字。
- **检测与脱敏分离**。密钥泄露与恶意安装脚本检测复用与脱敏同一套纯正则，二者均有极端输入单测。

## 已知限制

- 仓库探测需要 `gh` 已认证且有到 GitHub 的网络；npm 探测需要 `npm` 与 registry 访问。
- 无法解析出 GitHub 仓库的目标无法检查文档、安全或合规（这些维度报告 `no-evidence`）。
- 安装成功率依赖 `dsh-test-drive` 已挂载且已记录该目标；否则如实为 `no-evidence`。
- 维护维度的“issue 响应”是代理信号（最久未关闭 issue 年龄），不是直接响应时长测量。
- 评分按目标缓存；用 `refresh: true`（或等过 `cacheMaxAgeMs`）强制重评。

## 开发

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm test
pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack
```

- `typecheck` 经本地 harness checkout 解析 `@deepseek-ai/*`；`typecheck:ci` 对照已发布的 `0.1.0-rc.6` 类型。
- 测试使用真实 `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/存储栈，子进程 provider 为脚本化实现。
- 真实 CLI 评分（需 PATH 有 `gh`/`npm`，`gh` 已认证）：在已挂载 profile 中调用 `score`。
- 发布：`node scripts/release.mjs <x.y.z>`（升版本、盖 CHANGELOG、重跑门禁、提交 + tag；绝不 push）。

## 主题

`dsh`、`dsh-plugin`、`deepseek-harness`、`deepseek`、`cordis`、`plugin-scoring`、`quality-score`、`leaderboard`、`supply-chain`

## 贡献者

[PerryLink](https://github.com/PerryLink) — 设计与实现。

## 许可证

[Apache-2.0](LICENSE)
