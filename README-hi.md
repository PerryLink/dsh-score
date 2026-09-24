<div align="center">

# 🏆 dsh-score
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-score` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness प्लगइन के लिए बहु-आयामी गुणवत्ता स्कोरिंग।**

*पाँच आयाम, वास्तविक `gh`/`npm` साक्ष्य, एक भारित रिस्क कार्ड और लीडरबोर्ड।*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-score?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-score?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---


<!-- star-cta -->
## ⭐ 如果它帮到了你

यह प्लगइन [DSH प्लगइन परिवार](https://github.com/PerryLink) का हिस्सा है (40+ प्लगइन, सभी Apache-2.0)। अगर यह उपयोगी लगे, तो **एक स्टार दें** — इससे कोई सुविधा अनलॉक नहीं होती, पर अगला व्यक्ति इसे खोज में आसानी से पा लेता है।

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.
## संगतता

| घटक | संस्करण |
|---|---|
| DeepSeek Harness | **`dsh-v0.1.7-rc.2`** (GitHub tag; peer रेंज alpha.2 लाइन को स्वीकार करती है: `>=0.1.2-rc.1 <0.2.0 \|\| >=0.1.5-alpha.1 <0.2.0 \|\| >=0.1.6-0 <0.2.0 \|\| >=0.1.7-0 <0.2.0`)। dev/test पिन और `typecheck:ci` रूलर अब प्रकाशित `0.1.7-rc.2` लाइन को मापते हैं (`0.1.6-alpha.2` फ़ेस 2026-09-18 को सत्यापित: टाइप गेट, यूनिट/असेंबली सूट, आर्टिफ़ैक्ट बिल्ड); `ctx.jobs` seam को alpha.2 के `SessionId` अनुबंध पर माइग्रेट किया गया। |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| पैकेज प्रबंधक | `pnpm@11.7.0` |
| प्लेटफ़ॉर्म | Windows / macOS / Linux (केवल-होस्ट प्लगइन) |
| बाहरी उपकरण | PATH पर `gh` CLI (प्रमाणित), PATH पर `npm` CLI |

## आपको क्या मिलता है

- `score` टूल — पाँच-आयामी पाइपलाइन के माध्यम से एक लक्ष्य; संरचित रिस्क कार्ड लौटाता है, या `background: true` के साथ `{ kind: 'background', jobId }`।
- `/score` कमांड — `ctx.jobs` पर `score-batch` पृष्ठभूमि कार्य के रूप में स्पेस/कॉमा से अलग लक्ष्य सूची की बैच स्कोरिंग, लीडरबोर्ड स्नैपशॉट (JSON + Markdown) बनाता है।
- `score_report` टूल — कोई संग्रहीत स्कोर कार्ड (`sc_...`), लीडरबोर्ड (`lb_...`), या नवीनतम लीडरबोर्ड लाता है।
- `score_badge` टूल — किसी लक्ष्य या संग्रहीत कार्ड के लिए README बैज और पाँच-आयामी JSON।
- **पाँच आयाम** (भार विन्यास योग्य, डिफ़ॉल्ट योग 100): इंस्टॉल `25`, रखरखाव `20`, दस्तावेज़ीकरण `20`, सुरक्षा `20`, अनुपालन `15`।
- **साक्ष्य अनुशासन** — हर आयाम अपने ऑडिट लिंक दर्ज करता है; साक्ष्य के बिना वह `no-evidence` रिपोर्ट करता है (स्कोर 0, कुल से बाहर), कभी कोई बनाया हुआ नंबर नहीं।
- संरचित परिणाम — हर रिकॉर्ड `schema: "dsh-score/v1"` रखता है।

## त्वरित शुरुआत

### git चैनल

```sh
dsh plugin --profile web add github:PerryLink/dsh-score#<commit-sha>
```

पहला `add` विफल होता है क्योंकि pnpm `prepare` बिल्ड रोक देता है; pnpm द्वारा छापी गई सटीक कुंजी को profile के `pnpm-workspace.yaml` में कॉपी करें और पुनः चलाएँ:

```yaml
allowBuilds:
  'dsh-score': true
