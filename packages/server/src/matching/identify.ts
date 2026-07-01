import { eq, and, desc, sql } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { computeStableHash } from './stable-hash.js'
import { computeDeviceHash, normalizeGpu } from './device-hash.js'
import { compareVolatile, type SimilarityResult } from './similarity.js'
import { cacheGet, cacheSet } from '../cache/redis.js'
import { lookupGeo, type GeoResult } from '../geo/ipinfo.js'
import type { CollectedSignals, RiskResult } from '../types.js'

export interface IdentifyResult {
  visitorId: string
  isNew: boolean
  similarity: number
  matched: boolean
  risk?: RiskResult
  geo?: GeoResult
}

export async function identifyVisitor(
  signals: CollectedSignals,
  clientStableHash: string,
  ip: string,
  userAgent: string
): Promise<IdentifyResult> {
  // Recompute hashes server-side for integrity
  const stableHash = computeStableHash(signals.stable)
  const deviceHash = computeDeviceHash(signals.stable)

  // Resolve IP geolocation (cached)
  const geo = await lookupGeo(ip)

  // 1. Cache by device hash (cross-browser stable)
  const cacheKey = `visitor:device:${deviceHash}`
  const cached = await cacheGet<{ visitorId: string }>(cacheKey)
  if (cached) {
    await touchVisitor(cached.visitorId, signals, ip, userAgent, geo, 100, true)
    return { visitorId: cached.visitorId, isNew: false, similarity: 100, matched: true, geo }
  }

  // 2. Direct lookup by stable_hash (same browser, exact match)
  const directMatch = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.stableHash, stableHash))
    .limit(1)

  if (directMatch.length > 0) {
    const existing = directMatch[0]
    await ensureDeviceHash(existing.visitorId, deviceHash)
    await ensureCanvasHash(existing.visitorId, signals.volatile)
    await touchVisitor(existing.visitorId, signals, ip, userAgent, geo, 100, true)
    await cacheSet(cacheKey, { visitorId: existing.visitorId }, 3600)
    return { visitorId: existing.visitorId, isNew: false, similarity: 100, matched: true, geo }
  }

  // 2b. Canvas hash lookup — links incognito sessions of the SAME browser.
  // Canvas output depends on GPU/driver/font rendering, not browsing state,
  // so identical canvas (+ matching audio) across private windows = same browser.
  const canvasHash = signals.volatile.canvasHash
  const audioHash = signals.volatile.audioHash
  const isUsableCanvas = !!canvasHash && canvasHash !== 'no-canvas' && canvasHash !== 'canvas-error'
  const isUsableAudio = !!audioHash && audioHash !== 'no-audio' && audioHash !== 'audio-error'

  if (isUsableCanvas) {
    const canvasMatch = await db
      .select()
      .from(schema.canvasHashes)
      .where(eq(schema.canvasHashes.canvasHash, canvasHash))
      .limit(1)

    if (canvasMatch.length > 0) {
      const existing = await db
        .select()
        .from(schema.visitors)
        .where(eq(schema.visitors.visitorId, canvasMatch[0].visitorId))
        .limit(1)
      if (existing.length > 0) {
        const storedVolatile = extractVolatile(existing[0].signals)
        const similarity = compareVolatile(signals.volatile, storedVolatile)
        // Canvas + audio identical → very strong same-browser signal (incognito).
        // Canvas alone still needs WebGL/font overlap to avoid false links.
        const canvasAudioBothMatch = isUsableAudio && audioHash === storedVolatile.audioHash
        const threshold = canvasAudioBothMatch ? 40 : 55
        if (similarity.score >= threshold) {
          await ensureDeviceHash(existing[0].visitorId, deviceHash)
          await ensureStableHash(existing[0].visitorId, stableHash, 'incognito-link')
          await ensureCanvasHash(existing[0].visitorId, signals.volatile)
          await touchVisitor(existing[0].visitorId, signals, ip, userAgent, geo, similarity.score, similarity.matched)
          await cacheSet(cacheKey, { visitorId: existing[0].visitorId }, 3600)
          return {
            visitorId: existing[0].visitorId,
            isNew: false,
            similarity: similarity.score,
            matched: similarity.matched,
            geo
          }
        }
      }
    }
  }

  // 3. Cross-browser device hash lookup (Chrome vs Firefox on same device)
  const deviceMatch = await db
    .select()
    .from(schema.visitors)
    .where(eq(schema.visitors.deviceHash, deviceHash))
    .limit(1)

  if (deviceMatch.length > 0) {
    const existing = deviceMatch[0]
    // Verify with volatile similarity — device hash can collide across similar VMs
    const storedVolatile = extractVolatile(existing.signals)
    const similarity = compareVolatile(signals.volatile, storedVolatile)
    if (similarity.score >= 30) {
      // Cross-browser match: stable hash differs but same physical device.
      // Link this stable_hash to the existing visitor for future exact hits.
      await ensureStableHash(existing.visitorId, stableHash, 'cross-browser')
      await ensureDeviceHash(existing.visitorId, deviceHash)
      await touchVisitor(existing.visitorId, signals, ip, userAgent, geo, similarity.score, similarity.matched)
      await cacheSet(cacheKey, { visitorId: existing.visitorId }, 3600)
      return {
        visitorId: existing.visitorId,
        isNew: false,
        similarity: similarity.score,
        matched: similarity.matched,
        geo
      }
    }
  }

  // 4. Historical stable hash (browser version evolution)
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
        await ensureDeviceHash(existing[0].visitorId, deviceHash)
        await touchVisitor(existing[0].visitorId, signals, ip, userAgent, geo, similarity.score, true)
        await cacheSet(cacheKey, { visitorId: existing[0].visitorId }, 3600)
        return {
          visitorId: existing[0].visitorId,
          isNew: false,
          similarity: similarity.score,
          matched: true,
          geo
        }
      }
    }
  }

  // 5. New visitor
  const visitorId = generateVisitorId()
  await db.insert(schema.visitors).values({
    visitorId,
    stableHash,
    deviceHash,
    canvasHash: isUsableCanvas ? canvasHash : null,
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
  await db.insert(schema.deviceHashes).values({
    visitorId,
    deviceHash
  })
  if (isUsableCanvas) {
    await db.insert(schema.canvasHashes).values({
      visitorId,
      canvasHash,
      audioHash: isUsableAudio ? audioHash : null
    }).onConflictDoNothing({ target: [schema.canvasHashes.visitorId, schema.canvasHashes.canvasHash] })
  }
  await logVisit(visitorId, signals, ip, userAgent, geo, 100, [])
  await cacheSet(cacheKey, { visitorId }, 3600)

  return { visitorId, isNew: true, similarity: 100, matched: true, geo }
}

function extractVolatile(signals: unknown): import('../types.js').VolatileSignals {
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
  geo: GeoResult,
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
  await logVisit(visitorId, signals, ip, userAgent, geo, similarity, [])
}

async function logVisit(
  visitorId: string,
  signals: CollectedSignals,
  ip: string,
  userAgent: string,
  geo: GeoResult,
  similarity: number,
  flags: string[]
): Promise<void> {
  await db.insert(schema.visits).values({
    visitorId,
    ip: ip || null,
    country: geo.country,
    countryName: geo.countryName,
    city: geo.city,
    latitude: geo.latitude,
    longitude: geo.longitude,
    userAgent,
    signals: signals as unknown as Record<string, unknown>,
    similarity,
    riskScore: 0,
    flags
  })
}

async function ensureDeviceHash(visitorId: string, deviceHash: string): Promise<void> {
  try {
    await db
      .insert(schema.deviceHashes)
      .values({ visitorId, deviceHash })
      .onConflictDoNothing({ target: [schema.deviceHashes.visitorId, schema.deviceHashes.deviceHash] })
  } catch {
    // ignore dup
  }
  // Also persist on the visitors row for direct indexing
  await db
    .update(schema.visitors)
    .set({ deviceHash })
    .where(eq(schema.visitors.visitorId, visitorId))
}

async function ensureStableHash(visitorId: string, stableHash: string, source: string): Promise<void> {
  try {
    await db
      .insert(schema.visitorHashes)
      .values({ visitorId, stableHash, source })
      .onConflictDoNothing({ target: [schema.visitorHashes.visitorId, schema.visitorHashes.stableHash] })
  } catch {
    // ignore dup
  }
}

async function ensureCanvasHash(
  visitorId: string,
  volatile: import('../types.js').VolatileSignals
): Promise<void> {
  const canvasHash = volatile.canvasHash
  if (!canvasHash || canvasHash === 'no-canvas' || canvasHash === 'canvas-error') return
  const audioHash = volatile.audioHash
  const isUsableAudio = !!audioHash && audioHash !== 'no-audio' && audioHash !== 'audio-error'
  try {
    await db
      .insert(schema.canvasHashes)
      .values({
        visitorId,
        canvasHash,
        audioHash: isUsableAudio ? audioHash : null
      })
      .onConflictDoNothing({ target: [schema.canvasHashes.visitorId, schema.canvasHashes.canvasHash] })
  } catch {
    // ignore dup
  }
  await db
    .update(schema.visitors)
    .set({ canvasHash })
    .where(eq(schema.visitors.visitorId, visitorId))
}

function generateVisitorId(): string {
  const random = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${time}${random}`.slice(0, 32)
}
