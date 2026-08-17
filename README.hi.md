<div align="center">

# 🏆 dsh-score

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
| DeepSeek Harness | `0.1.0-rc.6` (peer निर्भरताएँ पिन) |
| Node.js | `^22.19.0 \|\| >=24.0.0` |
| पैकेज प्रबंधक | `pnpm@11.7.0` |
| प्लेटफ़ॉर्म | Windows / macOS / Linux (केवल-होस्ट प्लगइन) |
| बाहरी उपकरण | PATH पर `gh` CLI (प्रमाणित), PATH पर `npm` CLI |

## आपको क्या मिलता है

- `score` टूल — पाँच-आयामी पाइपलाइन के माध्यम से एक लक्ष्य; संरचित रिस्क कार्ड लौटाता है, या `background: true` के साथ `{ kind: 'background', jobId }`।
- `/score` कमांड — `ctx.jobs` पर `score-batch` पृष्ठभूमि कार्य के रूप में स्पेस/कॉमा से अलग लक्ष्य सूची की बैच स्कोरिंग, लीडरबोर्ड स्नैपशॉट (JSON + Markdown) बनाता है।
- `score_report` टूल — कोई संग्रहीत स्कोर कार्ड (`sc_...`), लीडरबोर्ड (`lb_...`), या नवीनतम लीडरबोर्ड लाता है।
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

- `target` — GitHub रिपॉजिटरी (`github:owner/repo`, `owner/repo`, git/https URL) या npm पैकेज नाम।
- `refresh: true` कैश छोड़कर साक्ष्य पुनः एकत्र करता है।
- `background: true` एक `score-batch` कार्य शुरू करता है।

### `/score <targets...>`

एक पृष्ठभूमि बैच कार्य शुरू करता है; अंतिम पंक्ति `score_report` के लिए लीडरबोर्ड id बताती है।

### `score_report(id?)`

एक कार्ड (`sc_...`), लीडरबोर्ड (`lb_...`), या बिना id के नवीनतम लीडरबोर्ड लौटाता है।

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

- रिपॉजिटरी प्रोब के लिए प्रमाणित `gh` और नेटवर्क चाहिए; npm प्रोब के लिए `npm` और registry पहुँच चाहिए।
- बिना समाधान योग्य GitHub रिपॉजिटरी के, दस्तावेज़ीकरण/सुरक्षा/अनुपालन `no-evidence` रिपोर्ट करते हैं।
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

## लाइसेंस

[Apache-2.0](LICENSE)
