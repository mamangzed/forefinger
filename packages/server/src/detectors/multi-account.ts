import { eq, sql } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import type { DetectorResult } from '../types.js'

export interface MultiAccountContext {
  visitorId: string
  userId?: string
}

// Multi-accounting - same device linked to multiple user accounts
export async function detectMultiAccounting(
  ctx: MultiAccountContext
): Promise<DetectorResult> {
  const reasons: string[] = []
  let score = 0

  if (!ctx.userId) {
    return { flag: 'multi_accounting', detected: false, score: 0 }
  }

  // Get current linked accounts for this visitor
  const visitor = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.visitorId, ctx.visitorId))
    .limit(1)

  if (visitor.length === 0) {
    return { flag: 'multi_accounting', detected: false, score: 0 }
  }

  const linkedAccounts = visitor[0].linkedAccounts || []
  const isNewAccount = !linkedAccounts.includes(ctx.userId)

  if (isNewAccount) {
    // Add this userId to linked accounts
    const updated = [...linkedAccounts, ctx.userId]
    await db
      .update(schema.visitors)
      .set({ linkedAccounts: updated })
      .where(eq(schema.visitors.visitorId, ctx.visitorId))
  }

  // Count distinct accounts on this device
  const currentAccounts = isNewAccount
    ? [...linkedAccounts, ctx.userId]
    : linkedAccounts

  if (currentAccounts.length >= 3) {
    score = 80
    reasons.push(`accounts:${currentAccounts.length}`)
  } else if (currentAccounts.length === 2) {
    score = 40
    reasons.push('two_accounts')
  }

  const detected = score >= 40
  return {
    flag: 'multi_accounting',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}
