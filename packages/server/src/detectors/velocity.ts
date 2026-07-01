import { and, eq, gte } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import type { DetectorResult } from '../types.js'

export interface VelocityContext {
  visitorId: string
  eventType: string
  windowMinutes: number
  threshold: number
}

// Velocity check - too many events in time window
export async function detectVelocity(ctx: VelocityContext): Promise<DetectorResult> {
  const since = new Date(Date.now() - ctx.windowMinutes * 60 * 1000)
  const recent = await db
    .select({ count: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.visitorId, ctx.visitorId),
        eq(schema.events.eventType, ctx.eventType),
        gte(schema.events.createdAt, since)
      )
    )

  const count = recent.length
  let score = 0
  const reasons: string[] = []

  if (count >= ctx.threshold) {
    score = 60
    reasons.push(`${count}_in_${ctx.windowMinutes}min`)
  } else if (count >= ctx.threshold * 0.7) {
    score = 30
    reasons.push(`approaching_threshold:${count}`)
  }

  const detected = score >= 50
  return {
    flag: 'suspicious_velocity',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}
