#!/usr/bin/env python3
"""README visuals for dsh-score, read off the pipeline this repo ships.

Outputs (idempotent overwrite, docs/assets/):

  dsh-score-hero-{zh,en}-{light,dark}.webp    1440x576 raster (Pillow)
  dsh-score-flow-v5-{light,dark}.svg          1100x660 hand-written SVG

Where the content comes from
---------------------------
Nothing here is invented. The sample score card is the one this repository
documents in README.md (the "评分卡样例" section), and the arithmetic is the
one src/result.ts implements:

  src/result.ts        DIMENSIONS = install, maintenance, documentation,
                       security, compliance; EvidenceLink = source + detail +
                       observedAt; computeTotal() skips `no-evidence` rows and
                       divides by the weights of the dimensions that DID have
                       evidence; gradeOf() = A>=90 / B>=75 / C>=60 / D>=40 /
                       else F, `N/A` when nothing had evidence.
  src/config.ts        DEFAULT_WEIGHTS = 25/20/20/20/15 (sum 100).
  src/probe.ts         probeRepo() makes exactly seven `gh api` reads:
                       repos/{o}/{r}, .../commits?per_page=1, .../contents,
                       .../contents/package.json, .../contents/cordis.patch.yml,
                       .../contents/README.md, .../issues?state=open...
                       probeNpm() makes one `npm view <pkg> --json` read and
                       follows repository.url back into probeRepo().
  src/score.ts         readTestDriveEvidence() reads the ALREADY-OPEN
                       `test_drive` domain for the install row; absent ->
                       `no-evidence` (reserved, never hard-required).
  src/batch.ts         /score -> ctx.jobs `score-batch` -> leaderboard `lb_...`
                       row per target (JSON + Markdown).

Hero (1440x576, zh/en x light/dark)
    Left column: kicker / wordmark / two value lines / two-line subtitle /
    one meta line / footer. Right side: the artifact this plugin returns - a
    real sample score card: five dimension rows with their weight, score bar
    and status, the install row hollow because it is `no-evidence`, the grade
    stamp `B`, and the total formula that excludes that row from the divisor.

Flow (1100x660, one language-neutral pair for all five READMEs)
    Grammar: a SCORECARD BENCH WITH WEIGHT-PROPORTIONAL COLUMNS - not a row of
    arrowed nodes. Four intake cards up top (target, gh api, npm view, and the
    reserved test-drive slot) feed one evidence[] strip. Beneath it sit
    five columns whose WIDTH IS THE WEIGHT (25/20/20/20/15 of the bench), each
    carrying its status, score, evidence note and weighted product. The
    install column is hollow and dashed (= no-evidence). A denominator rail
    below shows the full 100 split into counted vs dropped weight; the total
    plate turns 6615 / 75 into 88 and grade B. Three output cards close the
    figure: sc_ score card, lb_ leaderboard, score_badge.

Typography / palette (GitHub renders the 1440px hero at ~880px)
    Hero: title 84px (displayed 51 > 48), subtitle 25px (displayed 15.3 > 15),
    meta 20px (displayed 12.2 > 12). Flow: node text 13.5px, annotations
    11px. Light #f9f6fd -> #e4eaf8, dark #131a2a -> #0c1016, family accent
    #4B67B4 / #8496f5, radii 18-22, soft shadows. Fonts: msyh.ttc / msyhbd.ttc
    / consola.ttf / consolab.ttf.

Every label is measured before it is drawn; a label that would overflow its
box aborts the run instead of shipping clipped text.

Run once:  python scripts/gen-readme-assets.py
Requires:  Python 3.10+, Pillow, and the Windows fonts above.
"""
from __future__ import annotations

import os
import sys
from html import escape

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

HERO_W, HERO_H = 1440, 576
FLOW_W, FLOW_H = 1100, 660
SS = 2                                   # hero drawn at 2x then downsampled

FONT_FILES = {
    "sans": r"C:\Windows\Fonts\msyh.ttc",
    "sans_bold": r"C:\Windows\Fonts\msyhbd.ttc",
    "mono": r"C:\Windows\Fonts\consola.ttf",
    "mono_bold": r"C:\Windows\Fonts\consolab.ttf",
}
for _kind, _path in FONT_FILES.items():
    if not os.path.exists(_path):
        raise SystemExit(f"FATAL: font missing: {_path}")

CSS_SANS = ("'Microsoft YaHei','PingFang SC','Noto Sans CJK SC',"
            "'Source Han Sans SC',sans-serif")
CSS_MONO = "'Consolas','SFMono-Regular','Menlo',ui-monospace,monospace"

