import { createI18n } from 'vue-i18n'
import en from './locales/en.js'

export const LOCALES = {
  en: { name: 'English', intl: 'en-US' },
  es: { name: 'Español', intl: 'es-ES', load: () => import('./locales/es.js') },
}
const STORAGE_KEY = 'aetheria-locale'

export function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LOCALES[saved]) return saved
  } catch { /* storage unavailable */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'en').slice(0, 2)
  return LOCALES[nav] ? nav : 'en'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  // English is always bundled (it is the fallback); other languages load on demand, see setLocale
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
  warnHtmlMessage: false,
  missingWarn: false,
  fallbackWarn: false,
})

export const t = (key, params) => i18n.global.t(key, params || {})
export const te = key => i18n.global.te(key)
export const currentLocale = () => i18n.global.locale.value
export const intlLocale = () => LOCALES[currentLocale()]?.intl || 'en-US'

export function applyDocumentLocale() {
  if (typeof document === 'undefined') return
  const loc = currentLocale()
  document.documentElement.lang = loc
}

export async function setLocale(loc) {
  if (!LOCALES[loc]) return
  if (!i18n.global.availableLocales.includes(loc)) i18n.global.setLocaleMessage(loc, (await LOCALES[loc].load()).default)
  i18n.global.locale.value = loc
  try { localStorage.setItem(STORAGE_KEY, loc) } catch { /* storage unavailable */ }
  applyDocumentLocale()
}

/*
  Message parameters can reference game entities as "@kind:id" (e.g. "@item:iron_ore").
  They are resolved to the localized name at render time, so stored messages
  (journal entries, offline reports) follow the current language.
*/
const resolvers = {}
export function registerNames(kind, fn) { resolvers[kind] = fn }
export function resolveParams(params = {}) {
  const out = {}
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.startsWith('@')) {
      const i = v.indexOf(':')
      const fn = resolvers[v.slice(1, i)]
      out[k] = fn ? fn(v.slice(i + 1)) : v
    } else out[k] = v
  }
  return out
}
// Translate a { key, params } message or pass through a legacy plain string
export function tm(msg, params) {
  if (!msg) return ''
  if (typeof msg === 'string') return te(msg) ? t(msg, resolveParams(params)) : msg
  if (msg.text) return msg.text
  return t(msg.key, resolveParams(msg.params))
}
