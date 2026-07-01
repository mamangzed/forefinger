import type { DetectorResult, CollectedSignals } from '../types.js'

export interface RegionContext {
  signals: CollectedSignals
  ipCountry?: string
}

// Region spoofing - cross-validate timezone, language, IP geolocation
export function detectRegionSpoofing(ctx: RegionContext): DetectorResult {
  let score = 0
  const reasons: string[] = []

  const tz = ctx.signals.stable.timezone
  const langs = ctx.signals.stable.languages
  const ipCountry = ctx.ipCountry

  // 1. Timezone vs IP country
  if (ipCountry) {
    const countryTz = countryTimezones[ipCountry]
    if (countryTz && !countryTz.includes(tz)) {
      score += 35
      reasons.push(`tz_ip_mismatch:${tz}_vs_${ipCountry}`)
    }
  }

  // 2. Language vs IP country
  if (ipCountry && langs.length > 0) {
    const primaryLang = langs[0].toLowerCase().split('-')[0]
    const countryLang = countryLanguages[ipCountry]
    if (countryLang && primaryLang !== countryLang) {
      // English is common globally, only flag non-English mismatches
      if (primaryLang !== 'en') {
        score += 25
        reasons.push(`lang_ip_mismatch:${primaryLang}_vs_${ipCountry}`)
      }
    }
  }

  // 3. Timezone offset consistency
  // If timezone says UTC+7 but offset suggests UTC-5, spoofing
  const tzOffset = ctx.signals.stable.timezoneOffset
  if (tz && tzOffset !== undefined) {
    const expectedOffset = tzOffsetFromTimezone(tz)
    if (expectedOffset !== null && Math.abs(expectedOffset - tzOffset) > 60) {
      score += 40
      reasons.push('tz_offset_inconsistent')
    }
  }

  const detected = score >= 40
  return {
    flag: 'region_spoofing',
    detected,
    score: Math.min(score, 100),
    detail: reasons.join(',') || undefined
  }
}

const countryTimezones: Record<string, string[]> = {
  ID: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
  US: ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Denver', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'],
  SG: ['Asia/Singapore'],
  MY: ['Asia/Kuala_Lumpur'],
  JP: ['Asia/Tokyo'],
  GB: ['Europe/London'],
  DE: ['Europe/Berlin'],
  FR: ['Europe/Paris'],
  AU: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Brisbane'],
  IN: ['Asia/Kolkata'],
  CN: ['Asia/Shanghai'],
  RU: ['Europe/Moscow', 'Asia/Yekaterinburg'],
  BR: ['America/Sao_Paulo', 'America/Manaus'],
  CA: ['America/Toronto', 'America/Vancouver', 'America/Halifax']
}

const countryLanguages: Record<string, string> = {
  ID: 'id', US: 'en', SG: 'en', MY: 'ms', JP: 'ja', GB: 'en',
  DE: 'de', FR: 'fr', AU: 'en', IN: 'hi', CN: 'zh', RU: 'ru',
  BR: 'pt', CA: 'en'
}

function tzOffsetFromTimezone(tz: string): number | null {
  // Map common timezones to offset in minutes (sign per JS convention: positive = west of UTC)
  const map: Record<string, number> = {
    'Asia/Jakarta': -420,
    'Asia/Makassar': -480,
    'Asia/Jayapura': -540,
    'Asia/Singapore': -480,
    'Asia/Tokyo': -540,
    'Asia/Kolkata': -330,
    'Asia/Shanghai': -480,
    'America/New_York': 300,
    'America/Chicago': 360,
    'America/Los_Angeles': 480,
    'Europe/London': 0,
    'Europe/Berlin': -60,
    'Europe/Paris': -60,
    'Australia/Sydney': -600
  }
  return map[tz] ?? null
}