# ---------------------------------------------------------------------------
# The score card this repository documents, and the arithmetic in result.ts
# ---------------------------------------------------------------------------
# README.md § 评分卡样例: install no-evidence, maintenance 100, documentation 70,
# security 100, compliance 81 -> 88/100, grade B, "healthy".
DIMENSIONS = [
    # key, weight, status, score, evidence-source note (zh / en), summary
    ("install", 25, "no-evidence", 0,
     ("test_drive 无记录", "test_drive: no record"),
     ("0 分 · 剔出分母", "0 · out of the divisor")),
    ("maintenance", 20, "pass", 100,
     ("gh-api · commits", "gh-api · commits"),
     ("active · 0 issues", "active · 0 issues")),
    ("documentation", 20, "warn", 70,
     ("gh-api · contents", "gh-api · contents"),
     ("1/4 语 + CHANGELOG", "1/4 langs + CHANGELOG")),
    ("security", 20, "pass", 100,
     ("gh-api · license", "gh-api · license"),
     ("文本扫描 · 无密钥", "text scan · no secrets")),
    ("compliance", 15, "pass", 81,
     ("file-content", "file-content"),
     ("bundle.patch ✓", "bundle.patch ✓")),
]

EVIDENCED = [d for d in DIMENSIONS if d[2] != "no-evidence"]
TOTAL_WEIGHT = sum(d[1] for d in EVIDENCED)                 # 75
WEIGHTED_SUM = sum(d[3] * d[1] for d in EVIDENCED)          # 6615
if TOTAL_WEIGHT != 75 or WEIGHTED_SUM != 6615:
    raise SystemExit("FATAL: sample card drifted from README.md")
TOTAL = round(WEIGHTED_SUM / TOTAL_WEIGHT)                  # 88
if TOTAL != 88:
    raise SystemExit(f"FATAL: total {TOTAL} != documented 88")


def grade_of(total: int, evidenced: bool) -> str:
    """Exactly src/result.ts gradeOf()."""
    if not evidenced:
        return "N/A"
    if total >= 90:
        return "A"
    if total >= 75:
        return "B"
    if total >= 60:
        return "C"
    if total >= 40:
        return "D"
    return "F"


GRADE = grade_of(TOTAL, bool(EVIDENCED))
if GRADE != "B":
    raise SystemExit(f"FATAL: grade {GRADE} != documented B")
if sum(d[1] for d in DIMENSIONS) != 100:
    raise SystemExit("FATAL: weights do not sum to 100")

SKIN = {
    "light": dict(
        bg_a="#f9f6fd", bg_b="#e4eaf8", card="#ffffff", edge="#e6e2ef",
        band="#f5f2fb", text="#141419", sub="#4d5261", faint="#8f94a4",
        accent="#4B67B4", good="#16a34a", warn="#b45309", warn_bg="#fdf3e9",
        good_bg="#edf7f0", pill="#ece7f9", grid="#e7e4f0", rule="#dcd8ea",
        hollow="#b4bbcf", shadow=(30, 24, 60), shadow_alpha=26,
        glow_a=(75, 103, 180, 22), glow_b=(122, 104, 201, 10),
    ),
    "dark": dict(
        bg_a="#131a2a", bg_b="#0c1016", card="#1b2231", edge="#2e374b",
        band="#202839", text="#f0f3f9", sub="#a8b1c4", faint="#737b8d",
        accent="#8496f5", good="#3fb950", warn="#d9a441", warn_bg="#2a2216",
        good_bg="#16271d", pill="#242d42", grid="#262f42", rule="#2b3348",
        hollow="#5b6478", shadow=(0, 0, 0), shadow_alpha=90,
        glow_a=(132, 150, 245, 34), glow_b=(132, 150, 245, 14),
    ),
}

STATUS_COLOR = {
    "light": {"pass": "#16a34a", "warn": "#b45309", "no-evidence": "#8f94a4"},
    "dark": {"pass": "#3fb950", "warn": "#d9a441", "no-evidence": "#737b8d"},
}

# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------
_HX: dict[str, tuple[int, int, int]] = {}


