import type { DetectorResult, CollectedSignals } from '../types.js'

interface BehaviorData {
  mouseMoves?: number
  mouseMoveIntervalStd?: number
  mouseMoveDistanceMean?: number
  mouseStraightness?: number
  keydowns?: number
  keyIntervalStd?: number
  scrolls?: number
  scrollVelocityChanges?: number
  touches?: number
  durationMs?: number
  idleRatio?: number
}

// Behavioral bot detection. Humans have jitter, pauses, curved trajectories,
// variable cadence. Bots/automation produce: very few or no events (headless),
// perfectly regular intervals (stddev ~0), straight mouse paths (straightness ~1),
// zero idle, instant fill.
export function detectBehavior(signals: CollectedSignals): DetectorResult {
  let score = 0
  const reasons: string[] = []

  const b = (signals as CollectedSignals & { behavior?: BehaviorData }).behavior

  // No behavior sample at all — either SDK skipped or headless with no interaction
  if (!b) {
    return { flag: 'behavior', detected: false, score: 0, detail: 'no_sample' }
  }

  // 1. Zero interaction during a non-trivial window — strong automation signal
  if (b.durationMs && b.durationMs > 2000 && b.mouseMoves === 0 && b.keydowns === 0 && b.scrolls === 0 && b.touches === 0) {
    score += 50
    reasons.push('no_interaction')
  }

  // 2. Perfectly regular mouse intervals (real humans have stddev > 5ms)
  if (b.mouseMoves && b.mouseMoves > 5) {
    if ((b.mouseMoveIntervalStd ?? 0) < 1.5) {
      score += 35
      reasons.push(`regular_mouse:${(b.mouseMoveIntervalStd ?? 0).toFixed(2)}`)
    }
    // 3. Straight-line mouse movement (displacement ≈ total path)
    if ((b.mouseStraightness ?? 0) > 0.95) {
      score += 25
      reasons.push(`straight_mouse:${(b.mouseStraightness ?? 0).toFixed(2)}`)
    }
  }

  // 4. Many keystrokes with zero cadence variance (instant/typed fill)
  if (b.keydowns && b.keydowns > 3) {
    if ((b.keyIntervalStd ?? 0) < 5) {
      score += 30
      reasons.push(`regular_keys:${(b.keyIntervalStd ?? 0).toFixed(2)}`)
    }
  }

  // 5. Zero idle — humans almost always pause at least once
  if (b.durationMs && b.durationMs > 3000 && (b.idleRatio ?? 1) < 0.01) {
    score += 20
    reasons.push('no_idle')
  }

  // 6. Positive signal: humans have variance + idle + curves (lower risk)
  if (b.mouseMoves && b.mouseMoves > 10 && (b.mouseMoveIntervalStd ?? 0) > 10 && (b.idleRatio ?? 0) > 0.05) {
    score = Math.max(0, score - 25)
  }

  const detected = score >= 40
  return {
    flag: 'behavior',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}
