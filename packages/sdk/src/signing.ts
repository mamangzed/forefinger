import { sha256 } from './hash'

// HMAC-SHA256 using Web Crypto. Secret is the API key the SDK already holds.
// Server recomputes with the same key and compares — detects tampered payloads
// and requests from non-SDK clients (curl/spoof) that can't sign.
export async function signPayload(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, msgData)
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Build canonical signing string: hash(payload) + timestamp
// Includes timestamp to make signatures expire (replay protection).
export async function signCollectRequest(
  body: unknown,
  apiKey: string,
  timestamp: number
): Promise<string> {
  const payloadJson = JSON.stringify(body)
  const canonical = `${timestamp}.${payloadJson}`
  return signPayload(canonical, apiKey)
}
