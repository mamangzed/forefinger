import type { VolatileSignals } from '../types.js'

export interface SimilarityResult {
  score: number // 0-100
  breakdown: Record<string, number>
  matched: boolean
  possible: boolean
}

const WEIGHTS = {
  canvas: 25,
  webglExts: 20,
  audio: 20,
  fonts: 15,
  webglParams: 10,
  userAgent: 10
}

const MATCH_THRESHOLD = 80
const POSSIBLE_THRESHOLD = 50

export function compareVolatile(
  incoming: VolatileSignals,
  stored: VolatileSignals
): SimilarityResult {
  const breakdown: Record<string, number> = {}

  breakdown.canvas = exactMatch(incoming.canvasHash, stored.canvasHash) * WEIGHTS.canvas
  breakdown.audio = exactMatch(incoming.audioHash, stored.audioHash) * WEIGHTS.audio
  breakdown.webglExts = jaccard(incoming.webglExts, stored.webglExts) * WEIGHTS.webglExts
  breakdown.fonts = jaccard(incoming.fonts, stored.fonts) * WEIGHTS.fonts
  breakdown.webglParams = paramsMatch(incoming.webglParams, stored.webglParams) * WEIGHTS.webglParams
  breakdown.userAgent = fuzzyMatch(incoming.userAgent, stored.userAgent) * WEIGHTS.userAgent

  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0))

  return {
    score,
    breakdown,
    matched: score >= MATCH_THRESHOLD,
    possible: score >= POSSIBLE_THRESHOLD && score < MATCH_THRESHOLD
  }
}

function exactMatch(a: string, b: string): number {
  if (!a || !b || a === 'no-canvas' || a === 'audio-error') return 0
  return a === b ? 1.0 : 0.0
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  for (const x of setA) if (setB.has(x)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

function paramsMatch(a: Record<string, number | string>, b: Record<string, number | string>): number {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (!keysA.length || !keysB.length) return 0
  const allKeys = new Set([...keysA, ...keysB])
  let matches = 0
  for (const k of allKeys) {
    if (a[k] === b[k]) matches++
  }
  return matches / allKeys.size
}

function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0
  // Exact match = full score
  if (a === b) return 1.0
  // Strip version numbers, compare structure (e.g. Chrome 120 vs 125)
  const norm = (s: string) => s.replace(/[\d.]+/g, '').replace(/\s+/g, ' ').trim()
  return norm(a) === norm(b) ? 0.8 : 0
}
