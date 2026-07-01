import { describe, it, expect } from 'vitest'
import { detectBehavior } from '../src/detectors/behavior.js'
import type { CollectedSignals } from '../src/types.js'

const base: CollectedSignals = {
  stable: { cpuCores: 8, deviceMemory: 8, screenWidth: 1920, screenHeight: 1080, colorDepth: 24, pixelRatio: 1, timezone: 'Asia/Jakarta', timezoneOffset: -420, languages: ['id'], platform: 'Win32', gpuVendor: 'NVIDIA', gpuRenderer: 'RTX', touchPoints: 0, cookieEnabled: true },
  volatile: { canvasHash: 'x', webglExts: [], webglParams: {}, audioHash: 'y', fonts: [], userAgent: '' },
  timestamp: Date.now()
}

describe('detectBehavior', () => {
  it('returns no_score when behavior sample missing', () => {
    const r = detectBehavior(base)
    expect(r.detected).toBe(false)
    expect(r.detail).toBe('no_sample')
  })

  it('flags no interaction during window', () => {
    const r = detectBehavior({ ...base, behavior: { mouseMoves: 0, keydowns: 0, scrolls: 0, touches: 0, durationMs: 3000, idleRatio: 1, mouseMoveIntervalStd: 0, mouseMoveDistanceMean: 0, mouseStraightness: 0, keyIntervalStd: 0, scrollVelocityChanges: 0 } })
    expect(r.detected).toBe(true)
    expect(r.detail).toContain('no_interaction')
  })

  it('flags perfectly regular mouse intervals (bot)', () => {
    const r = detectBehavior({ ...base, behavior: { mouseMoves: 20, mouseMoveIntervalStd: 0.5, mouseMoveDistanceMean: 10, mouseStraightness: 0.98, keydowns: 0, keyIntervalStd: 0, scrolls: 0, scrollVelocityChanges: 0, touches: 0, durationMs: 4000, idleRatio: 0 } })
    expect(r.detected).toBe(true)
    expect(r.detail).toContain('regular_mouse')
    expect(r.detail).toContain('straight_mouse')
    expect(r.detail).toContain('no_idle')
  })

  it('low risk for human-like variance', () => {
    const r = detectBehavior({ ...base, behavior: { mouseMoves: 50, mouseMoveIntervalStd: 30, mouseMoveDistanceMean: 15, mouseStraightness: 0.6, keydowns: 10, keyIntervalStd: 80, scrolls: 5, scrollVelocityChanges: 3, touches: 0, durationMs: 4000, idleRatio: 0.15 } })
    expect(r.detected).toBe(false)
  })
})
