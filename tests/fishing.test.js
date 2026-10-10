import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom, run } from './helpers.js'
import { WATERS, BAITS } from '../src/game/data/fishing.js'
import { findAction, outputsOf, FISH_INFO } from '../src/game/data/actions.js'
import { ITEMS } from '../src/game/data/items.js'

describe('fishing waters', () => {
  it('turns every water into one action with a real catch table', () => {
    for (const w of WATERS) {
      const a = findAction('fishing', w.id)
      expect(a.catch).toEqual(w.fish)
      Object.keys(w.fish).forEach(id => { expect(ITEMS[id]).toBeTruthy(); expect(FISH_INFO[id]).toBeTruthy() })
    }
    // Every fish can be caught somewhere
    const caught = new Set(WATERS.flatMap(w => Object.keys(w.fish)))
    Object.keys(FISH_INFO).forEach(id => expect(caught.has(id)).toBe(true))
  })

  it('only lets fish of the hero\'s level bite, with odds that add up', () => {
    newHero()
    setLevel('fishing', 40)
    const t = G.catchTable(findAction('fishing', 'coral_coast'))
    expect(t.find(r => r.id === 'raw_swordfish').locked).toBe(true)
    expect(t.filter(r => !r.locked).reduce((s, r) => s + r.chance, 0)).toBeCloseTo(1)
  })

  it('makes finer fish likelier with bait and uses one per cast', () => {
    newHero()
    setLevel('fishing', 99)
    const a = findAction('fishing', 'deep_sea')
    const plain = G.catchChance(a, 'raw_anglerfish')
    G.addItem('glow_lure', 2)
    state.bait = 'glow_lure'
    expect(G.catchChance(a, 'raw_anglerfish')).toBeGreaterThan(plain)
    expect(G.baitCasket()).toBe(BAITS.glow_lure.casket)
    G.rollCatch(a)
    expect(G.qty('glow_lure')).toBe(1)
    // Workers fish without bait
    G.rollCatch(a, 99, false)
    expect(G.qty('glow_lure')).toBe(1)
  })

  it('lands fish and their XP while fishing', () => {
    newHero()
    G.startSkill('fishing', 'dawn_river')
    const xp = state.skills.fishing.xp
    run(30)
    const fish = Object.keys(findAction('fishing', 'dawn_river').catch).reduce((s, id) => s + G.qty(id), 0)
    expect(fish).toBeGreaterThan(0)
    expect(state.skills.fishing.xp).toBeGreaterThan(xp)
  })

  it('lists every fish as something fishing produces, for orders and contracts', () => {
    const items = outputsOf('fishing').map(o => o.item)
    expect(items).toContain('raw_shark')
    expect(outputsOf('fishing').find(o => o.item === 'raw_shark').lvl).toBe(FISH_INFO.raw_shark.lvl)
  })

  it('chains a water into a cooking recipe that needs its fish', () => {
    newHero()
    expect(G.producerFor('raw_shrimp')?.a.id).toBe('dawn_river')
  })

  it('carries old fishing mastery over to the waters', () => {
    newHero()
    state.mastery.fishing = { raw_trout: 5000 }
    delete state.mastery.fishing.dawn_river
    G.migrateState()
    expect(state.mastery.fishing.dawn_river).toBe(5000)
  })
})
