// Font fingerprint - detect installed fonts via measurement
const TEST_FONTS = [
  'Arial', 'Arial Black', 'Arial Narrow', 'Arial Unicode MS',
  'Calibri', 'Cambria', 'Cambria Math', 'Comic Sans MS', 'Consolas',
  'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Helvetica Neue',
  'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
  'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'sans-serif', 'serif', 'monospace'
]

const BASELINE_FONTS = ['monospace', 'sans-serif', 'serif']
const TEST_STRING = 'mmmmmmmmmmlli'
const TEST_SIZE = '72px'

export async function collectFonts(): Promise<string[]> {
  const detected: string[] = []
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return []

    ctx.font = `${TEST_SIZE} monospace`
    ctx.textBaseline = 'top'

    // Baseline widths
    const baselineWidths = BASELINE_FONTS.map((font) => {
      ctx.font = `${TEST_SIZE} ${font}`
      return ctx.measureText(TEST_STRING).width
    })

    for (const font of TEST_FONTS) {
      let isDetected = false
      for (let i = 0; i < BASELINE_FONTS.length; i++) {
        ctx.font = `${TEST_SIZE} "${font}", ${BASELINE_FONTS[i]}`
        const width = ctx.measureText(TEST_STRING).width
        // Font available if width differs from baseline
        if (width !== baselineWidths[i]) {
          isDetected = true
          break
        }
      }
      if (isDetected) detected.push(font)
    }
  } catch {
    return []
  }
  return detected
}
