// Hashing utilities - SHA-256 for stable signal hashing

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Normalize object keys deterministically (sorted) then hash
export async function hashObject(obj: Record<string, unknown>): Promise<string> {
  const normalized = normalizeObject(obj)
  return sha256(JSON.stringify(normalized))
}

// Sort object keys recursively for deterministic output
function normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    const val = obj[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      sorted[key] = normalizeObject(val as Record<string, unknown>)
    } else if (Array.isArray(val)) {
      sorted[key] = [...val].sort()
    } else {
      sorted[key] = val
    }
  }
  return sorted
}