def hx(value: str) -> tuple[int, int, int]:
    hit = _HX.get(value)
    if hit is None:
        v = value.lstrip("#")
        hit = (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
        _HX[value] = hit
    return hit


_SCRATCH = ImageDraw.Draw(Image.new("RGB", (8, 8)))
_MEASURE_FONT: dict[tuple[int, str], ImageFont.FreeTypeFont] = {}
_DRAW_FONT: dict[tuple[int, str], ImageFont.FreeTypeFont] = {}


def measure_font(size: float, kind: str) -> ImageFont.FreeTypeFont:
    key = (int(round(size * 10)), kind)
    f = _MEASURE_FONT.get(key)
    if f is None:
        f = ImageFont.truetype(FONT_FILES[kind], max(1, int(round(size))))
        _MEASURE_FONT[key] = f
    return f


def draw_font(size: float, kind: str) -> ImageFont.FreeTypeFont:
    dev = max(1, int(round(size * SS)))
    key = (dev, kind)
    f = _DRAW_FONT.get(key)
    if f is None:
        f = ImageFont.truetype(FONT_FILES[kind], dev)
        _DRAW_FONT[key] = f
    return f


def tw(text: str, size: float, kind: str) -> float:
    return _SCRATCH.textlength(text, font=measure_font(size, kind))


def require(text: str, size: float, kind: str, max_w: float, what: str) -> None:
    w = tw(text, size, kind)
    if w > max_w + 0.6:
        raise SystemExit(f"FATAL: {what} overflows: {text!r} needs "
                         f"{w:.1f}px > {max_w:.1f}px")


def fit(text: str, kind: str, max_w: float, start: float, floor: float) -> float:
    size = start
    while size > floor:
        if tw(text, size, kind) <= max_w:
            return size
        size -= 1
    require(text, size, kind, max_w, "text")
    return size


def fit_lines(lines: list[str], kind: str, max_w: float, start: float,
              floor: float) -> float:
    return min(fit(t, kind, max_w, start, floor) for t in lines)


def pick(content: str, mono_kind: str = "mono", sans_kind: str = "sans") -> str:
    """Latin tokens read better in mono; CJK must never go through Consolas."""
    return mono_kind if content.isascii() else sans_kind


def gradient(w: int, h: int, c1: str, c2: str) -> Image.Image:
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    a, b = hx(c1), hx(c2)
    for y in range(h):
        t = y / max(1, h - 1)
        t = 0.18 * t + 0.82 * t ** 1.3
        d.line([(0, y), (w, y)],
               fill=tuple(int(p + (q - p) * t) for p, q in zip(a, b)))
    return img


def glow(img: Image.Image, cx: float, cy: float, r: float,
         rgba: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(10, 0, -1):
        rr = r * i / 10 * SS
        d.ellipse([cx * SS - rr, cy * SS - rr, cx * SS + rr, cy * SS + rr],
                  fill=rgba[:3] + (int(rgba[3] * (1 - i / 11)),))
    layer = layer.filter(ImageFilter.GaussianBlur(26 * SS))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


class Layer:
    """Draws in 1440x576 design coordinates onto the 2x canvas."""

    def __init__(self, img: Image.Image):
        self.img = img
        self.d = ImageDraw.Draw(img)

    def rrect(self, box, radius: float, fill=None, outline=None,
              width: float = 1.0) -> None:
        self.d.rounded_rectangle(
            [box[0] * SS, box[1] * SS, box[2] * SS, box[3] * SS],
            radius=radius * SS, fill=hx(fill) if fill else None,
            outline=hx(outline) if outline else None,
            width=max(1, int(round(width * SS))))

    def line(self, x1, y1, x2, y2, color: str, width: float = 1.0) -> None:
        self.d.line([x1 * SS, y1 * SS, x2 * SS, y2 * SS], fill=hx(color),
                    width=max(1, int(round(width * SS))))

    def circle(self, cx, cy, r, fill: str, outline: str | None = None,
               width: float = 1.0) -> None:
        box = [(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS]
        self.d.ellipse(box, fill=hx(fill) if fill else None,
                       outline=hx(outline) if outline else None,
                       width=max(1, int(round(width * SS))))

    def text(self, x, y, content: str, size: float, kind: str, color: str,
             right: float | None = None) -> None:
        f = draw_font(size, kind)
        if right is not None:
            x = right - tw(content, size, kind)
        self.d.text((x * SS, y * SS), content, font=f, fill=hx(color))

    def ctext(self, cx, cy, content: str, size: float, kind: str,
              color: str) -> None:
        """Center a label on (cx, cy) using its text bbox (design coords)."""
        f = draw_font(size, kind)
        box = self.d.textbbox((0, 0), content, font=f)
        x = cx * SS - (box[2] - box[0]) / 2 - box[0]
        y = cy * SS - (box[3] - box[1]) / 2 - box[1]
        self.d.text((x, y), content, font=f, fill=hx(color))


def shadowed(img: Image.Image, box, radius: float, s: dict,
             blur: float = 15, dy: float = 9) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([box[0] * SS, (box[1] + dy) * SS,
                         box[2] * SS, (box[3] + dy) * SS],
                        radius=(radius + 2) * SS,
                        fill=s["shadow"] + (s["shadow_alpha"],))
    layer = layer.filter(ImageFilter.GaussianBlur(blur * SS / 2))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def card(img: Image.Image, box, s: dict, radius: float = 20) -> Image.Image:
    img = shadowed(img, box, radius, s)
    lay = Layer(img)
    lay.rrect(box, radius, fill=s["card"], outline=s["edge"], width=1.5)
    return img


# ---------------------------------------------------------------------------
# hero 1440x576
# ---------------------------------------------------------------------------
HERO = {
    "zh": dict(
        kicker="DeepSeek Harness 插件 · 五维质量评分器",
        title_a="dsh-", title_b="score",
        value=["五维评分，一张记分卡，", "每一分都挂在证据链接上。"],
        sub=["只调 gh api / npm view 采证；", "不安装、不构建、不执行被评对象。"],
        meta="Apache-2.0 · DSH ≥0.2.1 <0.3.0 · node ^22.19 || >=24.9",
        foot="github.com/PerryLink/dsh-score · 本地按需 · 只读采证",
        panel_label="评分卡",
        target="owner/repo",
        target_note="repo · sc_65e817eec8cd71ed",
        verdict="healthy · weighted total 88/100",
        total_label="加权总分",
        formula=["Σ(score×weight) = 6615", "÷ Σ(weight with evidence) = 75"],
        note="install 无证据：0 分，不计入分母",
        outputs="输出：sc_… · lb_… · badge",
        weight_prefix="权重 ",
    ),
    "en": dict(
        kicker="DeepSeek Harness plugin · quality scorer",
        title_a="dsh-", title_b="score",
        value=["Five dimensions, one scorecard,", "every point linked to evidence."],
        sub=["Only gh api / npm view evidence —", "never installs, builds, or runs the target."],
        meta="Apache-2.0 · DSH ≥0.2.1 <0.3.0 · node ^22.19 || >=24.9",
        foot="github.com/PerryLink/dsh-score · local, on demand · read-only probes",
        panel_label="SCORE CARD",
        target="owner/repo",
        target_note="repo · sc_65e817eec8cd71ed",
        verdict="healthy · weighted total 88/100",
        total_label="WEIGHTED TOTAL",
        formula=["Σ(score×weight) = 6615", "÷ Σ(weight with evidence) = 75"],
        note="install has no evidence: 0, out of the divisor",
        outputs="outputs: sc_… · lb_… · badge",
        weight_prefix="w",
    ),
}


def hero(lang: str, skin: str) -> None:
    s = SKIN[skin]
    st = STATUS_COLOR[skin]
    h = HERO[lang]

    img = gradient(HERO_W * SS, HERO_H * SS, s["bg_a"], s["bg_b"])
    img = glow(img, 1200, 10, 320, s["glow_a"])
    img = glow(img, 92, 574, 250, s["glow_b"])

    lay = Layer(img)
    m, col_w = 64, 690

    # ---- left column ------------------------------------------------------
    kick_w = tw(h["kicker"], 17, "sans_bold")
    lay.rrect((m, 58, m + kick_w + 46, 100), 21, fill=s["pill"])
    lay.text(m + 23, 67, h["kicker"], 17, "sans_bold", s["accent"])

    title_size = 84
    require("dsh-score", title_size, "mono_bold", col_w, "hero title")
    if title_size * 880 / HERO_W < 48:
        raise SystemExit("FATAL: hero title would display below 48px")
    lay.text(m - 2, 118, h["title_a"], title_size, "mono_bold", s["text"])
    lay.text(m - 2 + tw(h["title_a"], title_size, "mono_bold"), 118,
             h["title_b"], title_size, "mono_bold", s["accent"])

    vf = fit_lines(h["value"], "sans_bold", col_w, 40, 33)
    for i, line in enumerate(h["value"]):
        require(line, vf, "sans_bold", col_w, "hero value line")
        lay.text(m - 1, 244 + i * 56, line, vf, "sans_bold", s["text"])

    for i, line in enumerate(h["sub"]):
        require(line, 25, "sans", col_w, "hero subtitle")
        lay.text(m + 1, 366 + i * 36, line, 25, "sans", s["sub"])
    if 25 * 880 / HERO_W < 15:
        raise SystemExit("FATAL: hero subtitle would display below 15px")

    require(h["meta"], 20, "sans", col_w, "hero meta")
    if 20 * 880 / HERO_W < 12:
        raise SystemExit("FATAL: hero meta would display below 12px")
    lay.text(m + 1, 448, h["meta"], 20, "sans", s["faint"])

    lay.line(m + 1, 486, m + col_w - 6, 486, s["grid"], 2)
    require(h["foot"], 16, "sans", col_w, "hero footer")
    lay.text(m + 1, 498, h["foot"], 16, "sans", s["faint"])

    # ---- right: the sample score card ------------------------------------
    panel = (744, 36, 1376, 548)
    img = card(img, panel, s, radius=22)
    lay = Layer(img)
    left, right = 772, 1348

    lay.text(left, 56, h["panel_label"], 12, "sans_bold", s["accent"])
    lay.text(left + tw(h["panel_label"], 12, "sans_bold") + 8, 56,
             "dsh-score/v1", 12, "mono", s["faint"])
    lay.text(left, 80, h["target"], 17, "mono_bold", s["text"])
    require(h["target_note"], 11.5, "mono", 300, "hero target note")
    lay.text(left, 102, h["target_note"], 11.5, "mono", s["faint"])
    require(h["verdict"], 12, "sans", 300, "hero verdict")
    lay.text(left, 122, h["verdict"], 12, "sans", s["good"])

    # grade stamp
    stamp = (1252, 52, 1348, 144)
    lay.rrect(stamp, 18, fill=s["band"], outline=s["accent"], width=2)
    lay.ctext((stamp[0] + stamp[2]) / 2, 92, GRADE, 42, "mono_bold", s["accent"])
    lay.ctext((stamp[0] + stamp[2]) / 2, 127, "88 / 100", 12, "mono", s["sub"])

    # five rows
    rows_y = [186, 240, 294, 348, 402]
    bar_x0, bar_x1 = 1128, 1264
    chip_x0, chip_x1 = 928, 1012
    for (key, weight, status, score, _src, _note_), cy in zip(DIMENSIONS, rows_y):
        colour = st[status]
        lay.text(left, cy - 12, key, 16, "mono_bold", s["text"])
        # status chip
        chip_w = tw(status, 11, "mono") + 20
        cx0 = chip_x0
        cx1 = cx0 + max(58, chip_w)
        if status == "no-evidence":
            lay.rrect((cx0, cy - 11, cx1, cy + 11), 11, fill=None,
                      outline=s["hollow"], width=1.2)
        else:
            lay.rrect((cx0, cy - 11, cx1, cy + 11), 11, fill=s["band"])
            lay.circle(cx0 + 9, cy, 3, colour)
        lay.text(cx0 + (20 if status != "no-evidence" else 11), cy - 6.5,
                 status, 11, "mono", colour)
        # weight
        lay.text(1118, cy - 7, f"×{weight}", 11.5, "mono", s["faint"], right=1118)
        # bar
        if status == "no-evidence":
            lay.rrect((bar_x0, cy - 4.5, bar_x1, cy + 4.5), 4.5, fill=None,
                      outline=s["hollow"], width=1.3)
        else:
            lay.rrect((bar_x0, cy - 4.5, bar_x1, cy + 4.5), 4.5, fill=s["grid"])
            fill_w = (bar_x1 - bar_x0) * score / 100
            lay.rrect((bar_x0, cy - 4.5, bar_x0 + fill_w, cy + 4.5), 4.5,
                      fill=colour)
        lay.text(1348, cy - 9, str(score), 15, "mono_bold",
                 s["faint"] if status == "no-evidence" else s["text"],
                 right=1348)

    lay.line(left, 422, right, 422, s["grid"], 1.4)

    # total block
    lay.text(left, 424, h["total_label"], 11.5, "sans", s["faint"])
    lay.text(left - 2, 444, str(TOTAL), 42, "mono_bold", s["accent"])
    lay.text(left + 62, 468, "/ 100", 12, "mono", s["faint"])
    for i, line in enumerate(h["formula"]):
        require(line, 12, "mono", 430, "hero formula")
        lay.text(900, 462 + i * 22, line, 12, "mono", s["sub"])
    note_kind = pick(h["note"], "mono", "sans")
    require(h["note"], 11.5, note_kind, 440, "hero no-evidence note")
    lay.text(900, 506, h["note"], 11.5, note_kind, s["warn"])
    out_kind = pick(h["outputs"], "mono", "sans")
    require(h["outputs"], 11, out_kind, 300, "hero outputs")
    lay.text(left, 528, h["outputs"], 11, out_kind, s["faint"])

    name = f"dsh-score-hero-{lang}-{skin}.webp"
    out = img.resize((HERO_W, HERO_H), Image.LANCZOS)
    out.save(os.path.join(OUT, name), "WEBP", quality=92, method=6)
    print(f"wrote {name} ({HERO_W}x{HERO_H})")


# ---------------------------------------------------------------------------
# flow 1100x660 (hand-written SVG)
# ---------------------------------------------------------------------------
FLOW = {
    "light": dict(bg_a="#f9f6fd", bg_b="#e4eaf8", card="#ffffff",
                  edge="#e6e2ef", band="#f5f2fb", text="#141419",
                  sub="#4d5261", faint="#8f94a4", accent="#4B67B4",
                  good="#16a34a", warn="#b45309", warn_bg="#fdf3e9",
                  good_bg="#edf7f0", pill="#ece7f9", grid="#e7e4f0",
                  rule="#dcd8ea", hollow="#b4bbcf", shadow="0.10"),
    "dark": dict(bg_a="#131a2a", bg_b="#0c1016", card="#1b2231",
                 edge="#2e374b", band="#202839", text="#f0f3f9",
                 sub="#a8b1c4", faint="#737b8d", accent="#8496f5",
                 good="#3fb950", warn="#d9a441", warn_bg="#2a2216",
                 good_bg="#16271d", pill="#242d42", grid="#262f42",
                 rule="#2b3348", hollow="#5b6478", shadow="0.48"),
}


class Svg:
    """Tiny SVG writer that measures every label before emitting it."""

    def __init__(self) -> None:
        self.parts: list[str] = []
        self.problems: list[str] = []

    def add(self, markup: str) -> None:
        self.parts.append(markup)

    def text(self, x: float, y: float, content: str, size: float, fill: str,
             kind: str = "sans", anchor: str = "start",
             max_w: float | None = None, opacity: float | None = None) -> None:
        if max_w is not None:
            w = tw(content, size, kind)
            if w > max_w + 0.6:
                self.problems.append(
                    f"{content!r} needs {w:.1f}px > {max_w:.1f}px")
        family = CSS_MONO if kind.startswith("mono") else CSS_SANS
        attrs = [f'x="{x}"', f'y="{y}"', f'fill="{fill}"',
                 f'font-family="{family}"', f'font-size="{size}"']
        if anchor != "start":
            attrs.append(f'text-anchor="{anchor}"')
        if kind.endswith("_bold"):
            attrs.append('font-weight="700"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<text {" ".join(attrs)}>{escape(content)}</text>')

    def rect(self, x, y, w, h, fill, radius=0.0, stroke=None, sw=1.4,
             dash=None, shadow=False, opacity=None) -> None:
        attrs = [f'x="{x}"', f'y="{y}"', f'width="{w}"', f'height="{h}"']
        if radius:
            attrs.append(f'rx="{radius}"')
        attrs.append(f'fill="{fill}"')
        if stroke:
            attrs += [f'stroke="{stroke}"', f'stroke-width="{sw}"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        if shadow:
            attrs.append('filter="url(#soft)"')
        self.add(f'<rect {" ".join(attrs)}/>')

    def line(self, x1, y1, x2, y2, stroke, sw=1.4, dash=None,
             opacity=None) -> None:
        attrs = [f'x1="{x1}"', f'y1="{y1}"', f'x2="{x2}"', f'y2="{y2}"',
                 f'stroke="{stroke}"', f'stroke-width="{sw}"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<line {" ".join(attrs)}/>')

    def circle(self, cx, cy, r, fill) -> None:
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>')

    def svg(self, w: int, h: int, label: str) -> str:
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" '
                f'height="{h}" viewBox="0 0 {w} {h}" role="img" '
                f'aria-label="{escape(label, quote=True)}">')
        return "\n".join([head, *self.parts, "</svg>"]) + "\n"


# geometry (design px)
FLOW_M = 44
INTAKE_Y0, INTAKE_H = 112, 100
STRIP_Y0, STRIP_H = 224, 22
BENCH_X0, BENCH_X1 = 44, 820
BENCH_Y0, BENCH_Y1 = 258, 500
TOTAL_X0, TOTAL_X1 = 836, 1056
COL_X0, COL_W_TOTAL = 56, 752
COL_KEYS = ["install", "maintenance", "documentation", "security", "compliance"]
COL_W = [188, 150, 150, 150, 114]
if sum(COL_W) != COL_W_TOTAL:
    raise SystemExit("FATAL: column widths do not add up")
COL_BOUNDS = [COL_X0]
for w in COL_W:
    COL_BOUNDS.append(COL_BOUNDS[-1] + w)

FLOW_STATUS = {"pass": "good", "warn": "warn", "no-evidence": "hollow"}
FLOW_STATUS_TEXT = {"pass": "pass", "warn": "warn", "no-evidence": "no-evidence"}


def flow_svg(skin: str) -> str:
    s = FLOW[skin]
    v = Svg()

    v.add("<defs>")
    v.add(f'<linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1">'
          f'<stop offset="0" stop-color="{s["bg_a"]}"/>'
          f'<stop offset="1" stop-color="{s["bg_b"]}"/></linearGradient>')
    v.add(f'<filter id="soft" x="-25%" y="-25%" width="150%" height="165%">'
          f'<feDropShadow dx="0" dy="7" stdDeviation="8" '
          f'flood-color="#16122c" flood-opacity="{s["shadow"]}"/></filter>')
    v.add("</defs>")
    v.add(f'<rect width="{FLOW_W}" height="{FLOW_H}" fill="url(#bg)"/>')

    # ---- header ----------------------------------------------------------
    v.text(FLOW_M, 58, "dsh-score", 28, s["text"], "mono_bold")
    v.text(FLOW_M, 84,
           "给一个目标记一张五维记分卡：只采证、按权重算，缺证据的行剔出分母。",
           15, s["sub"], "sans", max_w=720)
    chip = "dsh-score/v1 · 列宽 = 权重"
    chip_w = tw(chip, 12, "sans") + 24
    v.rect(FLOW_W - FLOW_M - chip_w, 38, chip_w, 26, s["band"], radius=13,
           stroke=s["edge"], sw=1.2)
    v.text(FLOW_W - FLOW_M - chip_w + 12, 57, chip, 12, s["accent"], "sans")

    # ---- intake cards ----------------------------------------------------
    for x0, w in [(FLOW_M, 214), (270, 300), (582, 250), (844, 212)]:
        v.rect(x0, INTAKE_Y0, w, INTAKE_H, s["card"], radius=18,
               stroke=s["edge"], sw=1.4, shadow=True)
    v.text(FLOW_M + 14, 130, "target", 11.5, s["accent"], "sans_bold")
    v.text(FLOW_M + 14, 154, "owner/repo", 13, s["text"], "mono_bold",
           max_w=186)
    v.text(FLOW_M + 14, 174, "npm: pkg-name", 11, s["sub"], "mono", max_w=186)
    v.text(FLOW_M + 14, 194, "classify → repo | npm", 11, s["faint"], "mono",
           max_w=186)

    v.text(284, 130, "gh api · 7 次只读", 11.5, s["accent"], "sans_bold")
    for i, line in enumerate([
            "repos/{o}/{r} · commits?per_page=1",
            "contents · package.json",
            "cordis.patch.yml · README.md",
            "issues?state=open&per_page=1"]):
        v.text(284, 150 + i * 17, line, 11, s["sub"], "mono", max_w=272)

    v.text(596, 130, "npm view <pkg> --json", 11.5, s["accent"], "mono_bold",
           max_w=226)
    v.text(596, 152, "name · version · license · keywords", 11, s["sub"],
           "mono", max_w=226)
    v.text(596, 169, "time.modified · repository.url", 11, s["sub"], "mono",
           max_w=226)
    v.text(596, 186, "→ repository.url 再走左边 gh api", 11, s["faint"], "sans",
           max_w=226)

    # test_drive card: dashed border to mark the reserved channel
    v.rect(844, INTAKE_Y0, 212, INTAKE_H, s["band"], radius=18,
           stroke=s["accent"], sw=1.4, dash="5 4", shadow=True)
    v.text(858, 130, "test_drive · 预留", 11.5, s["accent"], "sans_bold")
    v.text(858, 152, "get('test_drive')", 11, s["sub"], "mono", max_w=188)
    v.text(858, 169, "runs · 最新 dsh-test-drive/v1", 11, s["sub"], "sans",
           max_w=188)
    v.text(858, 186, "缺失 → no-evidence", 11, s["faint"], "sans", max_w=188)

    # ---- evidence strip --------------------------------------------------
    v.rect(FLOW_M, STRIP_Y0, FLOW_W - 2 * FLOW_M, STRIP_H, s["band"], radius=11)
    v.text(FLOW_M + 14, 239,
           "evidence[] · source + detail + observedAt：每条结论都必须挂一条",
           11, s["sub"], "sans", max_w=720)
    v.text(FLOW_W - FLOW_M - 14, 239, "失败/空结果也记一条", 11, s["faint"],
           "sans", anchor="end")

    # ---- bench -----------------------------------------------------------
    v.rect(BENCH_X0, BENCH_Y0, BENCH_X1 - BENCH_X0, BENCH_Y1 - BENCH_Y0,
           s["card"], radius=18, stroke=s["edge"], sw=1.4, shadow=True)
    v.text(BENCH_X0 + 16, 276, "五维记分台", 11, s["accent"], "sans_bold")
    v.text(BENCH_X1 - 16, 276, "列宽 = 权重 · 每列 0-100", 11, s["faint"],
           "sans", anchor="end")
    for i, key in enumerate(COL_KEYS):
        if i == 0:
            continue
        v.line(COL_BOUNDS[i], 284, COL_BOUNDS[i], 460, s["rule"], 1.2)

    for i, (key, weight, status, score, src, note) in enumerate(DIMENSIONS):
        x0, w = COL_BOUNDS[i], COL_W[i]
        colour = s[FLOW_STATUS[status]]
        if status == "no-evidence":
            v.rect(x0 + 4, 284, w - 8, 176, s["band"], radius=12,
                   stroke=s["hollow"], sw=1.3, dash="5 4")
        v.text(x0 + 12, 300, f"×{weight}", 11, s["accent"], "mono_bold",
               max_w=w - 24)
        v.text(x0 + 12, 322, key, 13.5, s["text"], "mono_bold", max_w=w - 20)
        # status chip
        label = FLOW_STATUS_TEXT[status]
        chip_w = tw(label, 11, "mono") + 20
        cy0 = 336
        if status == "no-evidence":
            v.rect(x0 + 12, cy0, chip_w, 18, "none", radius=9,
                   stroke=s["hollow"], sw=1.2)
            v.text(x0 + 22, cy0 + 13, label, 11, colour, "mono")
        else:
            v.rect(x0 + 12, cy0, chip_w, 18, s["band"], radius=9)
            v.circle(x0 + 21, cy0 + 9, 3, colour)
            v.text(x0 + 29, cy0 + 13, label, 11, colour, "mono")
        # score
        v.text(x0 + 12, 398, str(score), 30, s["text"] if status != "no-evidence"
               else s["faint"], "mono_bold")
        v.text(x0 + 12 + tw(str(score), 30, "mono_bold") + 6, 398, "/100", 11,
               s["faint"], "mono")
        # evidence notes (one shared zh image across all five READMEs)
        v.text(x0 + 12, 422, src[0], 11, s["sub"], "sans", max_w=w - 20)
        v.text(x0 + 12, 438, note[0], 11, s["faint"], "sans", max_w=w - 20)
        # weighted product
        if status == "no-evidence":
            wtxt, wtxt_kind = "×25 → 剔除", "sans"
        else:
            wtxt, wtxt_kind = f"×{weight} → {score * weight}", "mono"
        v.text(x0 + 12, 450, wtxt, 11, s["faint"], wtxt_kind, max_w=w - 20)

    # denominator rail
    v.line(COL_X0, 464, COL_X0 + COL_W_TOTAL, 464, s["grid"], 1.2)
    v.text(COL_X0, 478, "分母轨 · 只加有证据的权重", 11, s["faint"], "sans")
    v.text(COL_X0 + COL_W_TOTAL, 478, "Σw 有效 75 / 100", 11, s["accent"],
           "sans", anchor="end")
    for i, (key, weight, status, score, src, note) in enumerate(DIMENSIONS):
        x0, w = COL_BOUNDS[i], COL_W[i]
        track_y = 486
        if status == "no-evidence":
            v.rect(x0, track_y, w - 4, 8, "none", radius=4,
                   stroke=s["hollow"], sw=1.2, dash="4 3")
        else:
            v.rect(x0, track_y, w - 4, 8, s["accent"], radius=4, opacity=0.85)

    # ---- total plate -----------------------------------------------------
    v.rect(TOTAL_X0, BENCH_Y0, TOTAL_X1 - TOTAL_X0, BENCH_Y1 - BENCH_Y0,
           s["card"], radius=18, stroke=s["edge"], sw=1.4, shadow=True)
    v.text(TOTAL_X0 + 16, 282, "WEIGHTED TOTAL", 11, s["faint"], "mono")
    v.text(TOTAL_X0 + 14, 326, str(TOTAL), 44, s["accent"], "mono_bold")
    v.text(TOTAL_X0 + 14 + tw(str(TOTAL), 44, "mono_bold") + 8, 326, "/100",
           12, s["faint"], "mono")
    # grade stamp
    v.rect(TOTAL_X1 - 70, 292, 54, 54, s["band"], radius=14,
           stroke=s["accent"], sw=1.8)
    v.text(TOTAL_X1 - 43, 330, GRADE, 28, s["accent"], "mono_bold",
           anchor="middle")
    v.line(TOTAL_X0 + 16, 362, TOTAL_X1 - 16, 362, s["grid"], 1.2)
    v.text(TOTAL_X0 + 16, 384, "Σ(score×weight) = 6615", 11, s["sub"], "mono",
           max_w=188)
    v.text(TOTAL_X0 + 16, 402, "÷ Σw(有效) = 75", 11, s["sub"], "sans",
           max_w=188)
    v.text(TOTAL_X0 + 16, 420, "= 88 · grade B", 11, s["accent"], "mono",
           max_w=188)
    v.text(TOTAL_X0 + 16, 444, "healthy · weighted total 88/100", 11, s["good"],
           "sans", max_w=192)
    v.text(TOTAL_X0 + 16, 464, "install 剔除 · 4/5 维计分", 11, s["warn"],
           "sans", max_w=192)
    v.text(TOTAL_X0 + 16, 486, "A≥90 B≥75 C≥60 D≥40 F", 11, s["faint"], "mono",
           max_w=192)

    # ---- outputs ---------------------------------------------------------
    outs = [
        (FLOW_M, 316, "sc_… 评分卡", ["scores 表 · 默认缓存 24h",
                                     "refresh: true 绕过缓存"]),
        (372, 344, "lb_… 排行榜", ["score-batch · 默认串行",
                                  "JSON + Markdown 快照"]),
        (728, 328, "score_badge", ["shields.io 徽章",
                                  "endpoint / SVG / Markdown"]),
    ]
    for x0, w, title, lines in outs:
        v.rect(x0, 516, w, 84, s["card"], radius=18, stroke=s["edge"], sw=1.4,
               shadow=True)
        title_kind = "mono_bold" if title.isascii() else "sans_bold"
        v.text(x0 + 16, 540, title, 11.5, s["accent"], title_kind,
               max_w=w - 32)
        for i, line in enumerate(lines):
            v.text(x0 + 16, 562 + i * 18, line, 11, s["sub"], "sans",
                   max_w=w - 32)

    v.text(FLOW_M, 632,
           "只读采证：gh api / npm view（argv-only，不经 shell）· "
           "不安装、不构建、不执行 · 权重与阈值可配",
           11, s["faint"], "sans", max_w=760)
    v.text(FLOW_W - FLOW_M, 632,
           "cacheMaxAgeMs · staleCommitWarnDays · weights", 11, s["faint"],
           "mono", anchor="end")

    if v.problems:
        raise SystemExit("FATAL: flow labels overflow:\n  " +
                         "\n  ".join(v.problems))

    label = ("dsh-score 结构图：上方 target 分类后进入三条采证入口（gh api 七次只读调用、"
             "npm view --json、预留的 test_drive 域）汇入 evidence[]；中间是"
             "权重刻度的五维记分台，列宽即权重（25/20/20/20/15），install 因无"
             "证据记 0 分并剔出分母；底部权重轨显示满 100 有效 75，右侧 "
             "total = 6615 ÷ 75 = 88、等第 B；最下三个出口：sc_ 评分卡、"
             "lb_ 排行榜、score_badge。")
    return v.svg(FLOW_W, FLOW_H, label)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for lang in ("zh", "en"):
        for skin in ("light", "dark"):
            hero(lang, skin)
    for skin in ("light", "dark"):
        path = os.path.join(OUT, f"dsh-score-flow-v5-{skin}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
        print(f"wrote dsh-score-flow-v5-{skin}.svg ({FLOW_W}x{FLOW_H})")


if __name__ == "__main__":
    main()
