# Fingerprint SaaS

Self-hosted browser fingerprint SaaS — bot detection, VPN detection, incognito detection, region spoofing, multi-accounting, payment fraud prevention.

## Quick Start

```bash
# 1. Copy env
cp .env.example .env

# 2. Start everything (app + postgres + redis)
docker compose up -d

# 3. Create your first API key
curl -X POST http://localhost:3000/api/dashboard/api-keys \
  -H "Content-Type: application/json" \
  -d '{"label":"my-app"}'
# → {"apiKey":"fp_live_xxxx","label":"my-app"}
```

Dashboard: http://localhost:3000
API: http://localhost:3000/api

## Usage

### Browser SDK (CDN)

```html
<script src="http://localhost:3000/cdn/fp.min.js"></script>
<script>
  FP.collect({ apiKey: 'fp_live_xxxx' }).then(result => {
    console.log('visitorId:', result.visitorId)
    console.log('risk:', result.risk)
  })
</script>
```

### Server SDK (npm)

```bash
npm install @yourfp/server-sdk
```

```typescript
import { FingerprintServer } from '@yourfp/server-sdk'

const fp = new FingerprintServer({
  apiKey: 'fp_live_xxxx',
  endpoint: 'http://localhost:3000'
})

// Identify visitor
const visitor = await fp.identify('visitorId_here')

// Verify payment
const risk = await fp.verify({
  visitorId: 'visitorId_here',
  event: 'payment',
  metadata: { amount: 500000, country: 'ID', userId: 'user@example.com' }
})
if (risk.recommendation === 'block') {
  // reject payment
}

// Bot check
const { isBot, confidence } = await fp.isBot('visitorId_here')
```

## Architecture

- **`packages/sdk`** — Browser fingerprint SDK (canvas, WebGL, audio, fonts, stable signals)
- **`packages/server`** — Hono API, Drizzle ORM, PostgreSQL, Redis, risk scoring
- **`packages/server-sdk`** — npm client for customer backends
- **`packages/dashboard`** — React SPA (analytics, visitor detail, events, settings)

## Detection Modules

| Module | What it detects |
|--------|----------------|
| VPN | Datacenter IPs, WebRTC leaks, timezone/geo mismatch |
| Bot | Headless browsers, automation frameworks, bot UAs |
| Incognito | Storage quota, IndexedDB/localStorage blocked |
| Region spoofing | Timezone vs IP country, language mismatch |
| Multi-accounting | Multiple user accounts on one device |
| Velocity | Too many events in time window |
| New device | First seen recently |

## Matching Algorithm (Hybrid)

1. **Stable hash** — SHA-256 of CPU, GPU, screen, timezone, platform → fast lookup
2. **Similarity scoring** — canvas/WebGL/audio/fonts compared, threshold 80 (match) / 50 (possible)
3. **Hash evolution** — browser updates handled by storing historical hashes per visitor

## API Endpoints

```
POST /api/collect     — receive signals, return visitorId + risk
POST /api/identify    — query visitor by ID or re-match signals
POST /api/verify      — verify event (payment/login), return risk assessment
GET  /api/dashboard/* — analytics, visitor list, events, settings
```

## Development

```bash
pnpm install
pnpm db:push          # create tables
pnpm dev              # start all packages in dev mode
pnpm build            # build all packages
pnpm test             # run all tests
```
