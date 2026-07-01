import type { DetectorResult, CollectedSignals } from '../types.js'

// Incognito/private mode detection
// SDK-side hints embedded in signals; server evaluates
export function detectIncognito(signals: CollectedSignals): DetectorResult {
  let score = 0
  const reasons: string[] = []

  // Incognito signals come from SDK's network collector and stable signals
  // The SDK may include incognito hints via extended signals
  const extended = signals as CollectedSignals & {
    incognito?: {
      storageQuotaLow?: boolean
      indexedDbBlocked?: boolean
      localStorageBlocked?: boolean
    }
  }

  if (extended.incognito?.storageQuotaLow) {
    score += 35
    reasons.push('low_storage_quota')
  }
  if (extended.incognito?.indexedDbBlocked) {
    score += 30
    reasons.push('indexeddb_blocked')
  }
  if (extended.incognito?.localStorageBlocked) {
    score += 30
    reasons.push('localstorage_blocked')
  }

  // Cookie disabled often correlates with private browsing
  if (!signals.stable.cookieEnabled) {
    score += 20
    reasons.push('cookies_disabled')
  }

  const detected = score >= 30
  return {
    flag: 'incognito',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}
