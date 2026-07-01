import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, desc, sql } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { cacheGet, cacheSet } from '../cache/redis.js'
import { identifyVisitor } from '../matching/identify.js'
import type { AuthEnv } from '../middleware/auth.js'

const identifySchema = z.object({
  visitorId: z.string().optional(),
  signals: z
    .object({
      stable: z.object({}).passthrough(),
      volatile: z.object({}).passthrough(),
      timestamp: z.number()
    })
    .optional(),
  stableHash: z.string().optional()
}).refine((d) => d.visitorId || (d.signals && d.stableHash), {
  message: 'must provide visitorId or signals+stableHash'
})

export const identifyRoute = new Hono<AuthEnv>()

identifyRoute.post('/', zValidator('json', identifySchema), async (c) => {
  const body = c.req.valid('json')
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || ''
  const userAgent = c.req.header('user-agent') || ''

  let visitorId: string

  if (body.visitorId) {
    // Direct lookup by visitorId
    const cacheKey = `visitor:${body.visitorId}`
    let visitor = await cacheGet<typeof schema.visitors.$inferSelect>(cacheKey)

    if (!visitor) {
      const rows = await db
        .select()
        .from(schema.visitors)
        .where(eq(schema.visitors.visitorId, body.visitorId))
        .limit(1)
      if (rows.length === 0) {
        return c.json({ error: 'visitor_not_found' }, 404)
      }
      visitor = rows[0]
      await cacheSet(cacheKey, visitor, 3600)
    }

    const recentVisits = await db
      .select()
      .from(schema.visits)
      .where(eq(schema.visits.visitorId, body.visitorId))
      .orderBy(desc(schema.visits.createdAt))
      .limit(20)

    return c.json({
      visitorId: visitor.visitorId,
      firstSeen: visitor.firstSeen,
      lastSeen: visitor.lastSeen,
      visitCount: visitor.visitCount,
      riskScore: visitor.riskScore,
      riskLevel: visitor.riskLevel,
      flags: visitor.flags,
      linkedAccounts: visitor.linkedAccounts,
      recentVisits: recentVisits.map((v) => ({
        ip: v.ip,
        country: v.country,
        createdAt: v.createdAt,
        riskScore: v.riskScore,
        flags: v.flags
      }))
    })
  }

  // Re-match from signals
  const result = await identifyVisitor(
    body.signals as unknown as Parameters<typeof identifyVisitor>[0],
    body.stableHash!,
    ip,
    userAgent
  )

  return c.json({
    visitorId: result.visitorId,
    isNew: result.isNew,
    similarity: result.similarity,
    matched: result.matched
  })
})
