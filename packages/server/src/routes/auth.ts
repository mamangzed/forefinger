import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  getCredentials,
  createSession,
  getSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  readSessionToken,
  type SessionEnv
} from '../middleware/session.js'

export const authRoute = new Hono<SessionEnv>()

const loginSchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1)
})

authRoute.post('/login', zValidator('json', loginSchema), async (c) => {
  const { user, password } = c.req.valid('json')
  const creds = getCredentials()

  if (user !== creds.user || password !== creds.pass) {
    return c.json({ error: 'invalid_credentials' }, 401)
  }

  const token = await createSession(user)
  setSessionCookie(c, token)
  return c.json({ ok: true, user })
})

authRoute.get('/me', async (c) => {
  const token = readSessionToken(c)
  const user = await getSession(token)
  if (!user) {
    return c.json({ authenticated: false }, 401)
  }
  return c.json({ authenticated: true, user })
})

authRoute.post('/logout', async (c) => {
  const token = readSessionToken(c)
  await destroySession(token)
  clearSessionCookie(c)
  return c.json({ ok: true })
})
