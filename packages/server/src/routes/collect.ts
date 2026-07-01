import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { identifyVisitor } from '../matching/identify.js'
import { assessRisk } from '../risk/scoring.js'
import { verifySignature } from '../middleware/signature.js'
import { dispatchWebhook } from '../webhook/dispatch.js'
import type { AuthEnv } from '../middleware/auth.js'

const collectSchema = z.object({
  signals: z.object({
    stable: z.object({}).passthrough(),
    volatile: z.object({}).passthrough(),
    network: z.object({}).passthrough().optional(),
    incognito: z.object({}).passthrough().optional(),
    behavior: z.object({}).passthrough().optional(),
    timestamp: z.number()
  }),
  stableHash: z.string().length(64),
  timestamp: z.number(),
  linkedId: z.string().optional(),
  tag: z.string().optional()
})

export const collectRoute = new Hono<AuthEnv>()

collectRoute.post('/', async (c) => {
  const raw = await c.req.text()

  // Verify HMAC signature (anti-tamper + anti-spoof)
  const apiKey = c.get('apiKey') || ''
  const sig = c.req.header('X-FP-Signature')
  const ts = c.req.header('X-FP-Timestamp')
  const verify = verifySignature(raw, sig, ts, apiKey)
  if (!verify.ok) {
    return c.json({ error: 'signature_invalid', reason: verify.reason }, 401)
  }

  // Parse + validate body
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const result = collectSchema.safeParse(parsed)
  if (!result.success) {
    return c.json({ error: 'invalid_payload', issues: result.error.issues }, 400)
  }
  const body = result.data

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') || ''
  const userAgent = c.req.header('user-agent') || ''

  // Identify visitor (match/create) — pass linkedId so multi-account linking works
  const identified = await identifyVisitor(
    body.signals as unknown as Parameters<typeof identifyVisitor>[0],
    body.stableHash,
    ip,
    userAgent
  )

  // Risk assessment — pass geo country for region spoofing + behavior for bot scoring
  const risk = await assessRisk({
    signals: body.signals as unknown as Parameters<typeof assessRisk>[0]['signals'],
    ip,
    userAgent,
    ipCountry: identified.geo?.country || undefined,
    visitorId: identified.visitorId,
    linkedId: body.linkedId
  })

  // If linkedId provided, attach to visitor's linked accounts (for multi-accounting detection)
  if (body.linkedId) {
    await import('../matching/linked-id.js').then((m) => m.attachLinkedId(identified.visitorId, body.linkedId!))
  }

  // Dispatch webhook if high risk
  if (risk.riskScore >= 70) {
    dispatchWebhook({
      event: 'high_risk_visit',
      visitorId: identified.visitorId,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      flags: risk.flags,
      linkedId: body.linkedId,
      timestamp: body.timestamp
    })
  }

  // Confidence: similarity-based (100 exact, scaled down for fuzzy matches)
  const confidence = Math.min(identified.similarity / 100, 1)

  return c.json({
    visitorId: identified.visitorId,
    isNew: identified.isNew,
    similarity: identified.similarity,
    confidence,
    linkedId: body.linkedId,
    geo: identified.geo,
    risk
  })
})
