import { open, type CityResponse } from 'maxmind'
import path from 'node:path'
import fs from 'node:fs'
import { cacheGet, cacheSet } from '../cache/redis.js'

// Maxmind reader is loaded lazily; if the mmdb file is absent we return empty
// geo and rely on the datacenter-range list in the VPN detector only.
let readerPromise: Promise<MaxmindReader | null> | null = null

const MMDB_PATH = process.env.GEOLITE_DB || path.resolve(process.cwd(), 'data/GeoLite2-City.mmdb')

interface CityRecord {
  country?: { iso_code?: string; names?: Record<string, string> }
  city?: { names?: Record<string, string> }
  location?: { latitude?: number; longitude?: number; time_zone?: string }
}
type MaxmindReader = { get: (ip: string) => CityRecord | null }

async function getReader(): Promise<MaxmindReader | null> {
  if (readerPromise) return readerPromise
  readerPromise = (async () => {
    try {
      if (!fs.existsSync(MMDB_PATH)) return null
      const r = await open<CityResponse>(MMDB_PATH)
      return r as unknown as MaxmindReader
    } catch (err) {
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug('[geo] mmdb not loaded:', (err as Error).message)
      }
      return null
    }
  })()
  return readerPromise
}

export interface GeoResult {
  country: string | null
  countryName: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
}

const EMPTY: GeoResult = {
  country: null,
  countryName: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null
}

export async function lookupGeo(ip: string): Promise<GeoResult> {
  if (!ip) return EMPTY
  const cacheKey = `geo:${ip}`
  const cached = await cacheGet<GeoResult>(cacheKey)
  if (cached) return cached

  const reader = await getReader()
  if (!reader) return EMPTY

  try {
    const r = reader.get(ip)
    if (!r) return EMPTY

    const result: GeoResult = {
      country: r.country?.iso_code || null,
      countryName: r.country?.names?.en || null,
      city: r.city?.names?.en || null,
      latitude: r.location?.latitude || null,
      longitude: r.location?.longitude || null,
      timezone: r.location?.time_zone || null
    }
    await cacheSet(cacheKey, result, 86400)
    return result
  } catch {
    return EMPTY
  }
}

export function geoEnabled(): boolean {
  return fs.existsSync(MMDB_PATH)
}
