import { sha256 } from '../hash'

// Canvas fingerprint - render hidden canvas, hash pixel output
export async function collectCanvas(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    // Draw text with various styling - varies by GPU/driver/font rendering
    ctx.textBaseline = 'top'
    ctx.font = "14px 'Arial'"
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)

    ctx.fillStyle = '#069'
    ctx.font = "11px 'Arial'"
    ctx.fillText("Cwm fjordbank glyphs vext quiz, 😃", 2, 15)

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.font = "18px 'Arial'"
    ctx.fillText('fingerprint © 2026', 4, 35)

    ctx.beginPath()
    ctx.arc(50, 30, 20, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()

    const dataUrl = canvas.toDataURL()
    return sha256(dataUrl)
  } catch {
    return 'canvas-error'
  }
}
