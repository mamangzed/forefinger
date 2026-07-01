import { createHash } from 'node:crypto'
import type { StableSignals, VolatileSignals } from '../types.js'

// GPU renderer strings differ across browsers for the SAME GPU:
//   Chrome/Edge: "ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)"
//   Firefox:     "NVIDIA GeForce RTX 3060"
//   Safari:      "Apple GPU" (obfuscated)
// We normalize to the bare GPU model so the device hash stays stable cross-browser.
export function normalizeGpu(renderer: string): string {
  if (!renderer || renderer === 'unknown') return 'unknown'

  let s = renderer.trim()

  // Strip ANGLE wrapper: "ANGLE (...)" -> "..."
  const angleMatch = s.match(/ANGLE\s*\(([^)]+)\)/i)
  if (angleMatch) s = angleMatch[1]

  // Strip backend tokens
  s = s
    .replace(/Direct3D\d+\s+vs_\d+_\d+\s+ps_\d+_\d+/gi, '')
    .replace(/Direct3D\d+/gi, '')
    .replace(/OpenGL/gi, '')
    .replace(/Vulkan/gi, '')
    .replace(/Metal/gi, '')
    .replace(/via \S+/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Lowercase + collapse spaces for case-insensitive matching
  s = s.toLowerCase()

  // Map known obfuscated/empty GPUs to "unknown" so they don't fragment
  if (!s || /^(apple gpu|gpu|google|swiftshader|mali|adreno|powervr)$/i.test(s)) {
    return 'generic-mobile'
  }

  return s
}

// Device hash = cross-browser-stable signals only.
// Excludes: GPU renderer string (use normalized), languages (user-set), platform string (UA-derived).
// Includes: normalized GPU model, CPU cores, RAM, screen, color depth, pixel ratio, timezone, touch.
export function computeDeviceHash(stable: StableSignals): string {
  const fingerprint = {
    cpuCores: stable.cpuCores,
    deviceMemory: bucketMemory(stable.deviceMemory),
    screenWidth: stable.screenWidth,
    screenHeight: stable.screenHeight,
    colorDepth: stable.colorDepth,
    pixelRatio: stable.pixelRatio,
    timezone: stable.timezone,
    touchPoints: stable.touchPoints,
    gpu: normalizeGpu(stable.gpuRenderer)
  }
  const json = JSON.stringify(normalizeKeys(fingerprint))
  return createHash('sha256').update(json).digest('hex').slice(0, 48)
}

// Volatile hash for the fuzzy cross-browser similarity step.
// Canvas/WebGL/audio/font hashes differ across browsers even on the same device,
// so they are scored separately, not hashed.
export function computeVolatileHash(volatile: VolatileSignals): string {
  // Sort webgl extensions for stable comparison
  const data = {
    webglExtsCount: volatile.webglExts.length,
    fontCount: volatile.fonts.length
  }
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

function bucketMemory(mb: number): string {
  // deviceMemory is bucketed by browsers (0.25, 0.5, 1, 2, 4, 8)
  if (mb <= 0) return 'unknown'
  if (mb <= 1) return 'low'
  if (mb <= 2) return 'med'
  if (mb <= 4) return 'high'
  return 'xhigh'
}

function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = obj[k]
  }
  return sorted
}
