import { createHmac } from 'node:crypto'

// Dispatch event to customer webhook URL (if configured).
// Signed with WEBHOOK_SECRET so customer can verify authenticity.
// Fire-and-forget — never block the request path.

export interface WebhookEvent {
  event: string
  visitorId: string
  riskScore: number
  riskLevel: string
  flags: string[]
  linkedId?: string
  timestamp: number
  [key: string]: unknown
}

const WEBHOOK_URL = process.env.WEBHOOK_URL || ''
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

export function dispatchWebhook(event: WebhookEvent): void {
  if (!WEBHOOK_URL) return

  const payload = JSON.stringify(event)
  const signature = createHmac('sha256', WEBHOOK_SECRET || 'fp')
    .update(payload)
    .digest('hex')

  // Detached send — does not block collect response
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FP-Webhook-Signature': `sha256=${signature}`,
      'X-FP-Event': event.event
    },
    body: payload,
    signal: AbortSignal.timeout(5000)
  }).catch((err) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.error('[webhook] dispatch failed:', (err as Error).message)
    }
  })
}
