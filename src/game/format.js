import { t, intlLocale } from '../i18n/index.js'

// Players can turn the short forms off in Settings and see every digit
let compact = true
export const setCompactNumbers = on => { compact = on !== false }

// Building an Intl formatter is slow and these run thousands of times a second, so keep one per language
const cache = new Map()
const formatter = (kind, make) => {
  const key = kind + intlLocale()
  let f = cache.get(key)
  if (!f) cache.set(key, (f = make(intlLocale())))
  return f
}
const numFmt = () => formatter('n', loc => new Intl.NumberFormat(loc, { maximumFractionDigits: 3 }))

// A whole number with the language's separators (12,345 / 12.345)
export const fmtNum = n => numFmt().format(n)

// A number with a few decimals, in the active language (1.5 / 1,5)
export const fmtDec = (n, d = 1) => numFmt().format(+(n || 0).toFixed(d))

// Compact number formatting that follows the active language (1.2K, 3.4M, ...)
export function fmt(n) {
  n = Math.floor(n || 0)
  const a = Math.abs(n)
  const nf = numFmt()
  if (a < 10_000 || !compact) return nf.format(n)
  const fixed = (v, d) => nf.format(Number(v.toFixed(d)))
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

export const fmtDate = ts => formatter('d', loc => new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric' })).format(ts)
export const fmtHour = ts => formatter('h', loc => new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' })).format(ts)
