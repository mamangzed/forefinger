export interface RiskResult {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  flags: string[]
  recommendation: 'allow' | 'review' | 'block'
  signals: {
    vpn: boolean
    bot: boolean
    incognito: boolean
    regionSpoofing: boolean
    multiAccounting: boolean
    newDevice: boolean
    suspiciousVelocity: boolean
  }
}

export interface IdentifyResult {
  visitorId: string
  firstSeen?: string
  lastSeen?: string
  visitCount?: number
  riskScore?: number
  riskLevel?: string
  flags?: string[]
  linkedAccounts?: string[]
  recentVisits?: Array<{
    ip: string | null
    country: string | null
    createdAt: string
    riskScore: number | null
    flags: string[]
  }>
}

export interface VerifyOptions {
  visitorId: string
  event: string
  metadata: {
    amount?: number
    country?: string
    paymentMethod?: string
    userId?: string
    [key: string]: unknown
  }
}

export interface FingerprintServerOptions {
  apiKey: string
  endpoint: string
  timeout?: number
}

export interface BotCheckResult {
  isBot: boolean
  confidence: number
}
