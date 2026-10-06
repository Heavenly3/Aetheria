import { describe, it, expect } from 'vitest'
import { ITEMS } from '../src/game/data/items.js'
import '../src/game/data/omens.js'
import { CATEGORIES, itemCategory, usesOf } from '../src/game/data/categories.js'

describe('inventory categories', () => {
  it('puts every item in a known category, and no category is empty', () => {
    const used = new Set()
    for (const id of Object.keys(ITEMS)) {
      const c = itemCategory(id)
      expect(CATEGORIES).toContain(c)
      used.add(c)
    }
    for (const c of CATEGORIES) expect(used.has(c), c).toBe(true)
  })

  it('sorts items into the expected places', () => {
    expect(itemCategory('rune_sword')).toBe('weapons')
    expect(itemCategory('rune_helm')).toBe('armour')
    expect(itemCategory('eternity_amulet')).toBe('accessories')
    expect(itemCategory('iron_arrow')).toBe('ammo')
    expect(itemCategory('rune_pickaxe')).toBe('tools')
    expect(itemCategory('iron_ore')).toBe('ores')
    expect(itemCategory('steel_bar')).toBe('ores')
    expect(itemCategory('yew_logs')).toBe('wood')
    expect(itemCategory('raw_shark')).toBe('fish')
    expect(itemCategory('ranarr')).toBe('herbs')
    expect(itemCategory('potato')).toBe('crops')
    expect(itemCategory('uncut_ruby')).toBe('gems')
    expect(itemCategory('dragon_bones')).toBe('remains')
    expect(itemCategory('stardust')).toBe('special')
  })

  it('knows where materials are used', () => {
    expect(usesOf('copper_ore').some(u => u.action.id === 'bronze_bar')).toBe(true)
    expect(usesOf('rune_sword')).toEqual([])
  })
})
