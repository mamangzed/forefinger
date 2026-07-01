import type { DetectorResult, CollectedSignals } from '../types.js'

export interface BotContext {
  signals: CollectedSignals
  userAgent: string
  ip: string
}

// Bot/automation detection - client + server signals
export function detectBot(ctx: BotContext): DetectorResult {
  let score = 0
  const reasons: string[] = []

  const ua = ctx.userAgent.toLowerCase()
  const stable = ctx.signals.stable
  const volatile = ctx.signals.volatile

  // 1. Known bot user agents
  const botUaPatterns = [
    /headless/i, /phantom/i, /nightmare/i, /selenium/i, /puppeteer/i,
    /playwright/i, /webdriver/i, /bot/i, /crawler/i, /spider/i,
    /curl/i, /wget/i, /python-requests/i, /httpclient/i, /okhttp/i,
    /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
    /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
    /ahrefsi/i, /semrush/i
  ]
  for (const pattern of botUaPatterns) {
    if (pattern.test(ua)) {
      score += 50
      reasons.push(`bot_ua:${pattern.source}`)
      break
    }
  }

  // 2. Headless Chrome indicators (in user agent)
  if (/headlesschrome/i.test(ua)) {
    score += 40
    reasons.push('headless_chrome')
  }

  // 3. Inconsistent platform vs user agent
  // e.g., platform=Linux but UA says Windows
  const uaPlatform = inferUaPlatform(ua)
  if (uaPlatform && stable.platform && !stable.platform.toLowerCase().includes(uaPlatform)) {
    // Some browsers report different platform; only flag gross mismatches
    if (!stable.platform.toLowerCase().includes('win') && uaPlatform === 'windows') {
      score += 20
      reasons.push('platform_ua_mismatch')
    }
  }

  // 4. Missing or zero hardware concurrency (headless often returns 0)
  if (stable.cpuCores === 0) {
    score += 15
    reasons.push('zero_cpu_cores')
  }

  // 5. Empty volatile signals (headless may block canvas/webgl)
  if (volatile.canvasHash === 'no-canvas' || volatile.canvasHash === 'canvas-error') {
    score += 25
    reasons.push('no_canvas')
  }
  if (volatile.audioHash === 'no-audio' || volatile.audioHash === 'audio-error') {
    score += 20
    reasons.push('no_audio')
  }
  if (volatile.webglExts.length === 0) {
    score += 20
    reasons.push('no_webgl')
  }

  // 6. No fonts detected (headless/clean environment)
  if (volatile.fonts.length < 3) {
    score += 15
    reasons.push('few_fonts')
  }

  const detected = score >= 40
  return {
    flag: 'bot',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}

function inferUaPlatform(ua: string): string | null {
  if (/windows/.test(ua)) return 'windows'
  if (/macintosh|mac os|iphone|ipad/.test(ua)) return 'mac'
  if (/linux|android/.test(ua)) return 'linux'
  return null
}
