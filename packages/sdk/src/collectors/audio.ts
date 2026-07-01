import { sha256 } from '../hash'

// Audio fingerprint - oscillation processing signature
export async function collectAudio(): Promise<string> {
  try {
    const AudioCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
        .webkitOfflineAudioContext
    if (!AudioCtx) return 'no-audio'

    const context = new AudioCtx(1, 44100)
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000

    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25

    oscillator.connect(compressor)
    compressor.connect(context.destination)
    oscillator.start(0)

    const buffer = await context.startRendering()
    const data = buffer.getChannelData(0)

    // Sum + accumulate sample values
    let sum = 0
    for (let i = 4500; i < 5000; i++) {
      sum += Math.abs(data[i])
    }

    return sha256(String(sum))
  } catch {
    return 'audio-error'
  }
}
