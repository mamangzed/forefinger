import type { DetectorResult, CollectedSignals } from '../types.js'
import { cacheGet, cacheSet } from '../cache/redis.js'
import { lookupPrivacy, ipinfoEnabled } from '../geo/ipinfo.js'

// Known VPN/datacenter IP ranges — fallback only when IPinfo privacy addon
// is unavailable (no token). Coarse but catches obvious cloud/VPS IPs.
const DATACENTER_RANGES: string[] = [
  // AWS
  '3.0.0.0/9', '13.0.0.0/8', '15.0.0.0/8', '18.0.0.0/8', '34.0.0.0/8',
  '35.0.0.0/8', '52.0.0.0/8', '54.0.0.0/8', '99.77.0.0/16',
  // GCP
  '35.192.0.0/12', '35.208.0.0/12',
  // Azure
  '13.64.0.0/11', '20.0.0.0/8', '40.0.0.0/8', '52.0.0.0/8',
  // DigitalOcean
  '159.65.0.0/16', '159.203.0.0/16', '165.22.0.0/16',
  // Linode, Vultr, OVH
  '139.144.0.0/16', '45.32.0.0/16', '51.79.0.0/16', '51.91.0.0/16'
]

export interface VpnContext {
  ip: string
  signals: CollectedSignals
  geoCountry?: string
}

export async function detectVpn(ctx: VpnContext): Promise<DetectorResult> {
  let score = 0
  const reasons: string[] = []

  // 1. IPinfo privacy detection (primary, accurate) — cached 24h in lookupPrivacy
  if (ipinfoEnabled()) {
    const privacy = await lookupPrivacy(ctx.ip)
    if (privacy.vpn) { score += 50; reasons.push('ipinfo:vpn') }
    if (privacy.proxy) { score += 35; reasons.push('ipinfo:proxy') }
    if (privacy.tor) { score += 60; reasons.push('ipinfo:tor') }
    if (privacy.relay) { score += 30; reasons.push('ipinfo:relay') }
    if (privacy.hosting) { score += 30; reasons.push('ipinfo:hosting') }
  } else {
    // Fallback: bundled datacenter range list (coarse, no token configured)
    const cacheKey = `ip_reputation:${ctx.ip}`
    let reputation = await cacheGet<{ datacenter: boolean }>(cacheKey)
    if (!reputation) {
      const datacenter = isDatacenterIp(ctx.ip)
      reputation = { datacenter }
      await cacheSet(cacheKey, reputation, 86400)
    }
    if (reputation.datacenter) {
      score += 40
      reasons.push('datacenter_ip')
    }
  }

  // 2. Timezone vs geo mismatch (still useful — catches misconfigured VPNs)
  const tzMismatch = checkTimezoneGeo(ctx.signals, ctx.geoCountry)
  if (tzMismatch.detected) {
    score += 30
    reasons.push('timezone_geo_mismatch')
  }

  const detected = score >= 30
  return {
    flag: 'vpn',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}

function isDatacenterIp(ip: string): boolean {
  if (!ip) return false
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p > 255)) return false
  const ipNum = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  for (const range of DATACENTER_RANGES) {
    if (ipInCidr(ipNum, range)) return true
  }
  return false
}

function ipInCidr(ipNum: number, cidr: string): boolean {
  const [base, bits] = cidr.split('/')
  const mask = bits ? parseInt(bits, 10) : 32
  const baseParts = base.split('.').map(Number)
  const baseNum = (baseParts[0] << 24) + (baseParts[1] << 16) + (baseParts[2] << 8) + baseParts[3]
  const maskNum = mask === 0 ? 0 : (0xffffffff << (32 - mask)) >>> 0
  return (ipNum & maskNum) === (baseNum & maskNum)
}

function checkTimezoneGeo(signals: CollectedSignals, geoCountry?: string): { detected: boolean } {
  if (!geoCountry) return { detected: false }
  const tz = signals.stable.timezone
  const countryTz: Record<string, string[]> = {
    ID: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
    US: ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Denver'],
    SG: ['Asia/Singapore'],
    MY: ['Asia/Kuala_Lumpur'],
    JP: ['Asia/Tokyo'],
    GB: ['Europe/London']
  }
  const expected = countryTz[geoCountry]
  if (expected && !expected.includes(tz)) {
    return { detected: true }
  }
  return { detected: false }
}
