import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { FAVOUR_LEVELS, OFFERINGS } from '../src/game/data/church.js'
import { GRACEFUL, PRAYERS } from '../src/game/data/extras.js'
import { BLESSINGS } from '../src/game/data/progression.js'
import { ITEMS } from '../src/game/data/items.js'
import { findAction } from '../src/game/data/actions.js'
import { SET_OF } from '../src/game/data/sets.js'

describe('church and the Order of the Dawn', () => {
  it('asks for one real offering a day and pays favour and Prayer XP', () => {
    newHero()
    OFFERINGS.forEach(o => expect(ITEMS[o.item]).toBeTruthy())
    const c = G.ensureChurch()
    expect(c.offering.qty).toBeGreaterThan(0)
    expect(G.giveOffering()).toBe(null)
    G.addItem(c.offering.item, c.offering.qty)
    const xp = state.skills.prayer.xp
    expect(G.giveOffering().favour).toBe(c.offering.favour)
    expect(state.church.favour).toBe(c.offering.favour)
    expect(state.skills.prayer.xp).toBeGreaterThan(xp)
    expect(G.qty(c.offering.item)).toBe(0)
    // Once a day
    G.addItem(c.offering.item, c.offering.qty)
    expect(G.giveOffering()).toBe(null)
  })

  it('makes blessings longer, adds a slot and cheapens them with favour', () => {
    newHero()
    const dur = G.blessingDuration(), slots = G.maxBlessings(), b = BLESSINGS[0]
    state.church.favour = FAVOUR_LEVELS[5].favour
    expect(G.favourLevel()).toBe(5)
    expect(G.blessingDuration()).toBeGreaterThan(dur)
    expect(G.maxBlessings()).toBe(slots + 1)
    expect(G.blessingCost(b)).toBeLessThan(b.cost)
    state.gold = 10000
    const gold = state.gold
    expect(G.bless(b.id)).toBe(true)
    expect(state.gold).toBe(gold - G.blessingCost(b))
  })

  it('renews every active blessing with holy water', () => {
    newHero()
    state.gold = 10000
    G.bless(BLESSINGS[0].id)
    state.blessings[BLESSINGS[0].id] = 5
    expect(G.consecrate()).toBe(false)
    G.addItem('holy_water', 1)
    expect(G.consecrate()).toBe(true)
    expect(state.blessings[BLESSINGS[0].id]).toBe(G.blessingDuration())
    expect(G.qty('holy_water')).toBe(0)
    expect(findAction('herblore', 'holy_water').out).toEqual({ holy_water: 1 })
  })

  it('pays triple Prayer XP at the altar', () => {
    for (const id of ['bones', 'big_bones', 'dragon_bones', 'demon_ashes']) {
      expect(findAction('prayer', 'offer_' + id).xp).toBe(findAction('prayer', 'bury_' + id).xp * 3)
    }
  })

  it('has new prayers for every style and for survival', () => {
    for (const id of ['rapid_heal', 'evasion', 'keen_edge', 'rigour', 'augury']) expect(PRAYERS.some(p => p.id === id)).toBe(true)
    const lvls = PRAYERS.map(p => p.lvl)
    expect([...lvls].sort((a, b) => a - b)).toEqual(lvls)
  })
})

describe('agility', () => {
  it('sells the graceful outfit for marks of grace, as a set', () => {
    newHero()
    const g = GRACEFUL[0]
    expect(G.buyGraceful(g.id)).toBe(false)
    setLevel('agility', g.lvl)
    G.addItem('mark_of_grace', g.cost)
    expect(G.buyGraceful(g.id)).toBe(true)
    expect(G.qty(g.id)).toBe(1)
    expect(G.qty('mark_of_grace')).toBe(0)
    GRACEFUL.forEach(x => expect(SET_OF[x.id]?.id).toBe('graceful'))
  })

  it('makes thieving safer', () => {
    newHero()
    setLevel('thieving', 20)
    const act = { lvl: 20 }
    const before = G.failChance('thieving', act)
    setLevel('agility', 80)
    expect(G.failChance('thieving', act)).toBeLessThan(before)
  })
})
