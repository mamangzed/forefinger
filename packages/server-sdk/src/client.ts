import type {
  FingerprintServerOptions,
  IdentifyResult,
  VerifyOptions,
  RiskResult,
  BotCheckResult
} from './types.js'

export class FingerprintServer {
  private apiKey: string
  private endpoint: string
  private timeout: number

  constructor(options: FingerprintServerOptions) {
    if (!options.apiKey) throw new Error('apiKey required')
    if (!options.endpoint) throw new Error('endpoint required')
    this.apiKey = options.apiKey
    this.endpoint = options.endpoint.replace(/\/$/, '')
    this.timeout = options.timeout ?? 10000
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const res = await fetch(`${this.endpoint}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FP-Key': this.apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new FingerprintError(
          `request failed: ${res.status}`,
          res.status,
          text
        )
      }

      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  async identify(visitorId: string): Promise<IdentifyResult> {
    return this.request<IdentifyResult>('/api/identify', { visitorId })
  }

  async verify(options: VerifyOptions): Promise<RiskResult & { visitorId: string; event: string }> {
    return this.request('/api/verify', options)
  }

  async isBot(visitorId: string): Promise<BotCheckResult> {
    const result = await this.identify(visitorId)
    const isBot = result.flags?.includes('bot') ?? false
    const confidence = isBot
      ? Math.min((result.riskScore ?? 0) / 100, 1)
      : 1 - Math.min((result.riskScore ?? 0) / 100, 1)
    return { isBot, confidence }
  }

  async isVpn(visitorId: string): Promise<{ isVpn: boolean; confidence: number }> {
    const result = await this.identify(visitorId)
    const isVpn = result.flags?.includes('vpn') ?? false
    const confidence = isVpn
      ? Math.min((result.riskScore ?? 0) / 100, 1)
      : 1 - Math.min((result.riskScore ?? 0) / 100, 1)
    return { isVpn, confidence }
  }
}

export class FingerprintError extends Error {
  statusCode: number
  body: string
  constructor(message: string, statusCode: number, body: string) {
    super(message)
    this.name = 'FingerprintError'
    this.statusCode = statusCode
    this.body = body
  }
}
