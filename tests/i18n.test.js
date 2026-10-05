import { describe, it, expect } from 'vitest'
import en from '../src/i18n/locales/en.js'
import es from '../src/i18n/locales/es.js'
import { i18n, setLocale, tm } from '../src/i18n/index.js'
import { ITEMS } from '../src/game/data/items.js'
import '../src/game/engine.js'

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}
const placeholders = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join()

describe('translations', () => {
  const EN = flatten(en), ES = flatten(es)

  it('Spanish has exactly the English keys', () => {
    expect(Object.keys(ES).sort()).toEqual(Object.keys(EN).sort())
  })

  it('keeps every placeholder', () => {
    const wrong = Object.keys(EN).filter(k => placeholders(EN[k]) !== placeholders(ES[k]))
    expect(wrong).toEqual([])
  })

  it('switches language at runtime, names included', async () => {
    await setLocale('es')
    expect(ITEMS.iron_ore.name).toBe('Mineral de hierro')
    expect(tm({ key: 'log.found', params: { item: '@item:iron_ore' } })).toContain('Mineral de hierro')
    await setLocale('en')
    expect(ITEMS.iron_ore.name).toBe('Iron ore')
    expect(i18n.global.locale.value).toBe('en')
  })
})
