import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { assessRisk } from '../risk/scoring.js'
import type { AuthEnv } from '../middleware/auth.js'
import type { VerifyRequest } from '../types.js'

const verifySchema = z.object({
  visitorId: z.string().min(1),
  event: z.string().min(1),
  metadata: z.object({}).passthrough()
})

export const verifyRoute = new Hono<AuthEnv>()

verifyRoute.post('/', zValidator('json', verifySchema), async (c) => {
  const body = c.req.valid('json') as VerifyRequest

  // Fetch visitor's stored signals
  const visitor = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.visitorId, body.visitorId))
    .limit(1)

  if (visitor.length === 0) {
    return c.json({ error: 'visitor_not_found' }, 404)
  }

  const signals = visitor[0].signals as unknown as Parameters<
    typeof assessRisk
  >[0]['signals']

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || ''
  const userAgent = c.req.header('user-agent') || ''

  // Risk assessment with event context (triggers velocity + multi-account + new-device)
  const risk = await assessRisk({
    signals,
    ip,
    userAgent,
    visitorId: body.visitorId,
    event: body
  })

  // Log the event
  await db.insert(schema.events).values({
    visitorId: body.visitorId,
    eventType: body.event,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    recommendation: risk.recommendation,
    flags: risk.flags,
    metadata: body.metadata as Record<string, unknown>
  })

  return c.json({
    visitorId: body.visitorId,
    event: body.event,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    flags: risk.flags,
    recommendation: risk.recommendation,
    signals: risk.signals
  })
})
