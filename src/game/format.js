import { t, intlLocale } from '../i18n/index.js'

// Players can turn the short forms off in Settings and see every digit
let compact = true
export const setCompactNumbers = on => { compact = on !== false }

// A number with a few decimals, in the active language (1.5 / 1,5)
export const fmtDec = (n, d = 1) => (+(n || 0).toFixed(d)).toLocaleString(intlLocale())

// Compact number formatting that follows the active language (1.2K, 3.4M, ...)
export function fmt(n) {
  n = Math.floor(n || 0)
  const a = Math.abs(n)
  const loc = intlLocale()
  if (a < 10_000 || !compact) return n.toLocaleString(loc)
  const fixed = (v, d) => Number(v.toFixed(d)).toLocaleString(loc)
  if (a < 1e6) return fixed(n / 1e3, a < 1e5 ? 1 : 0) + 'K'
  if (a < 1e9) return fixed(n / 1e6, 2) + 'M'
  return fixed(n / 1e9, 2) + 'B'
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec))
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (d) return t('time.dh', { d, h })
  if (h) return t('time.hm', { h, m })
  if (m) return t('time.ms', { m, s })
  return t('time.s', { s })
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec))
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const pct = (v, digits = 0) => (v * 100).toFixed(digits) + '%'

export const fmtDate = ts => new Date(ts).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtHour = ts => new Date(ts).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' })
