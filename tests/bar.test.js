import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom } from './helpers.js'
import { ITEMS, BREWS } from '../src/game/data/items.js'
import { DRINKS, EXPEDITIONS } from '../src/game/data/tavern.js'
import { findAction } from '../src/game/data/actions.js'
import { maxPatrons, patronEvery, PATRON_STAY, GUESTS } from '../src/game/data/bar.js'

describe('tavern bar', () => {
  it('fills the bar with patrons over time, up to the tavern\'s limit', () => {
    newHero()
    const t0 = 1_800_000_000_000
    state.tavern.patronAt = t0
    expect(G.ensurePatrons(t0)).toHaveLength(0)
    const every = patronEvery(1)
    expect(G.ensurePatrons(t0 + every + 1)).toHaveLength(1)
    // A long absence fills the bar but never past its limit
    expect(G.ensurePatrons(t0 + every * 50).length).toBe(maxPatrons(1))
    // And patrons leave after waiting long enough
    const last = Math.max(...state.tavern.patrons.map(p => p.until))
    expect(G.ensurePatrons(last + 1).filter(p => p.until <= last).length).toBe(0)
    expect(PATRON_STAY).toBeGreaterThan(every)
  })

  it('asks only for food and brews the hero can make', () => {
    newHero()
    const menu = G.barMenu()
    expect(menu.length).toBeGreaterThan(0)
    for (const id of menu) expect(findAction('cooking', id).lvl).toBeLessThanOrEqual(G.level('cooking') + 5)
  })

  it('pays gold for a served patron and builds reputation', () => {
    newHero()
    const p = { id: 'x', at: Date.now(), until: Date.now() + 1e6, name: 'Bel', guest: null, item: 'shrimp', qty: 3, tip: 0.2 }
    state.tavern.patrons = [p]
    state.tavern.patronAt = Date.now()
    state.inventory.shrimp = 2
    expect(G.serve('x')).toBe(null)
    state.inventory.shrimp = 5
    const pay = G.patronPay(p), gold = state.gold
    const r = G.serve('x')
    expect(r.gold).toBeGreaterThan(0)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.qty('shrimp')).toBe(2)
    expect(state.tavern.rep).toBe(1)
    expect(state.tavern.patrons).toHaveLength(0)
    // Reputation makes the next patron pay more
    state.tavern.rep = 200
    expect(G.patronPay(p)).toBeGreaterThan(pay)
  })

  it('pays special guests with rare goods', () => {
    newHero()
    const g = GUESTS.find(x => x.reward.treasure_map)
    state.tavern.patrons = [{ id: 'g', at: Date.now(), until: Date.now() + 1e6, name: null, guest: g.id, item: 'shrimp', qty: 2, tip: 0.1 }]
    state.tavern.patronAt = Date.now()
    state.inventory.shrimp = 2
    expect(G.serve('g').reward).toEqual(g.reward)
    expect(G.qty('treasure_map')).toBe(1)
    expect(state.tavern.rep).toBeGreaterThan(1)
  })

  it('lets the hero drink their own brews instead of buying', () => {
    newHero()
    BREWS.forEach(b => { expect(DRINKS.some(d => d.id === b.drink)).toBe(true); expect(findAction('cooking', b.id)).toBeTruthy() })
    const b = BREWS[0]
    expect(G.drinkOwn(b.drink)).toBe(false)
    G.addItem(b.id, 1)
    const gold = state.gold
    expect(G.drinkOwn(b.drink)).toBe(true)
    expect(state.tavern.drink.id).toBe(b.drink)
    expect(state.gold).toBe(gold)
    expect(G.qty(b.id)).toBe(0)
  })

  it('spends a treasure map on its expedition', () => {
    newHero()
    expect(ITEMS.treasure_map).toBeTruthy()
    const ex = EXPEDITIONS.find(e => e.map)
    state.tavern.workers = [{ uid: 1, name: 'Ash', spec: 'adventurer', rarity: 'common', level: 1, xp: 0, traits: [], status: 'idle', exp: null, injured: 0 }]
    expect(G.sendExpedition(1, ex.id, 0)).toBe(false)
    G.addItem('treasure_map', 1)
    expect(G.sendExpedition(1, ex.id, 0)).toBe(true)
    expect(G.qty('treasure_map')).toBe(0)
    // Maps turn up while thieving from the better-off
    expect(findAction('thieving', 'guard').extra.some(e => e.item === 'treasure_map')).toBe(true)
  })
})
