import { describe, it, expect } from 'vitest'
import { CHANGELOG, SECTIONS } from '../src/game/data/changelog.js'
import { i18n } from '../src/i18n/index.js'

describe('update notes', () => {
  it('list every update newest first, each with its texts', () => {
    const { te } = i18n.global
    const dated = CHANGELOG.filter(e => e.date).map(e => e.date)
    expect([...dated].sort().reverse()).toEqual(dated)
    expect(new Set(CHANGELOG.map(e => e.id)).size).toBe(CHANGELOG.length)
    for (const e of CHANGELOG) {
      expect(te(`changelog.entries.${e.id}.title`, 'en')).toBe(true)
      for (const s of e.sections) {
        expect(SECTIONS).toContain(s)
        expect(te(`changelog.entries.${e.id}.${s}`, 'en')).toBe(true)
      }
    }
  })
})
