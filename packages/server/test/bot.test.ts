import { describe, it, expect } from 'vitest'
import { detectBot } from '../src/detectors/bot.js'
import type { CollectedSignals } from '../src/types.js'

const baseSignals: CollectedSignals = {
  stable: {
    cpuCores: 8,
    deviceMemory: 8,
    screenWidth: 1920,
    screenHeight: 1080,
    colorDepth: 24,
    pixelRatio: 1,
    timezone: 'Asia/Jakarta',
    timezoneOffset: -420,
    languages: ['id-ID'],
    platform: 'Win32',
    gpuVendor: 'NVIDIA',
    gpuRenderer: 'RTX 3060',
    touchPoints: 0,
    cookieEnabled: true
  },
  volatile: {
    canvasHash: 'abc',
    webglExts: ['EXT_1', 'EXT_2'],
    webglParams: {},
    audioHash: 'xyz',
    fonts: ['Arial', 'Verdana', 'Times'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0'
  },
  timestamp: Date.now()
}

describe('detectBot', () => {
  it('flags known bot user agents', () => {
    const result = detectBot({
      signals: baseSignals,
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
      ip: '1.2.3.4'
    })
    expect(result.detected).toBe(true)
    expect(result.flag).toBe('bot')
    expect(result.detail).toContain('bot_ua')
  })

  it('flags headless chrome', () => {
    const result = detectBot({
      signals: baseSignals,
      userAgent: 'Mozilla/5.0 HeadlessChrome',
      ip: '1.2.3.4'
    })
    expect(result.detected).toBe(true)
    expect(result.detail).toContain('headless_chrome')
  })

  it('does not flag normal browser', () => {
    const result = detectBot({
      signals: baseSignals,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
      ip: '1.2.3.4'
    })
    expect(result.detected).toBe(false)
  })

  it('flags missing canvas/audio (headless)', () => {
    const headlessSignals: CollectedSignals = {
      ...baseSignals,
      volatile: {
        ...baseSignals.volatile,
        canvasHash: 'no-canvas',
        audioHash: 'no-audio',
        webglExts: [],
        fonts: []
      },
      stable: { ...baseSignals.stable, cpuCores: 0 }
    }
    const result = detectBot({
      signals: headlessSignals,
      userAgent: 'Mozilla/5.0 (X11; Linux) Chrome/120.0',
      ip: '1.2.3.4'
    })
    expect(result.detected).toBe(true)
  })
})
