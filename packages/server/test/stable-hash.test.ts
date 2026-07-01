import { describe, it, expect } from 'vitest'
import { computeStableHash } from '../src/matching/stable-hash.js'
import type { StableSignals } from '../src/types.js'

const stable: StableSignals = {
  cpuCores: 8,
  deviceMemory: 8,
  screenWidth: 1920,
  screenHeight: 1080,
  colorDepth: 24,
  pixelRatio: 1,
  timezone: 'Asia/Jakarta',
  timezoneOffset: -420,
  languages: ['id-ID', 'en-US'],
  platform: 'Win32',
  gpuVendor: 'NVIDIA Corporation',
  gpuRenderer: 'NVIDIA GeForce RTX 3060',
  touchPoints: 0,
  cookieEnabled: true
}

describe('computeStableHash', () => {
  it('is deterministic - same input same hash', () => {
    const h1 = computeStableHash(stable)
    const h2 = computeStableHash(stable)
    expect(h1).toBe(h2)
  })

  it('produces 64 char hex string', () => {
    const hash = computeStableHash(stable)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('changes when signal changes', () => {
    const modified = { ...stable, cpuCores: 4 }
    expect(computeStableHash(modified)).not.toBe(computeStableHash(stable))
  })

  it('order-independent for languages array', () => {
    const reordered = { ...stable, languages: ['en-US', 'id-ID'] }
    expect(computeStableHash(reordered)).toBe(computeStableHash(stable))
  })
})
