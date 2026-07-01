import { cacheGet, cacheSet } from '../cache/redis.js'

// IPinfo API client — geolocation + ASN/org + privacy detection (VPN/proxy/
// tor/hosting/relay). Replaces the MaxMind mmdb file approach with an API call
// (no binary DB to download/refresh). Requires IPINFO_TOKEN env (free tier:
// 50k lookups/month). Cached in Redis for 24h to stay well under quota.

const TOKEN = process.env.IPINFO_TOKEN || ''
const BASE = 'https://ipinfo.io'
const CACHE_TTL = 86400

export interface GeoResult {
  country: string | null
  countryName: string | null
  city: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  org: string | null // ISP/ASN
  asn: string | null
}

export interface PrivacyResult {
  vpn: boolean
  proxy: boolean
  tor: boolean
  relay: boolean
  hosting: boolean // datacenter / cloud
}

const EMPTY_GEO: GeoResult = {
  country: null, countryName: null, city: null, region: null,
  latitude: null, longitude: null, timezone: null, org: null, asn: null
}
const EMPTY_PRIVACY: PrivacyResult = { vpn: false, proxy: false, tor: false, relay: false, hosting: false }

export function ipinfoEnabled(): boolean {
  return !!TOKEN
}

export async function lookupGeo(ip: string): Promise<GeoResult> {
  if (!ip || !TOKEN) return EMPTY_GEO
  const cacheKey = `geo:${ip}`
  const cached = await cacheGet<GeoResult>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`${BASE}/${ip}?token=${TOKEN}`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return EMPTY_GEO
    const d = (await res.json()) as {
      country?: string
      city?: string
      region?: string
      loc?: string // "lat,lng"
      timezone?: string
      org?: string // "AS12345 Example ISP"
    }
    const [latitude, longitude] = d.loc ? d.loc.split(',').map(Number) : [null, null]
    const result: GeoResult = {
      country: d.country || null,
      countryName: countryName(d.country),
      city: d.city || null,
      region: d.region || null,
      latitude: isFinite(latitude as number) ? latitude : null,
      longitude: isFinite(longitude as number) ? longitude : null,
      timezone: d.timezone || null,
      org: d.org || null,
      asn: d.org?.match(/^AS(\d+)/)?.[1] || null
    }
    await cacheSet(cacheKey, result, CACHE_TTL)
    return result
  } catch {
    return EMPTY_GEO
  }
}

// Privacy detection addon — separate endpoint. Returns whether IP is a known
// VPN/proxy/Tor/relay/hosting. Far more accurate than the bundled datacenter
// range list. Requires the "Privacy Detection" addon enabled on the token.
export async function lookupPrivacy(ip: string): Promise<PrivacyResult> {
  if (!ip || !TOKEN) return EMPTY_PRIVACY
  const cacheKey = `privacy:${ip}`
  const cached = await cacheGet<PrivacyResult>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`${BASE}/${ip}/privacy?token=${TOKEN}`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return EMPTY_PRIVACY
    const d = (await res.json()) as {
      vpn?: boolean
      proxy?: boolean
      tor?: boolean
      relay?: boolean
      hosting?: boolean
    }
    const result: PrivacyResult = {
      vpn: !!d.vpn,
      proxy: !!d.proxy,
      tor: !!d.tor,
      relay: !!d.relay,
      hosting: !!d.hosting
    }
    await cacheSet(cacheKey, result, CACHE_TTL)
    return result
  } catch {
    return EMPTY_PRIVACY
  }
}

// ISO 3166-1 alpha-2 → English country name. Covers the common ones; falls
// back to the code for anything missing.
const COUNTRY_NAMES: Record<string, string> = {
  ID: 'Indonesia', US: 'United States', SG: 'Singapore', MY: 'Malaysia',
  JP: 'Japan', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
  AU: 'Australia', IN: 'India', CN: 'China', RU: 'Russia', BR: 'Brazil',
  CA: 'Canada', KR: 'South Korea', TH: 'Thailand', VN: 'Vietnam',
  PH: 'Philippines', NL: 'Netherlands', AE: 'United Arab Emirates',
  HK: 'Hong Kong', TW: 'Taiwan', NZ: 'New Zealand', ES: 'Spain',
  IT: 'Italy', CH: 'Switzerland', SE: 'Sweden', NO: 'Norway'
}
function countryName(code?: string): string | null {
  if (!code) return null
  return COUNTRY_NAMES[code] || code
}
