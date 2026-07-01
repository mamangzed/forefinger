const API_BASE = '/api/dashboard'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (res.status === 401) {
    // Signal caller to redirect to login
    throw Object.assign(new Error('unauthorized'), { status: 401, unauthorized: true })
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface Stats {
  totalVisitors: number
  uniqueToday: number
  botCount: number
  vpnCount: number
  highRiskCount: number
  timeseries: Array<{ date: string; count: number }>
  topCountries: Array<{ country: string; count: number }>
  riskDistribution: { low: number; medium: number; high: number }
}

export interface VisitorSummary {
  visitorId: string
  riskScore: number
  riskLevel: string
  flags: string[]
  visitCount: number
  firstSeen: string
  lastSeen: string
}

export interface VisitorListResponse {
  visitors: VisitorSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export const api = {
  getStats: (days = 7) => request<Stats>(`/stats?days=${days}`),
  getVisitors: (page = 1, limit = 50, risk?: string, flag?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (risk) params.set('risk', risk)
    if (flag) params.set('flag', flag)
    return request<VisitorListResponse>(`/visitors?${params}`)
  },
  getVisitor: (id: string) => request<{ visitor: any; visits: any[]; events: any[] }>(`/visitors/${id}`),
  getEvents: (limit = 50, type?: string, level?: string) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (type) params.set('type', type)
    if (level) params.set('level', level)
    return request<{ events: any[] }>(`/events?${params}`)
  },
  getSettings: () => request<{ settings: Record<string, any> }>(`/settings`),
  saveSettings: (body: unknown) =>
    request(`/settings`, { method: 'POST', body: JSON.stringify(body) }),
  createApiKey: (label?: string) =>
    request<{ apiKey: string; label: string }>(`/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ label })
    }),
  getApiKeys: () => request<{ keys: any[] }>(`/api-keys`),
  deleteApiKey: (id: string) =>
    request(`/api-keys/${id}`, { method: 'DELETE' })
}

export const auth = {
  login: async (user: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw Object.assign(new Error('login failed'), { status: res.status, detail: err.error })
    }
    return res.json()
  },
  me: async (): Promise<{ authenticated: boolean; user?: string }> => {
    const res = await fetch('/api/auth/me')
    if (res.status === 401) return { authenticated: false }
    return res.json()
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof Error && (err as any).unauthorized === true
}
