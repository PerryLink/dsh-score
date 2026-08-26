/**
 * Embeddable README badges and the five-dimension JSON API output. Pure,
 * zero-dependency functions over a settled {@link ScoreResult}: a shields.io
 * flat-style SVG generator (offline/self-hosted), a documented shields.io
 * endpoint URL, one badge for the weighted total plus one per dimension, and a
 * compact five-dimension JSON envelope for API consumers.
 *
 * Every output derives from an already-settled score card — a dimension with no
 * evidence renders `no-evidence` (grey, score 0) exactly as the card reports it;
 * nothing here fabricates a number.
 *
 * @module dsh-score/badge
 */

import { DIMENSIONS } from './result.ts'
import type { Dimension, DimensionStatus, ScoreResult } from './result.ts'

/** Discriminator of the badge JSON envelope (version 1). */
export const BADGE_SCHEMA = 'dsh-score/badge/v1' as const

/** shields.io flat-badge hex colors, keyed by their named endpoints. */
const SHIELDS_HEX = {
  brightgreen: '#4c1',
  green: '#97ca00',
  yellow: '#dfb317',
  orange: '#fe7d37',
  red: '#e05d44',
  blue: '#007ec6',
  lightgrey: '#9f9f9f',
} as const

/** Type of one shields.io named color. */
type ShieldColor = keyof typeof SHIELDS_HEX

/** Compact human labels for the five dimensions (kept short for badge width). */
export const DIMENSION_BADGE_LABELS: Record<Dimension, string> = {
  install: 'install',
  maintenance: 'maintenance',
  documentation: 'docs',
  security: 'security',
  compliance: 'compliance',
}

/** shields.io badge color (hex) for a letter grade; grey for `N/A`. */
export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return SHIELDS_HEX.brightgreen
    case 'B': return SHIELDS_HEX.green
    case 'C': return SHIELDS_HEX.yellow
    case 'D': return SHIELDS_HEX.orange
    case 'F': return SHIELDS_HEX.red
    default: return SHIELDS_HEX.lightgrey
  }
}

/** shields.io badge color (hex) for a dimension status. */
export function statusColor(status: DimensionStatus): string {
  switch (status) {
    case 'pass': return SHIELDS_HEX.brightgreen
    case 'warn': return SHIELDS_HEX.orange
    case 'fail': return SHIELDS_HEX.red
    default: return SHIELDS_HEX.lightgrey
  }
}

/** shields.io endpoint color name for a letter grade. */
function gradeColorName(grade: string): ShieldColor {
  switch (grade) {
    case 'A': return 'brightgreen'
    case 'B': return 'green'
    case 'C': return 'yellow'
    case 'D': return 'orange'
    case 'F': return 'red'
    default: return 'lightgrey'
  }
}

/** shields.io endpoint color name for a dimension status. */
function statusColorName(status: DimensionStatus): ShieldColor {
  switch (status) {
    case 'pass': return 'brightgreen'
    case 'warn': return 'orange'
    case 'fail': return 'red'
    default: return 'lightgrey'
  }
}

/** Escape text for safe SVG content interpolation. */
function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/**
 * Render one shields.io flat-style badge as a self-contained SVG document.
 * Widths use a fixed 8px/char approximation and `textLength` force-fits the
 * text into its rect, so the badge never truncates regardless of the exact
 * font metrics. Safe to embed inline or save as a `.svg` file.
 *
 * @param label - left segment text.
 * @param message - right segment text.
 * @param color - right-segment fill color (hex or named).
 * @param labelColor - left-segment fill color (default grey `#555`).
 * @returns the SVG document string.
 */
