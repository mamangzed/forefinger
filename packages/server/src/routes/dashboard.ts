import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, desc, sql, and, gte, count } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { hashKey, generateApiKey } from '../middleware/auth.js'
import { parseUA, formatBrowser } from '../utils/ua.js'

function enrichVisit(v: typeof schema.visits.$inferSelect) {
  const ua = parseUA(v.userAgent || '')
  return {
    id: v.id,
    ip: v.ip,
    country: v.country,
    countryName: v.countryName,
    city: v.city,
    latitude: v.latitude,
    longitude: v.longitude,
    browser: formatBrowser(ua),
    os: ua.os,
    device: ua.device,
    incognito: (v.flags || []).includes('incognito'),
    vpn: (v.flags || []).includes('vpn'),
    riskScore: v.riskScore,
    riskLevel: v.riskLevel,
    flags: v.flags,
    createdAt: v.createdAt
  }
}

export const dashboardRoute = new Hono()

// Stats overview
dashboardRoute.get('/stats', async (c) => {
  const days = Number(c.req.query('days') || 7)
  const since = new Date(Date.now() - days * 86400000)

  const [totalResult] = await db
    .select({ total: count() })
    .from(schema.visitors)

  const [todayResult] = await db
    .select({ total: count() })
    .from(schema.visits)
    .where(gte(schema.visits.createdAt, new Date(Date.now() - 86400000)))

  const [botResult] = await db
    .select({ total: count() })
    .from(schema.visitors)
    .where(sql`${schema.visitors.flags} @> ARRAY['bot']::text[]`)

  const [vpnResult] = await db
    .select({ total: count() })
    .from(schema.visitors)
    .where(sql`${schema.visitors.flags} @> ARRAY['vpn']::text[]`)

  const [highRiskResult] = await db
    .select({ total: count() })
    .from(schema.visitors)
    .where(gte(schema.visitors.riskScore, 70))

  // Daily timeseries
  const timeseries = await db
    .select({
      date: sql<string>`DATE(${schema.visits.createdAt})`.as('date'),
      count: count()
    })
    .from(schema.visits)
    .where(gte(schema.visits.createdAt, since))
    .groupBy(sql`DATE(${schema.visits.createdAt})`)
    .orderBy(sql`DATE(${schema.visits.createdAt})`)

  // Top countries
  const topCountries = await db
    .select({
      country: schema.visits.country,
      count: count()
    })
    .from(schema.visits)
    .where(and(gte(schema.visits.createdAt, since), sql`${schema.visits.country} IS NOT NULL`))
    .groupBy(schema.visits.country)
    .orderBy(desc(count()))
    .limit(10)

  // Risk distribution
  const riskDist = await db
    .select({
      level: schema.visitors.riskLevel,
      count: count()
    })
    .from(schema.visitors)
    .groupBy(schema.visitors.riskLevel)

  const distribution: Record<string, number> = { low: 0, medium: 0, high: 0 }
  for (const r of riskDist) {
    distribution[r.level] = r.count
  }

  return c.json({
    totalVisitors: totalResult?.total || 0,
    uniqueToday: todayResult?.total || 0,
    botCount: botResult?.total || 0,
    vpnCount: vpnResult?.total || 0,
    highRiskCount: highRiskResult?.total || 0,
    timeseries: timeseries.map((t) => ({ date: t.date, count: t.count })),
    topCountries: topCountries.map((t) => ({ country: t.country, count: t.count })),
    riskDistribution: distribution
  })
})

// Paginated visitors list
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  risk: z.enum(['low', 'medium', 'high']).optional(),
  flag: z.string().optional()
})

dashboardRoute.get('/visitors', zValidator('query', paginationSchema), async (c) => {
  const { page, limit, risk, flag } = c.req.valid('query')
  const offset = (page - 1) * limit

  const conditions = []
  if (risk) conditions.push(eq(schema.visitors.riskLevel, risk))
  if (flag) conditions.push(sql`${schema.visitors.flags} @> ARRAY[${flag}]::text[]`)
  const where = conditions.length > 0
    ? (conditions.length === 1 ? conditions[0] : and(...conditions))
    : undefined

  const visitors = await db
    .select({
      visitorId: schema.visitors.visitorId,
      riskScore: schema.visitors.riskScore,
      riskLevel: schema.visitors.riskLevel,
      flags: schema.visitors.flags,
      visitCount: schema.visitors.visitCount,
      firstSeen: schema.visitors.firstSeen,
      lastSeen: schema.visitors.lastSeen
    })
    .from(schema.visitors)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(schema.visitors.lastSeen))
  const [totalResult] = await db.select({ total: count() }).from(schema.visitors)

  return c.json({
    visitors,
    page,
    limit,
    total: totalResult?.total || 0,
    totalPages: Math.ceil((totalResult?.total || 0) / limit)
  })
})

