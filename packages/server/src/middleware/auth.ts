import { createMiddleware } from 'hono/factory'
import { createHash, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { rateLimit } from '../cache/redis.js'

export interface AuthEnv {
  Variables: {
    apiKey?: string
    rateLimit?: { remaining: number; resetAt: number }
  }
}

const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  '/api/collect': { limit: 1000, window: 60 },
  '/api/identify': { limit: 500, window: 60 },
  '/api/verify': { limit: 500, window: 60 },
  default: { limit: 200, window: 60 }
}

// API key authentication middleware
export const apiKeyAuth = createMiddleware<AuthEnv>(async (c, next) => {
  // Dashboard UI + CDN SDK served without API key
  if (c.req.path === '/' || c.req.path.startsWith('/assets/') || c.req.path.startsWith('/cdn/')) {
    return next()
  }
  // Dashboard API uses session auth (see sessionAuth middleware), not API key
  if (c.req.path.startsWith('/api/dashboard') || c.req.path.startsWith('/api/auth')) {
    return next()
  }
  if (!c.req.path.startsWith('/api/')) {
    return next()
  }

  const key =
    c.req.header('X-FP-Key') ||
    c.req.header('Authorization')?.replace('Bearer ', '') ||
    ''

  if (!key) {
    return c.json({ error: 'missing_api_key' }, 401)
  }

  const keyHash = hashKey(key)
  const valid = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, keyHash))
    .limit(1)

  if (valid.length === 0 || !valid[0].active) {
    return c.json({ error: 'invalid_api_key' }, 401)
  }

  c.set('apiKey', key)
  await next()
})

// Rate limiting middleware
export const rateLimiter = createMiddleware<AuthEnv>(async (c, next) => {
  // Only rate-limit SDK endpoints (which carry an API key)
  if (!c.req.path.startsWith('/api/') || c.req.path.startsWith('/api/dashboard')) {
    return next()
  }

  const apiKey = c.get('apiKey') || 'anonymous'
  const path = c.req.path
  const config = RATE_LIMITS[path] || RATE_LIMITS.default
  const key = `rate:${apiKey}:${path}`

  const result = await rateLimit(key, config.limit, config.window)
  c.set('rateLimit', { remaining: result.remaining, resetAt: result.resetAt })

  c.header('X-RateLimit-Remaining', String(result.remaining))
  c.header('X-RateLimit-Reset', String(result.resetAt))

  if (!result.allowed) {
    return c.json({ error: 'rate_limit_exceeded' }, 429)
  }

  await next()
})

// CORS - restrict to registered origins
export const cors = createMiddleware<AuthEnv>(async (c, next) => {
  const origin = c.req.header('Origin')
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, X-FP-Key, X-FP-Timestamp, X-FP-Signature, Authorization')
    c.header('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-RateLimit-Reset')
    c.header('Access-Control-Max-Age', '86400')
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204)
  }

  await next()
})

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(): string {
  const random = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 24)
  return `fp_live_${random}`
}

// Timing-safe key comparison helper
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
