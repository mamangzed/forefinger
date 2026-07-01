import { createHmac, timingSafeEqual } from 'node:crypto'

// Verify SDK HMAC signature on /api/collect.
// SDK signs `${timestamp}.${jsonBody}` with the API key as HMAC secret.
// Server looks up the API key, recomputes, and compares (constant time).
// Rejects tampered payloads and unsigned requests (curl/spoof).

const MAX_AGE_MS = 30000 // 30s replay window

export interface VerifyResult {
  ok: boolean
  reason?: string
}

export function verifySignature(
  body: string,
  signature: string | undefined,
  timestampHeader: string | undefined,
  apiKey: string
): VerifyResult {
  if (!signature || !timestampHeader) {
    return { ok: false, reason: 'missing_signature' }
  }
  const timestamp = Number(timestampHeader)
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: 'invalid_timestamp' }
  }
  const age = Date.now() - timestamp
  if (age > MAX_AGE_MS || age < -5000) {
    return { ok: false, reason: 'stale_timestamp' }
  }

  const expected = signCanonical(timestamp, body, apiKey)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    return { ok: false, reason: 'bad_signature' }
  }
  if (!timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' }
  }
  return { ok: true }
}

export function signCanonical(timestamp: number, body: string, secret: string): string {
  const canonical = `${timestamp}.${body}`
  return createHmac('sha256', secret).update(canonical).digest('hex')
}