export function renderShieldsSvg(label: string, message: string, color: string, labelColor = '#555'): string {
  const labelText = escapeXml(label)
  const messageText = escapeXml(message)
  // 8px/char at the effective 11px scale plus 5px padding per side; 12px floor
  // keeps a two-character segment from collapsing.
  const labelPx = Math.max(labelText.length * 8, 12)
  const messagePx = Math.max(messageText.length * 8, 12)
  const labelWidth = labelPx + 10
  const messageWidth = messagePx + 10
  const totalWidth = labelWidth + messageWidth
  // Text is drawn at font-size 110 then scaled by 0.1, so coordinates are 10x.
  const labelX = Math.round((labelWidth / 2) * 10)
  const messageX = Math.round((labelWidth + messageWidth / 2) * 10)
  const labelLength = labelPx * 10
  const messageLength = messagePx * 10
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${labelText}: ${messageText}">`,
    `<title>${labelText}: ${messageText}</title>`,
    '<linearGradient id="s" x2="0" y2="100%">',
    '<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>',
    '<stop offset="1" stop-opacity=".1"/>',
    '</linearGradient>',
    '<clipPath id="r">',
    `<rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>`,
    '</clipPath>',
    '<g clip-path="url(#r)">',
    `<rect width="${labelWidth}" height="20" fill="${labelColor}"/>`,
    `<rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>`,
    `<rect width="${totalWidth}" height="20" fill="url(#s)"/>`,
    '</g>',
    '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">',
    `<text aria-hidden="true" x="${labelX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelLength}">${labelText}</text>`,
    `<text x="${labelX}" y="140" transform="scale(.1)" fill="#fff" textLength="${labelLength}">${labelText}</text>`,
    `<text aria-hidden="true" x="${messageX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${messageLength}">${messageText}</text>`,
    `<text x="${messageX}" y="140" transform="scale(.1)" fill="#fff" textLength="${messageLength}">${messageText}</text>`,
    '</g>',
    '</svg>',
  ].join('\n')
}

/**
 * Escape one badge-path segment for a shields.io static endpoint: dash →
 * `--`, underscore → `__`, space → `_`, then percent-encode `/` and `·` so the
 * path stays unambiguous (the escaping order is load-bearing).
 */
function shieldPathSegment(text: string): string {
  return text
    .replaceAll('-', '--')
    .replaceAll('_', '__')
    .replaceAll(' ', '_')
    .replaceAll('/', '%2F')
    .replaceAll('·', '%C2%B7')
}

/**
 * The documented shields.io static-badge endpoint for one label/message pair.
 * This is the zero-hosting embed path: paste the URL into a README image and
 * shields.io renders it; {@link renderShieldsSvg} is the offline equivalent.
 *
 * @param label - left segment text.
 * @param message - right segment text.
 * @param color - shields.io named color (e.g. `brightgreen`).
 * @returns the shields.io badge URL.
 */
export function shieldsEndpointUrl(label: string, message: string, color: ShieldColor | string): string {
  return `https://img.shields.io/badge/${shieldPathSegment(label)}-${shieldPathSegment(message)}-${color}`
}

/** One dimension in the five-dimension JSON envelope. */
export interface BadgeDimension {
  /** Human label, see {@link DIMENSION_BADGE_LABELS}. */
  label: string
  /** Verdict, see {@link DimensionStatus}. */
  status: DimensionStatus
  /** Dimension score in 0..100 (0 when no evidence). */
  score: number
  /** Weight used when summing the total. */
  weight: number
  /** Sanitized one-line verdict. */
  summary: string
}

/** One badge surface (SVG plus its documented endpoint and Markdown embed). */
export interface BadgeSurface {
  /** Documented shields.io endpoint URL. */
  endpoint: string
  /** Markdown image embed pointing at the endpoint. */
  markdown: string
  /** Offline/self-hosted SVG document. */
  svg: string
}

/** The five-dimension JSON API envelope returned to badge/API consumers. */
export interface BadgeJson {
  /** Discriminator {@link BADGE_SCHEMA}. */
  schema: typeof BADGE_SCHEMA
  /** Scored target. */
  target: { kind: ScoreResult['target']['kind']; spec: string }
  /** ISO-8601 audit timestamp of the underlying score. */
  scoredAt: string
  /** Producer version. */
  pluginVersion: string
  /** Weighted total, 0..100. */
  total: number
  /** Letter grade. */
  grade: string
  /** One-line sanitized summary. */
  verdict: string
  /** Five dimension scores keyed by dimension id. */
  dimensions: Record<Dimension, BadgeDimension>
  /** Total/grade badge (SVG, endpoint, Markdown embed). */
  badge: BadgeSurface
  /** Per-dimension badge endpoints and Markdown embeds. */
  dimensionBadges: Record<Dimension, Omit<BadgeSurface, 'svg'>>
}

