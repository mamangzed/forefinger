import type { CollectedSignals, CollectResult, RiskResult } from './types'
import { hashObject } from './hash'
import { signCollectRequest } from './signing'

export interface SendParams {
  endpoint: string
  apiKey: string
  signals: CollectedSignals
  stableHash: string
  // Optional customer-provided link/tag for grouping visits to business identity
  linkedId?: string
  tag?: string
}

// POST signed signals to server, return visitorId + risk
export async function sendSignals(params: SendParams): Promise<CollectResult> {
  const { endpoint, apiKey, signals, stableHash, linkedId, tag } = params

  const timestamp = Date.now()
  const body: Record<string, unknown> = { signals, stableHash, timestamp }
  if (linkedId) body.linkedId = linkedId
  if (tag) body.tag = tag

  const signature = await signCollectRequest(body, apiKey, timestamp)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FP-Key': apiKey,
        'X-FP-Timestamp': String(timestamp),
        'X-FP-Signature': signature
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      keepalive: true
    })

    if (!res.ok) {
      throw new Error(`collect failed: ${res.status}`)
    }

    const data = (await res.json()) as {
      visitorId: string
      confidence?: number
      risk?: RiskResult
    }

    return {
      visitorId: data.visitorId,
      stableHash,
      signals,
      confidence: data.confidence,
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
