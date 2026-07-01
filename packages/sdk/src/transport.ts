import type { CollectedSignals, CollectResult, RiskResult } from './types'
import { hashObject } from './hash'

interface SendParams {
  endpoint: string
  apiKey: string
  signals: CollectedSignals
  stableHash: string
}

// POST signals to server, return visitorId + risk
export async function sendSignals(params: SendParams): Promise<CollectResult> {
  const { endpoint, apiKey, signals, stableHash } = params

  const body = JSON.stringify({ signals, stableHash, timestamp: Date.now() })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FP-Key': apiKey
      },
      body,
      signal: controller.signal,
      keepalive: true
    })

    if (!res.ok) {
      throw new Error(`collect failed: ${res.status}`)
    }

    const data = (await res.json()) as {
      visitorId: string
      risk?: RiskResult
    }

    return {
      visitorId: data.visitorId,
      stableHash,
      signals,
      risk: data.risk
    }
  } finally {
    clearTimeout(timeout)
  }
}

// Build stable hash client-side (server also recomputes for integrity)
export async function computeStableHash(stable: Record<string, unknown>): Promise<string> {
  return hashObject(stable)
}
