// Shared types - mirror SDK types for server-side use

export interface StableSignals {
  cpuCores: number
  deviceMemory: number
  screenWidth: number
  screenHeight: number
  colorDepth: number
  pixelRatio: number
  timezone: string
  timezoneOffset: number
  languages: string[]
  platform: string
  gpuVendor: string
  gpuRenderer: string
  touchPoints: number
  cookieEnabled: boolean
}

export interface VolatileSignals {
  canvasHash: string
  webglExts: string[]
  webglParams: Record<string, number | string>
  audioHash: string
  fonts: string[]
  userAgent: string
}

export interface CollectedSignals {
  stable: StableSignals
  volatile: VolatileSignals
  timestamp: number
}

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

export interface VerifyRequest {
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

export interface DetectorResult {
  flag: string
  detected: boolean
  score: number // contribution to risk score 0-100
  detail?: string
}
