import { createHash } from 'node:crypto'
import type { StableSignals } from '../types.js'

// Server-side stable hash - must match SDK's hashObject output
export function computeStableHash(stable: StableSignals): string {
  const normalized = normalizeObject(stable as unknown as Record<string, unknown>)
  const json = JSON.stringify(normalized)
  return createHash('sha256').update(json).digest('hex')
}

// Sort object keys recursively for deterministic output (mirrors SDK)
function normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      sorted[key] = normalizeObject(val as Record<string, unknown>)
    } else if (Array.isArray(val)) {
      sorted[key] = [...val].sort()
    } else {
      sorted[key] = val
    }
  }
  return sorted
}
