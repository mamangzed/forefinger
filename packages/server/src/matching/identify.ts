import { eq, and, desc, sql } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { computeStableHash } from './stable-hash.js'
import { compareVolatile, type SimilarityResult } from './similarity.js'
import { cacheGet, cacheSet } from '../cache/redis.js'
import type { CollectedSignals, RiskResult } from '../types.js'

export interface IdentifyResult {
  visitorId: string
  isNew: boolean
  similarity: number
  matched: boolean
  risk?: RiskResult
}

export async function identifyVisitor(
  signals: CollectedSignals,
  clientStableHash: string,
  ip: string,
  userAgent: string
): Promise<IdentifyResult> {
  // Recompute hash server-side for integrity
  const serverHash = computeStableHash(signals.stable)

  // If client hash doesn't match, trust server hash
  const stableHash = serverHash === clientStableHash ? serverHash : serverHash

  // Check cache first
  const cacheKey = `visitor:hash:${stableHash}`
  const cached = await cacheGet<{ visitorId: string }>(cacheKey)
  if (cached) {
    await touchVisitor(cached.visitorId, signals, ip, userAgent, 100, true)
    return {
      visitorId: cached.visitorId,
      isNew: false,
      similarity: 100,
      matched: true
    }
  }

  // Lookup by stable hash - direct match
  const directMatch = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.stableHash, stableHash))
    .limit(1)

  if (directMatch.length > 0) {
    const existing = directMatch[0]
    // Verify with volatile similarity
    const storedVolatile = extractVolatile(existing.signals)
    const similarity = compareVolatile(signals.volatile, storedVolatile)

    await touchVisitor(
      existing.visitorId,
      signals,
      ip,
      userAgent,
      similarity.score,
      similarity.matched
    )
    await cacheSet(cacheKey, { visitorId: existing.visitorId }, 3600)

    return {
      visitorId: existing.visitorId,
      isNew: false,
      similarity: similarity.score,
      matched: similarity.matched
    }
  }

  // Check historical hashes (browser evolution)
  const hashMatch = await db
    .select()
    .from(schema.visitorHashes)
    .where(eq(schema.visitorHashes.stableHash, stableHash))
    .limit(1)

  if (hashMatch.length > 0) {
    const existing = await db
      .select()
      .from(schema.visitors)
      .where(eq(schema.visitors.visitorId, hashMatch[0].visitorId))
      .limit(1)
    if (existing.length > 0) {
      const storedVolatile = extractVolatile(existing[0].signals)
      const similarity = compareVolatile(signals.volatile, storedVolatile)
      if (similarity.matched) {
        await touchVisitor(
          existing[0].visitorId,
          signals,
          ip,
          userAgent,
          similarity.score,
          true
        )
        await cacheSet(cacheKey, { visitorId: existing[0].visitorId }, 3600)
        return {
          visitorId: existing[0].visitorId,
          isNew: false,
          similarity: similarity.score,
          matched: true
        }
      }
    }
  }

  // No match - create new visitor
  const visitorId = generateVisitorId()
  await db.insert(schema.visitors).values({
    visitorId,
    stableHash,
    signals: signals as unknown as Record<string, unknown>,
    riskScore: 0,
    riskLevel: 'low',
    flags: [],
    visitCount: 1,
    linkedAccounts: []
  })
  await db.insert(schema.visitorHashes).values({
    visitorId,
    stableHash,
    source: 'initial'
  })
  await logVisit(visitorId, signals, ip, userAgent, 100, [], true)
  await cacheSet(cacheKey, { visitorId }, 3600)

  return {
    visitorId,
    isNew: true,
    similarity: 100,
    matched: true
  }
}

function extractVolatile(
  signals: unknown
): import('../types.js').VolatileSignals {
  const s = signals as { volatile?: import('../types.js').VolatileSignals }
  return (
    s.volatile || {
      canvasHash: '',
      webglExts: [],
      webglParams: {},
      audioHash: '',
      fonts: [],
      userAgent: ''
    }
  )
}

async function touchVisitor(
  visitorId: string,
  signals: CollectedSignals,
  ip: string,
  userAgent: string,
  similarity: number,
  matched: boolean
): Promise<void> {
  await db
    .update(schema.visitors)
    .set({
      lastSeen: new Date(),
      visitCount: sql`${schema.visitors.visitCount} + 1`,
      signals: signals as unknown as Record<string, unknown>
    })
    .where(eq(schema.visitors.visitorId, visitorId))
  await logVisit(visitorId, signals, ip, userAgent, similarity, [], matched)
}

async function logVisit(
  visitorId: string,
  signals: CollectedSignals,
  ip: string,
  userAgent: string,
  similarity: number,
  flags: string[],
  matched: boolean
): Promise<void> {
  await db.insert(schema.visits).values({
    visitorId,
    ip: ip || null,
    userAgent,
    signals: signals as unknown as Record<string, unknown>,
    similarity,
    riskScore: 0,
    flags
  })
}

function generateVisitorId(): string {
  const random = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${time}${random}`.slice(0, 32)
}
