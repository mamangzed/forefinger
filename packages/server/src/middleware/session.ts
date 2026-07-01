import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { randomBytes } from 'node:crypto'
import { redis } from '../cache/redis.js'

export interface SessionEnv {
  Variables: {
    sessionUser?: string
  }
}

const SESSION_TTL = 86400 // 24h
const COOKIE_NAME = 'fp_session'

export function getCredentials(): { user: string; pass: string; isDefault: boolean } {
  const user = process.env.DASHBOARD_USER || 'admin'
  const pass = process.env.DASHBOARD_PASSWORD || ''
  const isDefault = !process.env.DASHBOARD_PASSWORD
  // Dev fallback: if no password configured, use a default and warn
  const finalPass = pass || 'changeme'
  return { user, pass: finalPass, isDefault }
}

export async function createSession(user: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await redis.set(`session:${token}`, user, 'EX', SESSION_TTL)
  return token
}

export async function getSession(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const user = await redis.get(`session:${token}`)
    return user || null
  } catch {
    return null
  }
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return
  try {
    await redis.del(`session:${token}`)
  } catch {
    // ignore
  }
}

export function setSessionCookie(c: Parameters<ReturnType<typeof createMiddleware<SessionEnv>>>[0] & {
  header: (k: string, v: string) => void
}, token: string): void {
  const isTls = process.env.ENABLE_TLS === 'true'
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL}`,
    isTls ? 'Secure' : ''
  ]
    .filter(Boolean)
    .join('; ')
  c.header('Set-Cookie', cookie)
}

export function clearSessionCookie(c: Parameters<ReturnType<typeof createMiddleware<SessionEnv>>>[0] & {
  header: (k: string, v: string) => void
}): void {
  c.header('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export function readSessionToken(c: { req: { header: (k: string) => string | undefined } }): string | undefined {
  // hono getCookie needs Context; parse manually from header for middleware compat
  const cookieHeader = c.req.header('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)fp_session=([^;]+)/)
  return match ? match[1] : undefined
}

// Gate /api/dashboard/* behind a valid session. Login + me endpoints are public.
export const sessionAuth = createMiddleware<SessionEnv>(async (c, next) => {
  const path = c.req.path

  // Public auth endpoints
  if (path === '/api/auth/login' || path === '/api/auth/me') {
    return next()
  }
  // Only gate dashboard API (UI/assets/cdn served freely; SPA gates itself client-side)
  if (!path.startsWith('/api/dashboard')) {
    return next()
  }

  const token = readSessionToken(c)
  const user = await getSession(token)
  if (!user) {
    return c.json({ error: 'unauthorized', login: true }, 401)
  }
  c.set('sessionUser', user)
  await next()
})
