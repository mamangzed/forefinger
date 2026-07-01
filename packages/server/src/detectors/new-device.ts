import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import type { DetectorResult } from '../types.js'

export interface NewDeviceContext {
  visitorId: string
  thresholdMinutes: number
}

// New device - first seen recently
export async function detectNewDevice(ctx: NewDeviceContext): Promise<DetectorResult> {
  const visitor = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.visitorId, ctx.visitorId))
    .limit(1)

  if (visitor.length === 0) {
    return { flag: 'new_device', detected: true, score: 50, detail: 'unknown_visitor' }
  }

  const firstSeen = visitor[0].firstSeen
  const ageMinutes = (Date.now() - firstSeen.getTime()) / 60000

  let score = 0
  const reasons: string[] = []

  if (ageMinutes < ctx.thresholdMinutes) {
    score = 40
    reasons.push(`age:${Math.round(ageMinutes)}min`)
  } else if (ageMinutes < ctx.thresholdMinutes * 24) {
    score = 20
    reasons.push(`age:${Math.round(ageMinutes / 60)}h`)
  }

  const detected = score >= 40
  return {
    flag: 'new_device',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}
