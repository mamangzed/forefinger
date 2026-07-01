import { collectStable } from './collectors/stable'
import { collectCanvas } from './collectors/canvas'
import { collectWebgl } from './collectors/webgl'
import { collectAudio } from './collectors/audio'
import { collectFonts } from './collectors/fonts'
import { collectNetwork } from './collectors/network'
import { collectIncognito } from './collectors/incognito'
import { computeStableHash, sendSignals } from './transport'
import type {
  CollectOptions,
  CollectResult,
  CollectedSignals
} from './types'

const DEFAULT_ENDPOINT = '/api/collect'

/**
 * Collect all fingerprint signals in parallel.
 * Optionally send to server for identification + risk assessment.
 */
export async function collect(options: CollectOptions = {}): Promise<CollectResult> {
  const {
    endpoint = resolveEndpoint(),
    apiKey = resolveApiKey(),
    sendToServer = true
  } = options

  // Parallel collection - total time = slowest signal
  const [stable, canvasHash, webgl, audioHash, fonts, network, incognito] = await Promise.all([
    collectStable(),
    collectCanvas(),
    collectWebgl(),
    collectAudio(),
    collectFonts(),
    collectNetwork(),
    collectIncognito()
  ])

  const volatile = {
    canvasHash,
    webglExts: webgl.webglExts,
    webglParams: webgl.webglParams,
    audioHash,
    fonts,
    userAgent: navigator.userAgent
  }

  const stableHash = await computeStableHash(stable as unknown as Record<string, unknown>)

  const signals: CollectedSignals = {
    stable,
    volatile,
    network,
    incognito,
    timestamp: Date.now()
  }

  if (sendToServer) {
    try {
      return await sendSignals({ endpoint, apiKey, signals, stableHash })
    } catch (err) {
      // Return local-only result on network failure
      return {
        visitorId: stableHash.slice(0, 32),
        stableHash,
        signals,
        risk: undefined
      }
    }
  }

  return {
    visitorId: stableHash.slice(0, 32),
    stableHash,
    signals,
    risk: undefined
  }
}

/**
 * Get only the visitorId without full signal collection.
 * Faster - uses cached fingerprint if available.
 */
export async function getVisitorId(options: CollectOptions = {}): Promise<string> {
  const result = await collect({ ...options, sendToServer: false })
  return result.visitorId
}

export type {
  CollectOptions,
  CollectResult,
  CollectedSignals,
  RiskResult
} from './types'

// Auto-collect when data-auto attribute present
function setupAutoCollect() {
  if (typeof document === 'undefined') return
  const script = document.currentScript as HTMLScriptElement | null
  if (!script?.dataset?.auto) return

  const endpoint = script.dataset.endpoint || DEFAULT_ENDPOINT
  const apiKey = script.dataset.apiKey || resolveApiKey()

  collect({ endpoint, apiKey, sendToServer: true }).catch(() => {})
}

// Expose global FP
if (typeof window !== 'undefined') {
  const api = {
    collect,
    getVisitorId,
    version: '0.1.0'
  }
  ;(window as unknown as { FP: typeof api }).FP = api
  setupAutoCollect()
}

function resolveEndpoint(): string {
  if (typeof document !== 'undefined') {
    const script = document.currentScript as HTMLScriptElement | null
    if (script?.dataset?.endpoint) return script.dataset.endpoint
  }
  return DEFAULT_ENDPOINT
}

function resolveApiKey(): string {
  if (typeof document !== 'undefined') {
    const script = document.currentScript as HTMLScriptElement | null
    if (script?.dataset?.apiKey) return script.dataset.apiKey
  }
  return ''
}
