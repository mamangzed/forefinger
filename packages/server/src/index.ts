import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { apiKeyAuth, rateLimiter, cors } from './middleware/auth.js'
import { collectRoute } from './routes/collect.js'
import { identifyRoute } from './routes/identify.js'
import { verifyRoute } from './routes/verify.js'
import { dashboardRoute } from './routes/dashboard.js'
import { ensureSchema } from './db/migrate.js'

const app = new Hono()

// Global middleware
app.use('*', cors)
app.use('/api/*', apiKeyAuth)
app.use('/api/*', rateLimiter)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }))

// API routes
app.route('/api/collect', collectRoute)
app.route('/api/identify', identifyRoute)
app.route('/api/verify', verifyRoute)
app.route('/api/dashboard', dashboardRoute)

// Serve SDK from CDN path
app.use(
  '/cdn/*',
  serveStatic({
    root: '../sdk/dist',
    rewriteRequestPath: (path) => path.replace(/^\/cdn/, '')
  })
)

// Serve dashboard SPA
app.use(
  '/assets/*',
  serveStatic({ root: '../dashboard/dist/assets' })
)
app.get('*', serveStatic({ root: '../dashboard/dist', path: '/index.html' }))

// Error handler
app.onError((err, c) => {
  console.error('[server] unhandled error:', err)
  return c.json({ error: 'internal_error', message: err.message }, 500)
})

const port = Number(process.env.PORT || 3000)

async function start() {
  // Ensure DB schema on startup
  try {
    await ensureSchema()
    console.log('[db] schema ready')
  } catch (err) {
    console.error('[db] schema setup failed:', err)
  }

  try {
    serve({ fetch: app.fetch, port }, (info) => {
      console.log(`[server] fingerprint SaaS running on http://localhost:${info.port}`)
    })
  } catch (err) {
    console.error('[server] failed to bind port', port, err)
    process.exit(1)
  }
}

// Crash protection - log unhandled rejections instead of silent exit
process.on('unhandledRejection', (err) => {
  console.error('[server] unhandled rejection:', err)
})

start()
