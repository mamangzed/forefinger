import type { VolatileSignals } from '../types'

// WebGL fingerprint - extensions list + shader precision + params
export async function collectWebgl(): Promise<
  Pick<VolatileSignals, 'webglExts' | 'webglParams'>
> {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return { webglExts: [], webglParams: {} }

    const exts = gl.getSupportedExtensions() || []

    const params: Record<string, number | string> = {
      MAX_TEXTURE_SIZE: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      MAX_VIEWPORT_DIMS: (gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array)?.[0] ?? 0,
      MAX_RENDERBUFFER_SIZE: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      MAX_TEXTURE_IMAGE_UNITS: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      MAX_VERTEX_ATTRIBS: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      MAX_VARYING_VECTORS: gl.getParameter(gl.MAX_VARYING_VECTORS),
      MAX_VERTEX_UNIFORM_VECTORS: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      MAX_FRAGMENT_UNIFORM_VECTORS: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      ALIASED_LINE_WIDTH_RANGE: (gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE) as Float32Array)?.[0] ?? 0,
      ALIASED_POINT_SIZE_RANGE: (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)?.[0] ?? 0
    }

    // Add shader precision info
    const shaderTypes = ['VERTEX_SHADER', 'FRAGMENT_SHADER']
    const precisionTypes = ['LOW_FLOAT', 'MEDIUM_FLOAT', 'HIGH_FLOAT', 'LOW_INT', 'MEDIUM_INT', 'HIGH_INT']
    for (const st of shaderTypes) {
      for (const pt of precisionTypes) {
        const key = `${st}_${pt}`
        const shaderPrecision = gl.getShaderPrecisionFormat(
          gl[st as 'VERTEX_SHADER'],
          gl[pt as 'LOW_FLOAT']
        )
        if (shaderPrecision) {
          params[`${key}_MIN`] = shaderPrecision.rangeMin
          params[`${key}_MAX`] = shaderPrecision.rangeMax
          params[`${key}_P`] = shaderPrecision.precision
        }
      }
    }

    return { webglExts: exts, webglParams: params }
  } catch {
    return { webglExts: [], webglParams: {} }
  }
}
