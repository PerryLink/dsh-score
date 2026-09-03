<div align="center">

# 🏆 dsh-score
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-score` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness प्लगइन के लिए बहु-आयामी गुणवत्ता स्कोरिंग।**

*पाँच आयाम, वास्तविक `gh`/`npm` साक्ष्य, एक भारित रिस्क कार्ड और लीडरबोर्ड।*

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

## संगतता

| घटक | संस्करण |
|---|---|
| DeepSeek Harness | `0.1.2-alpha.5` (peer निर्भरताएँ `>=0.1.0-rc.8 <0.2.0`) (2026-09-02 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है। |
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
- कार्ड और लीडरबोर्ड `score` डोमेन में संग्रहीत होते हैं (टेबल `scores`, `leaderboards`; नवीनतम-लीडरबोर्ड पॉइंटर)। बिना `storageDomain` के टूल चलते रहते हैं और स्थायित्व कारण सहित अक्षम होता है।
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

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [33 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | अनुमोदन श्रृंखला पर द्वितीय-मॉडल स्वतः-समीक्षा, डिफ़ॉल्ट रूप से विफल-बंद | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | वेब UI साइडबार, संदेश और अवरोधन के साथ टिकाऊ पृष्ठभूमि चाइल्ड एजेंट | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फ़ॉर्क, एक-बार पुनर्स्थापना | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Claude Code सत्र, मेमोरी, कौशल और CLAUDE.md को DSH में स्थानांतरित करें | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | वेब कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | इंजीनियरिंग-अनुशासन रक्षक: आवश्यकताओं की पूछताछ, परीक्षण द्वार, प्रतिद्वंद्वी समीक्षा | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | DeepSeek Harness के लिए रीड-ओनली प्रदर्शन डायग्नोस्टिक्स। | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | चीनी सार्वजनिक म्यूचुअल फंड के लिए नियतात्मक अनुसंधान रिपोर्ट | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII मास्किंग मिडलवेयर: मॉडल सीमा पर अनाम करें, डिस्प्ले लेयर पर पुनर्स्थापित करें | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | केवल-पढ़ने वाला MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला Settings टैब | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | अनुमोदन-द्वारित क्रॉस-सत्र मेमोरी: ctx.memory सीम + SQLite + मेमोरी टूल | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-समतुल्य रनटाइम शैली बदलाव | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | ऑडिट के साथ Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | माँग पर एजेंट कौशल के रूप में प्लगइन-विकास ज्ञान आधार | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | सामग्री-पता साक्ष्य और सीलबंद संस्करणों वाला सत्यापन-योग्य अनुसंधान-रिपोर्ट इंजन | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | टिकाऊ क्रम के साथ वेब साइडबार में सत्र पिन करें | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | सुरक्षा-ऑडिट कौशल पैक: गुप्त स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। | |

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।

## लाइसेंस

[Apache-2.0](LICENSE)
