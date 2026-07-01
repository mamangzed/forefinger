import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { detectVpn } from '../detectors/vpn.js'
import { detectBot } from '../detectors/bot.js'
import { detectIncognito } from '../detectors/incognito.js'
import { detectRegionSpoofing } from '../detectors/region-spoof.js'
import { detectMultiAccounting } from '../detectors/multi-account.js'
import { detectVelocity } from '../detectors/velocity.js'
import { detectNewDevice } from '../detectors/new-device.js'
import { detectVm } from '../detectors/vm.js'
import { detectBehavior } from '../detectors/behavior.js'
import type { CollectedSignals, RiskResult, DetectorResult, VerifyRequest } from '../types.js'

export interface RiskContext {
  signals: CollectedSignals
  ip: string
  userAgent: string
  ipCountry?: string
  visitorId?: string
  event?: VerifyRequest
  linkedId?: string
}

export interface RiskThresholds {
  block: number // default 70
  review: number // default 40
}

const DEFAULT_THRESHOLDS: RiskThresholds = { block: 70, review: 40 }

export async function assessRisk(ctx: RiskContext): Promise<RiskResult> {
  // Run all detectors in parallel
  const [vpn, bot, incognito, region, vm, behavior] = await Promise.all([
    detectVpn({ ip: ctx.ip, signals: ctx.signals, geoCountry: ctx.ipCountry }),
    Promise.resolve(
      detectBot({ signals: ctx.signals, userAgent: ctx.userAgent, ip: ctx.ip })
    ),
    Promise.resolve(detectIncognito(ctx.signals)),
    Promise.resolve(detectRegionSpoofing({ signals: ctx.signals, ipCountry: ctx.ipCountry })),
    Promise.resolve(detectVm(ctx.signals)),
    Promise.resolve(detectBehavior(ctx.signals))
  ])

  const flags: string[] = []
  const results: DetectorResult[] = [vpn, bot, incognito, region, vm, behavior]

  // Event-specific detectors
  if (ctx.event && ctx.visitorId) {
    const [multi, velocity, newDevice] = await Promise.all([
      detectMultiAccounting({ visitorId: ctx.visitorId, userId: ctx.event.metadata.userId }),
      detectVelocity({
        visitorId: ctx.visitorId,
        eventType: ctx.event.event,
        windowMinutes: 60,
        threshold: 5
      }),
      detectNewDevice({ visitorId: ctx.visitorId, thresholdMinutes: 10 })
    ])
    results.push(multi, velocity, newDevice)
  }

  // Collect flags from detected results
  for (const r of results) {
    if (r.detected) flags.push(r.flag)
  }

  // Aggregate score - weighted average of detected signals
  const detectedResults = results.filter((r) => r.detected)
  let riskScore: number
  if (detectedResults.length === 0) {
    riskScore = 0
  } else {
    // Take max signal score + small boost per additional flag
    const maxScore = Math.max(...detectedResults.map((r) => r.score))
    const boost = Math.min((detectedResults.length - 1) * 8, 24)
    riskScore = Math.min(maxScore + boost, 100)
  }

  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low'
  const recommendation =
    riskScore >= 70 ? 'block' : riskScore >= 40 ? 'review' : 'allow'

  // Persist risk to visitor record
  if (ctx.visitorId) {
    await db
      .update(schema.visitors)
      .set({
        riskScore,
        riskLevel: riskLevel as 'low' | 'medium' | 'high',
        flags,
        lastSeen: new Date()
      })
      .where(eq(schema.visitors.visitorId, ctx.visitorId))
  }

  return {
    riskScore,
    riskLevel,
    flags,
    recommendation,
    signals: {
      vpn: vpn.detected,
      bot: bot.detected,
      incognito: incognito.detected,
      regionSpoofing: region.detected,
      multiAccounting: results.find((r) => r.flag === 'multi_accounting')?.detected ?? false,
      newDevice: results.find((r) => r.flag === 'new_device')?.detected ?? false,
      suspiciousVelocity: results.find((r) => r.flag === 'suspicious_velocity')?.detected ?? false,
      vm: vm.detected,
      automation: behavior.detected
    }
  }
}

export function shouldBlock(score: number, thresholds: RiskThresholds = DEFAULT_THRESHOLDS): boolean {
  return score >= thresholds.block
}

export function shouldReview(score: number, thresholds: RiskThresholds = DEFAULT_THRESHOLDS): boolean {
  return score >= thresholds.review && score < thresholds.block
}
