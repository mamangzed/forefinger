import { describe, it, expect } from 'vitest'
import { normalizeGpu, computeDeviceHash } from '../src/matching/device-hash.js'
import type { StableSignals } from '../src/types.js'

const base: StableSignals = {
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

describe('normalizeGpu', () => {
  it('strips ANGLE wrapper to bare model', () => {
    expect(normalizeGpu('ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)'))
      .toBe('nvidia geforce rtx 3060')
  })

  it('matches Firefox-style bare renderer', () => {
    expect(normalizeGpu('NVIDIA GeForce RTX 3060')).toBe('nvidia geforce rtx 3060')
  })

  it('normalizes both to same string (cross-browser match)', () => {
    expect(normalizeGpu('ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)'))
      .toBe(normalizeGpu('NVIDIA GeForce RTX 3060'))
  })

  it('maps Apple GPU to generic', () => {
    expect(normalizeGpu('Apple GPU')).toBe('generic-mobile')
  })

  it('handles unknown', () => {
    expect(normalizeGpu('unknown')).toBe('unknown')
  })
})

describe('computeDeviceHash (cross-browser)', () => {
  it('same device hash despite different GPU renderer string format', () => {
    const chrome = { ...base, gpuRenderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' }
    const firefox = { ...base, gpuRenderer: 'NVIDIA GeForce RTX 3060' }
    expect(computeDeviceHash(chrome)).toBe(computeDeviceHash(firefox))
  })

  it('different device = different hash', () => {
    const other = { ...base, cpuCores: 4 }
    expect(computeDeviceHash(other)).not.toBe(computeDeviceHash(base))
  })

  it('ignores languages (user-set, not device)', () => {
    const a = { ...base, languages: ['en-US'] }
    const b = { ...base, languages: ['id-ID', 'en-US'] }
    expect(computeDeviceHash(a)).toBe(computeDeviceHash(b))
  })

  it('ignores platform string (UA-derived)', () => {
    const a = { ...base, platform: 'Win32' }
    const b = { ...base, platform: 'Linux x86_64' }
    expect(computeDeviceHash(a)).toBe(computeDeviceHash(b))
  })
})
