import { describe, it, expect } from 'vitest'
import { ITEMS } from '../src/game/data/items.js'
import { sourcesOf } from '../src/game/data/sources.js'
import { sourceRows } from '../src/ui/itemSources.js'
import { i18n, setLocale } from '../src/i18n/index.js'

describe('where items come from', () => {
  it('knows at least one source for every item a player can find', () => {
    const missing = Object.keys(ITEMS).filter(id => !ITEMS[id].festival && !ITEMS[id].quality && !ITEMS[id].grade && !sourcesOf(id).length)
    expect(missing).toEqual([])
  })

  it('lists makers, drops, shops and chests, with the chance when it is not certain', () => {
    expect(sourcesOf('bronze_bar')[0]).toMatchObject({ kind: 'action', skill: 'smithing' })
    expect(sourcesOf('dragon_bones').some(s => s.kind === 'monster' && s.monster.id === 'green_dragon')).toBe(true)
    expect(sourcesOf('rune_essence').some(s => s.kind === 'shop')).toBe(true)
    expect(sourcesOf('aether_lotus_seed')).toEqual([expect.objectContaining({ kind: 'cross' })])
    // A gem every rock can turn up is one row, not one per rock
    expect(sourcesOf('uncut_diamond').filter(s => s.kind === 'anyAction' && s.skill === 'mining')).toHaveLength(1)
    expect(sourcesOf('uncut_diamond').some(s => s.kind === 'action' && s.skill === 'mining' && s.action.id === 'copper_ore')).toBe(false)
  })

  it('turns every source into a row with a name, in both languages', async () => {
    for (const loc of ['en', 'es']) {
      await setLocale(loc)
      for (const id of Object.keys(ITEMS)) for (const r of sourceRows(id)) {
        expect(r.name, id).toBeTruthy()
        expect(r.name, id).not.toMatch(/inventory\.from|undefined/)
      }
    }
    await setLocale('en')
    expect(i18n.global.locale.value).toBe('en')
  })
})
