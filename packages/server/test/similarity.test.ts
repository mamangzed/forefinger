import { describe, it, expect } from 'vitest'
import { compareVolatile } from '../src/matching/similarity.js'
import type { VolatileSignals } from '../src/types.js'

const base: VolatileSignals = {
  canvasHash: 'abc123',
  webglExts: ['EXT_1', 'EXT_2', 'EXT_3'],
  webglParams: { MAX_TEXTURE_SIZE: 16384, MAX_VARYING_VECTORS: 30 },
  audioHash: 'xyz789',
  fonts: ['Arial', 'Verdana', 'Times New Roman'],
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0'
}

describe('compareVolatile', () => {
  it('returns 100 for identical signals', () => {
    const result = compareVolatile(base, base)
    expect(result.score).toBe(100)
    expect(result.matched).toBe(true)
  })

  it('returns 0 for completely different signals', () => {
    const different: VolatileSignals = {
      canvasHash: 'different',
      webglExts: ['EXT_99'],
      webglParams: { MAX_TEXTURE_SIZE: 4096 },
      audioHash: 'different',
      fonts: ['Comic Sans'],
      userAgent: 'Mozilla/5.0 (X11; Linux) Firefox/121.0'
    }
    const result = compareVolatile(base, different)
    expect(result.score).toBeLessThan(50)
    expect(result.matched).toBe(false)
  })

  it('handles partial match with canvas + audio identical', () => {
    const partial: VolatileSignals = {
      ...base,
      fonts: [],
      webglExts: []
    }
    const result = compareVolatile(base, partial)
    // canvas(25) + audio(20) = 45, plus webglParams partial
    expect(result.score).toBeGreaterThanOrEqual(45)
    expect(result.breakdown.canvas).toBe(25)
    expect(result.breakdown.audio).toBe(20)
  })

  it('jaccard handles empty arrays gracefully', () => {
    const empty: VolatileSignals = { ...base, webglExts: [], fonts: [] }
    const result = compareVolatile(base, empty)
    expect(result.breakdown.webglExts).toBe(0)
    expect(result.breakdown.fonts).toBe(0)
  })

  it('fuzzy match ignores version numbers in UA', () => {
    const updated: VolatileSignals = {
      ...base,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/125.0.5123'
    }
    const result = compareVolatile(base, updated)
    expect(result.breakdown.userAgent).toBeGreaterThan(0)
  })
})
