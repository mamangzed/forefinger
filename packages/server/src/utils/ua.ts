// Minimal user-agent parser — extract browser name+version and OS.
// Avoids pulling a dependency; covers common cases. For production a library
// (ua-parser-js) is more thorough, but this suffices for dashboard display.

export interface UAInfo {
  browser: string
  browserVersion: string
  os: string
  device: string
}

export function parseUA(ua: string): UAInfo {
  if (!ua) return { browser: 'Unknown', browserVersion: '', os: 'Unknown', device: 'Desktop' }

  let browser = 'Unknown'
  let browserVersion = ''
  let os = 'Unknown'
  let device = 'Desktop'

  // Browser (check specific ones first — many spoof Chrome)
  if (/edg\//i.test(ua)) {
    browser = 'Edge'
    browserVersion = match(ua, /edg\/([\d.]+)/i)
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera'
    browserVersion = match(ua, /(?:opr\/|version\/)([\d.]+)/i)
  } else if (/firefox\//i.test(ua)) {
    browser = 'Firefox'
    browserVersion = match(ua, /firefox\/([\d.]+)/i)
  } else if (/chrome\//i.test(ua)) {
    browser = 'Chrome'
    browserVersion = match(ua, /chrome\/([\d.]+)/i)
  } else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari'
    browserVersion = match(ua, /version\/([\d.]+)/i)
  }

  // OS
  if (/windows nt 10/i.test(ua)) os = 'Windows'
  else if (/windows nt/i.test(ua)) os = 'Windows'
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  // Device type
  if (/iphone|android.*mobile|windows phone/i.test(ua)) device = 'Mobile'
  else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) device = 'Tablet'

  return { browser, browserVersion, os, device }
}

function match(str: string, re: RegExp): string {
  const m = str.match(re)
  return m ? m[1] : ''
}

export function formatBrowser(info: UAInfo): string {
  return info.browserVersion ? `${info.browser} ${info.browserVersion}` : info.browser
}