// Visitor detail
dashboardRoute.get('/visitors/:id', async (c) => {
  const id = c.req.param('id')
  const visitor = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.visitorId, id))
    .limit(1)

  if (visitor.length === 0) {
    return c.json({ error: 'not_found' }, 404)
  }

  const visitHistory = await db
    .select()
    .from(schema.visits)
    .where(eq(schema.visits.visitorId, id))
    .orderBy(desc(schema.visits.createdAt))
    .limit(100)

  const eventHistory = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.visitorId, id))
    .orderBy(desc(schema.events.createdAt))
    .limit(100)

  // Weekly summary: visits, incognito sessions, distinct IPs, distinct locations
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const weekVisits = visitHistory.filter((v) => v.createdAt >= weekAgo)
  const distinctIps = new Set(weekVisits.map((v) => v.ip).filter(Boolean)).size
  const distinctLocations = new Set(
    weekVisits
      .map((v) => [v.city, v.countryName].filter(Boolean).join(', '))
      .filter(Boolean)
  ).size
  const incognitoSessions = weekVisits.filter((v) => (v.flags || []).includes('incognito')).length

  return c.json({
    visitor: visitor[0],
    visits: visitHistory.map(enrichVisit),
    events: eventHistory,
    summary: {
      totalVisits: visitHistory.length,
      weeklyVisits: weekVisits.length,
      incognitoSessions,
      distinctIps,
      distinctLocations,
      firstSeen: visitor[0].firstSeen,
      lastSeen: visitor[0].lastSeen
    }
  })
})

// Events log
dashboardRoute.get('/events', async (c) => {
  const limit = Number(c.req.query('limit') || 50)
  const eventType = c.req.query('type')
  const level = c.req.query('level')

  const conditions = []
  if (eventType) conditions.push(eq(schema.events.eventType, eventType))
  if (level) conditions.push(eq(schema.events.riskLevel, level as 'low' | 'medium' | 'high'))
  const where = conditions.length > 0
    ? (conditions.length === 1 ? conditions[0] : and(...conditions))
    : undefined

  const events = await db
    .select()
    .from(schema.events)
    .where(where)
    .orderBy(desc(schema.events.createdAt))
    .limit(limit)
  return c.json({ events })
})

// Settings
dashboardRoute.get('/settings', async (c) => {
  const rows = await db.select().from(schema.settings)
  const settingsMap: Record<string, unknown> = {}
  for (const r of rows) {
    settingsMap[r.key] = r.value
  }
  return c.json({ settings: settingsMap })
})

const settingsSchema = z.object({
  riskThresholds: z
    .object({ block: z.number(), review: z.number() })
    .optional(),
  enabledDetectors: z.record(z.string(), z.boolean()).optional()
})

dashboardRoute.post('/settings', zValidator('json', settingsSchema), async (c) => {
  const body = c.req.valid('json')

  if (body.riskThresholds) {
    await db
      .insert(schema.settings)
      .values({ key: 'riskThresholds', value: body.riskThresholds as Record<string, unknown> })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value: body.riskThresholds as Record<string, unknown> }
      })
  }

  if (body.enabledDetectors) {
    await db
      .insert(schema.settings)
      .values({ key: 'enabledDetectors', value: body.enabledDetectors as Record<string, unknown> })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value: body.enabledDetectors as Record<string, unknown> }
      })
  }

  return c.json({ ok: true })
})

// API key management
dashboardRoute.post('/api-keys', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { label?: string }
  const key = generateApiKey()
  const keyHash = hashKey(key)

  await db.insert(schema.apiKeys).values({
    keyHash,
    label: body.label || 'default'
  })

  return c.json({ apiKey: key, label: body.label || 'default' })
})

dashboardRoute.get('/api-keys', async (c) => {
  const keys = await db
    .select({
      id: schema.apiKeys.id,
      label: schema.apiKeys.label,
      active: schema.apiKeys.active,
      createdAt: schema.apiKeys.createdAt
    })
    .from(schema.apiKeys)
    .orderBy(desc(schema.apiKeys.createdAt))
  return c.json({ keys })
})

dashboardRoute.delete('/api-keys/:id', async (c) => {
  const id = c.req.param('id')
  await db
    .update(schema.apiKeys)
    .set({ active: false })
    .where(eq(schema.apiKeys.id, id))
  return c.json({ ok: true })
})
