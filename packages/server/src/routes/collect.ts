import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { identifyVisitor } from '../matching/identify.js'
import { assessRisk } from '../risk/scoring.js'
import type { AuthEnv } from '../middleware/auth.js'

const collectSchema = z.object({
  signals: z.object({
    stable: z.object({}).passthrough(),
    volatile: z.object({}).passthrough(),
    timestamp: z.number()
  }),
  stableHash: z.string().length(64),
  timestamp: z.number()
})

export const collectRoute = new Hono<AuthEnv>()

collectRoute.post('/', zValidator('json', collectSchema), async (c) => {
  const body = c.req.valid('json')

  // Replay protection - reject signals older than 30s
  const now = Date.now()
  const age = now - body.timestamp
  if (age > 30000 || age < -5000) {
    return c.json({ error: 'stale_signals', detail: 'timestamp outside valid window' }, 400)
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') || ''
  const userAgent = c.req.header('user-agent') || ''

  // Identify visitor (match/create)
  const identified = await identifyVisitor(
    body.signals as unknown as Parameters<typeof identifyVisitor>[0],
    body.stableHash,
    ip,
    userAgent
  )

  // Risk assessment — pass geo country for region spoofing detection
  const risk = await assessRisk({
    signals: body.signals as unknown as Parameters<typeof assessRisk>[0]['signals'],
    ip,
    userAgent,
    ipCountry: identified.geo?.country || undefined,
    visitorId: identified.visitorId
  })

  return c.json({
    visitorId: identified.visitorId,
    isNew: identified.isNew,
    similarity: identified.similarity,
    geo: identified.geo,
    risk
  })
})
