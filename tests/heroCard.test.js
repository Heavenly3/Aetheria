import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { heroCardData, findCardData } from '../src/ui/heroCard.js'
import { MYTHIC_IDS } from '../src/game/mythics.js'
import { ITEMS } from '../src/game/data/items.js'

describe('hero card', () => {
  beforeEach(() => newHero({ name: 'Card Hero', role: 'mage' }))

  it('shows the hero, the best skills first and the numbers that matter', () => {
    setLevel('fishing', 70)
    setLevel('cooking', 55)
    state.stats.playTime = 3 * 3600
    state.ascension.count = 2
    const d = heroCardData()
    expect(d.name).toBe('Card Hero')
    expect(d.role.icon).toBeTruthy()
    expect(d.skills).toHaveLength(4)
    expect(d.skills.slice(0, 2).map(s => s.lvl)).toEqual([70, 55])
    expect(d.stats).toHaveLength(5)
    expect(d.stats.at(-1)[1]).toBe('2')
    expect(d.finds).toEqual([])
    expect(d.total).toBe(MYTHIC_IDS.length)
  })

  it('lists the miracles found, the rarest first', () => {
    const epic = MYTHIC_IDS.find(id => ITEMS[id].myth === 'epic')
    const myth = MYTHIC_IDS.find(id => ITEMS[id].myth === 'mythic')
    G.awardMythic(epic)
    G.awardMythic(myth)
    const d = heroCardData()
    expect(d.found).toBe(2)
    expect(d.finds.map(f => f.icon)).toEqual([ITEMS[myth].icon, ITEMS[epic].icon])
  })

  it('makes a card for one find with its odds and who found it', () => {
    const id = MYTHIC_IDS.find(x => ITEMS[x].myth === 'mythic')
    const d = findCardData(id)
    expect(d.item).toBe(ITEMS[id].name)
    expect(d.odds).toMatch(/1,000,000/)
    expect(d.by).toContain('Card Hero')
  })
})
