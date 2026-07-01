import type { StableSignals } from '../types'

// Collect stable signals - rarely change between sessions
export async function collectStable(): Promise<StableSignals> {
  const navigator_ = navigator as Navigator & {
    deviceMemory?: number
    userAgentData?: { platform?: string }
  }

  // GPU info via WebGL
  const { vendor, renderer } = getGpuInfo()

  return {
    cpuCores: navigator_.hardwareConcurrency || 0,
    deviceMemory: navigator_.deviceMemory || 0,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    timezoneOffset: new Date().getTimezoneOffset(),
    languages: navigator_.languages || [navigator_.language],
    platform: navigator_.userAgentData?.platform || navigator_.platform || 'unknown',
    gpuVendor: vendor,
    gpuRenderer: renderer,
    touchPoints: navigator_.maxTouchPoints || 0,
    cookieEnabled: navigator_.cookieEnabled
  }
}

function getGpuInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return { vendor: 'unknown', renderer: 'unknown' }

    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return { vendor: 'unknown', renderer: 'unknown' }

    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string,
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
    }
  } catch {
    return { vendor: 'unknown', renderer: 'unknown' }
  }
}