```

### npm चैनल

```sh
dsh plugin --profile web add dsh-score
```

## इंस्टॉल और अनइंस्टॉल

```sh
dsh plugin --profile web add dsh-score     # इंस्टॉल (npm) — या ऊपर वाला git रूप
dsh plugin --profile web remove dsh-score  # अनइंस्टॉल
```

## विन्यास

सभी कुंजियाँ वैकल्पिक हैं (डिफ़ॉल्ट दिखाए गए); अमान्य मान लोड पर ज़ोर से विफल होते हैं।

| कुंजी | डिफ़ॉल्ट | विवरण |
|---|---|---|
| `probeTimeoutMs` | `60000` | एक `gh`/`npm` प्रोब कमांड की समय-सीमा। |
| `outputTailBytes` | `8000` | प्रति प्रोब सैनिटाइज़ आउटपुट टेल की सीमा। |
| `cacheMaxAgeMs` | `86400000` | कैश किए कार्ड का पुनः उपयोग समय। |
| `staleCommitWarnDays` | `90` | कमिट आयु `warn` के लिए। |
| `staleCommitFailDays` | `365` | कमिट आयु `fail` के लिए। |
| `staleIssueWarnDays` | `30` | सबसे पुराने खुले issue की आयु `warn` के लिए। |
| `staleIssueFailDays` | `180` | सबसे पुराने खुले issue की आयु `fail` के लिए। |
| `maxBatchTargets` | `20` | `/score` बैच सीमा। |
| `batchConcurrency` | `1` | बैच समवर्तीता। |
| `weights` | `{install:25, maintenance:20, documentation:20, security:20, compliance:15}` | प्रति-आयाम भार। |

## टूल और सतहें

### `score`

```
score(target: string, refresh?: boolean, background?: boolean)
```

- `target` — GitHub रिपॉज़िटरी (`github:owner/repo`, `owner/repo`, git/https URL) या npm पैकेज नाम।
- `refresh: true` कैश छोड़कर साक्ष्य पुनः एकत्र करता है।
- `background: true` एक `score-batch` कार्य शुरू करता है।

### `/score <targets...>`

एक पृष्ठभूमि बैच कार्य शुरू करता है; अंतिम पंक्ति `score_report` के लिए लीडरबोर्ड id बताती है।

### `score_report(id?)`

एक कार्ड (`sc_...`), लीडरबोर्ड (`lb_...`), या बिना id के नवीनतम लीडरबोर्ड लौटाता है।

### `score_badge(target? | id?, refresh?)`

एक लक्ष्य के लिए README बैज और पाँच-आयामी JSON उत्पन्न करता है:

- `target` — कैश के माध्यम से GitHub रिपॉज़िटरी या npm पैकेज स्कोर कर बैज देता है; `id` के साथ परस्पर अनन्य।
- `id` — बिना पुनः स्कोर किए संग्रहीत स्कोर कार्ड (`sc_...`) का बैज।
- `refresh: true` — स्कोर कैश छोड़ता है (केवल `target` पर लागू)।

बैज (SVG + endpoint + Markdown एम्बेड) और पाँच-आयामी JSON लौटाता है — नीचे «बैज और JSON API» देखें।

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

स्कोरिंग: कुल साक्ष्य जुटाने वाले आयामों का भारित औसत है (no-evidence आयाम बाहर रहते हैं और पुनः सामान्य होते हैं); `A` ≥ 90, `B` ≥ 75, `C` ≥ 60, `D` ≥ 40, अन्यथा `F`, और `N/A` जब कुछ भी साक्ष्य न हो।

## बैज और JSON API

`score_badge` एक अंकित लक्ष्य के लिए README में एम्बेड करने योग्य बैज और पाँच-आयामी JSON उत्पन्न करता है।

### बैज

तीन रूप, सभी उसी settled स्कोर कार्ड से व्युत्पन्न:

- **Endpoint** — दस्तावेज़ित [shields.io](https://shields.io) स्थिर URL, README छवि के लिए पेस्ट-तैयार (शून्य self-hosting)।
- **SVG** — self-contained shields.io फ्लैट-शैली SVG (`badge.svg` फ़ील्ड / `renderScoreBadge`) ऑफ़लाइन या self-hosted README के लिए।
- **Markdown** — दोनों को मिलाने वाला एम्बेड स्निपेट।

कुल बैज एम्बेड करें:

```markdown
![dsh-score: B · 84/100](https://img.shields.io/badge/dsh--score-B_%C2%B7_84%2F100-green)
```

### पाँच-आयामी JSON

वही कॉल compact JSON API लिफ़ाफ़ा लौटाता है (`schema: "dsh-score/badge/v1"`):

```json
{
  "schema": "dsh-score/badge/v1",
  "target": { "kind": "repo", "spec": "github:owner/dsh-click#abc123" },
  "scoredAt": "2026-08-16T00:00:00.000Z",
  "total": 84,
  "grade": "B",
  "dimensions": {
    "install":      { "label": "install", "status": "no-evidence", "score": 0,  "weight": 25, "summary": "no dsh-test-drive result recorded" },
    "maintenance":  { "label": "maintenance", "status": "pass", "score": 90, "weight": 20, "summary": "active (0 open issues)" },
    "documentation": { "label": "docs", "status": "pass", "score": 85, "weight": 20, "summary": "README + CHANGELOG + SECURITY" },
    "security":     { "label": "security", "status": "warn", "score": 60, "weight": 20, "summary": "permissive license" },
    "compliance":   { "label": "compliance", "status": "pass", "score": 100, "weight": 15, "summary": "dsh.bundle.patch + dsh-plugin topic" }
  }
}
```

`no-evidence` आयाम अपनी ईमानदार स्थिति और 0 स्कोर बनाए रखता है — बैज और JSON कभी संख्या नहीं गढ़ते।

## अनुमतियाँ और डेटा

- केवल सार्वजनिक सेवाएँ: `ctx.subprocess`, `ctx.jobs`, `ctx.storageDomain`, `ctx.tools`, `ctx.commands`।
- कार्ड और लीडरबोर्ड `score` डोमेन में संग्रहीत होते हैं (टेबल `scores`, `leaderboards`; नवीनतम-लीडरबोर्ड पॉइंटर)। बिना `storageDomain` के टूल चलते रहते हैं और स्थायित्व कारण सहित अक्षम होता है। प्रकाशित `dsh-base` बंडल `0.1.2-rc.1` से ही storage-domain माउंट करता है (`0.1.2-rc.1` और `0.1.5-alpha.1` tarballs से सत्यापित), इसलिए प्रकाशित लाइन पर स्थायित्व सक्रिय है।
- चाइल्ड प्रोसेस क्रेडेंशियल-रहित वातावरण पाते हैं; `gh` अपना स्वयं का भंडार उपयोग करता है। कोई वातावरण मान लॉग नहीं होता।

## सुरक्षा सीमाएँ

- **कोई कोड निष्पादन नहीं।** केवल `gh api` और `npm view` चलते हैं।
- **केवल-argv सबप्रोसेस।** कभी शेल नहीं; owner/repo खंड उपयोग से पहले सत्यापित होते हैं।
- **साक्ष्य अनुशासन।** विफल प्रोब `no-evidence` देता है, कभी नंबर नहीं।
- **पहचान बनाम सैनिटाइज़ेशन।** गोपनीयता और दुर्भावनापूर्ण स्क्रिप्ट पहचान सैनिटाइज़ेशन की ही शुद्ध regex साझा करती है।

## ज्ञात सीमाएँ

- रिपॉज़िटरी प्रोब के लिए प्रमाणित `gh` और नेटवर्क चाहिए; npm प्रोब के लिए `npm` और registry पहुँच चाहिए।
- बिना समाधान योग्य GitHub रिपॉज़िटरी के, दस्तावेज़ीकरण/सुरक्षा/अनुपालन `no-evidence` रिपोर्ट करते हैं।
- इंस्टॉल सफलता लक्ष्य रिकॉर्ड किए गए `dsh-test-drive` के माउंट होने पर निर्भर करती है।
- «issue प्रतिक्रिया» एक प्रॉक्सी है (सबसे पुराने खुले issue की आयु)।
- परिणाम प्रति लक्ष्य कैश होते हैं; पुनः स्कोर के लिए `refresh: true` उपयोग करें।

## विकास

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm test
pnpm run build && pnpm run verify:self-contained && pnpm run verify:artifacts && pnpm pack
```

## विषय

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `plugin-scoring`, `quality-score`, `leaderboard`, `supply-chain`

## योगदानकर्ता

[PerryLink](https://github.com/PerryLink) — डिज़ाइन और कार्यान्वयन।

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


### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।

## लाइसेंस

[Apache-2.0](LICENSE)
