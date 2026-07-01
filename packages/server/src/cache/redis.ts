import { Redis } from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
})

redis.on('error', (err: Error) => {
  if (process.env.LOG_LEVEL === 'debug') {
    console.error('[redis] error:', err.message)
  }
})

// Cache helper with JSON serialization
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key)
    if (!val) return null
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    // ignore
  }
}

// Sliding window rate limiter
export async function rateLimit(
  key: string,
  limit: number,
  windowSec = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - windowSec

  try {
    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart)
    // Count current
    const count = await redis.zcard(key)
    if (count >= limit) {
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
      const resetAt = oldest.length > 1 ? Math.ceil(Number(oldest[1])) + windowSec : now + windowSec
      return { allowed: false, remaining: 0, resetAt }
    }
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`)
    await redis.expire(key, windowSec)
    return { allowed: true, remaining: limit - count - 1, resetAt: now + windowSec }
  } catch {
    // On redis failure, allow request (fail open)
    return { allowed: true, remaining: limit, resetAt: now + windowSec }
  }
}
