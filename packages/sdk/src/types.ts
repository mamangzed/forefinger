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

export interface BehaviorSample {
  mouseMoves: number
  mouseMoveIntervalStd: number
  mouseMoveDistanceMean: number
  mouseStraightness: number
  keydowns: number
  keyIntervalStd: number
  scrolls: number
  scrollVelocityChanges: number
  touches: number
  durationMs: number
  idleRatio: number
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
  behavior?: BehaviorSample
  timestamp: number
}

export interface CollectOptions {
  endpoint?: string
  apiKey?: string
  sendToServer?: boolean
  /** Customer business identifier to group visits (e.g. userId, order id) */
  linkedId?: string
  /** Free-form tag for the visit */
  tag?: string
  /** Collect behavioral biometrics (mouse/keyboard/scroll). Adds ~4s. Default true. */
  behavior?: boolean
  /** Behavior sample window in ms. Default 4000. */
  behaviorDuration?: number
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
  confidence?: number
  risk?: RiskResult
}
