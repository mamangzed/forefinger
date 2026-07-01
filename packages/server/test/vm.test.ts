import { describe, it, expect } from 'vitest'
import { detectVm } from '../src/detectors/vm.js'
import type { CollectedSignals } from '../src/types.js'

const base: CollectedSignals = {
  stable: {
    cpuCores: 8, deviceMemory: 8, screenWidth: 1920, screenHeight: 1080,
    colorDepth: 24, pixelRatio: 1, timezone: 'Asia/Jakarta', timezoneOffset: -420,
    languages: ['id-ID'], platform: 'Win32', gpuVendor: 'NVIDIA',
    gpuRenderer: 'NVIDIA GeForce RTX 3060', touchPoints: 0, cookieEnabled: true
  },
  volatile: { canvasHash: 'abc', webglExts: [], webglParams: {}, audioHash: 'x', fonts: [], userAgent: '' },
  timestamp: Date.now()
}

describe('detectVm', () => {
  it('flags VirtualBox GPU renderer', () => {
    const r = detectVm({ ...base, stable: { ...base.stable, gpuRenderer: 'SVGA3D; VirtualBox' } })
    expect(r.detected).toBe(true)
    expect(r.detail).toContain('vm_gpu')
  })

  it('flags VMware renderer', () => {
    const r = detectVm({ ...base, stable: { ...base.stable, gpuRenderer: ' Gallium3D on llvmpipe' } })
    expect(r.detected).toBe(true)
  })

  it('flags SwiftShader (software rendering)', () => {
    const r = detectVm({ ...base, stable: { ...base.stable, gpuVendor: 'Google', gpuRenderer: 'Google SwiftShader' } })
    expect(r.detected).toBe(true)
    expect(r.detail).toContain('swiftshader')
  })

  it('does not flag real GPU', () => {
    const r = detectVm(base)
    expect(r.detected).toBe(false)
  })

  it('does not flag missing GPU on Apple platform', () => {
    const r = detectVm({ ...base, stable: { ...base.stable, gpuRenderer: 'unknown', platform: 'MacIntel' } })
    expect(r.detected).toBe(false)
  })
})
