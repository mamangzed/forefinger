// Fingerprint signal types

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

export interface NetworkSignals {
  ip: string
  userAgent: string
  acceptLanguage: string
}

export interface CollectedSignals {
  stable: StableSignals
  volatile: VolatileSignals
  network?: {
    webrtcLocalIps: string[]
    connectionType: string
  }
  incognito?: {
    storageQuotaLow: boolean
    indexedDbBlocked: boolean
    localStorageBlocked: boolean
  }
  timestamp: number
}

export interface CollectOptions {
  endpoint?: string
  apiKey?: string
  sendToServer?: boolean
}

export interface RiskResult {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  flags: string[]
  recommendation: 'allow' | 'review' | 'block'
}

export interface CollectResult {
  visitorId: string
  stableHash: string
  signals: CollectedSignals
  risk?: RiskResult
}