/** Total-badge message: letter grade and weighted total. */
function totalMessage(result: ScoreResult): string {
  return `${result.grade} · ${result.total}/100`
}

/** Build one badge surface for a label/message pair colored by a hex value. */
function badgeSurface(label: string, message: string, colorHex: string, colorName: ShieldColor): BadgeSurface {
  const endpoint = shieldsEndpointUrl(label, message, colorName)
  return {
    endpoint,
    markdown: `![${label}: ${message}](${endpoint})`,
    svg: renderShieldsSvg(label, message, colorHex),
  }
}

/** One dimension's compact JSON representation. */
function dimensionJson(result: ScoreResult, dimension: Dimension): BadgeDimension {
  const score = result.dimensions[dimension]
  return {
    label: DIMENSION_BADGE_LABELS[dimension],
    status: score.status,
    score: score.score,
    weight: score.weight,
    summary: score.summary,
  }
}

/**
 * The five-dimension JSON API envelope for one score card: the compact
 * per-dimension scores plus the total/grade and the embeddable badge surfaces.
 * A no-evidence dimension keeps its honest `no-evidence` status and score 0.
 *
 * @param result - a settled score card.
 * @returns the badge JSON envelope.
 */
export function badgeJson(result: ScoreResult): BadgeJson {
  const dimensions = Object.fromEntries(
    DIMENSIONS.map(dimension => [dimension, dimensionJson(result, dimension)]),
  ) as Record<Dimension, BadgeDimension>

  const dimensionBadges = Object.fromEntries(
    DIMENSIONS.map(dimension => {
      const score = result.dimensions[dimension]
      const surface = badgeSurface(
        `dsh-score ${DIMENSION_BADGE_LABELS[dimension]}`,
        `${score.score}`,
        statusColor(score.status),
        statusColorName(score.status),
      )
      return [dimension, { endpoint: surface.endpoint, markdown: surface.markdown }]
    }),
  ) as Record<Dimension, Omit<BadgeSurface, 'svg'>>

  return {
    schema: BADGE_SCHEMA,
    target: { kind: result.target.kind, spec: result.target.spec },
    scoredAt: result.scoredAt,
    pluginVersion: result.pluginVersion,
    total: result.total,
    grade: result.grade,
    verdict: result.verdict,
    dimensions,
    badge: badgeSurface('dsh-score', totalMessage(result), gradeColor(result.grade), gradeColorName(result.grade)),
    dimensionBadges,
  }
}

/**
 * Render the total/grade badge SVG for one score card (offline use).
 *
 * @param result - a settled score card.
 * @returns the SVG document string.
 */
export function renderScoreBadge(result: ScoreResult): string {
  return renderShieldsSvg('dsh-score', totalMessage(result), gradeColor(result.grade))
}

/**
 * Render the per-dimension badge SVGs for one score card (offline use).
 *
 * @param result - a settled score card.
 * @returns SVGs keyed by dimension id.
 */
export function renderDimensionBadges(result: ScoreResult): Record<Dimension, string> {
  return Object.fromEntries(
    DIMENSIONS.map(dimension => {
      const score = result.dimensions[dimension]
      return [dimension, renderShieldsSvg(`dsh-score ${DIMENSION_BADGE_LABELS[dimension]}`, `${score.score}`, statusColor(score.status))]
    }),
  ) as Record<Dimension, string>
}

/**
 * The Markdown embed snippet for the total/grade badge (points at shields.io).
 *
 * @param result - a settled score card.
 * @returns a Markdown image line.
 */
export function renderBadgeMarkdown(result: ScoreResult): string {
  const message = totalMessage(result)
  const endpoint = shieldsEndpointUrl('dsh-score', message, gradeColorName(result.grade))
  return `![dsh-score: ${message}](${endpoint})`
}
