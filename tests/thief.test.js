import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom } from './helpers.js'
import { HEISTS, STOLEN, HEAT_DECAY, CAUGHT_FROM } from '../src/game/data/thieving.js'
import { findAction } from '../src/game/data/actions.js'
import { SET_OF } from '../src/game/data/sets.js'

function thiefHero() {
  newHero({ role: 'rogue' })
  setLevel('thieving', 90); setLevel('agility', 70)
  G.addItem('rune_lockpick', 1); G.equip('rune_lockpick')
}

describe('thieving: heat, jail and the fence', () => {
  it('raises heat with every theft and lets it cool', () => {
    newHero()
    expect(G.heat()).toBe(0)
    G.thiefSucceeded(findAction('thieving', 'man'))
    const h = G.heat()
    expect(h).toBeGreaterThan(0)
    expect(G.heat(Date.now() + HEAT_DECAY * 1000)).toBe(0)
    // Heat makes thefts likelier to fail
    const a = findAction('thieving', 'man')
    const before = G.failChance('thieving', a)
    G.setHeat(80)
    expect(G.failChance('thieving', a)).toBeGreaterThan(before)
  })

  it('jails a hero caught on alert, until bribed', () => {
    newHero()
    G.setHeat(CAUGHT_FROM - 10)
    fixRandom(0)
    expect(G.thiefCaught()).toBe(false)
    G.setHeat(95)
    expect(G.thiefCaught()).toBe(true)
    expect(G.jailed()).toBe(true)
    G.startSkill('thieving', 'man')
    expect(state.activity).toBe(null)
    state.gold = 0
    expect(G.bribe()).toBe(false)
    state.gold = G.bribeCost()
    expect(G.bribe()).toBe(true)
    expect(G.jailed()).toBe(false)
  })

  it('halves the heat with an informant', () => {
    newHero()
    G.setHeat(60)
    state.gold = 1e5
    expect(G.payInformant()).toBe(true)
    expect(G.heat()).toBeLessThan(31)
  })

  it('pays more at the fence while the heat is low', () => {
    newHero()
    G.addItem('silver_goblet', 2)
    const calm = G.fencePrice('silver_goblet')
    G.setHeat(90)
    expect(G.fencePrice('silver_goblet')).toBeLessThan(calm)
    G.setHeat(0)
    const gold = state.gold
    expect(G.fence('silver_goblet')).toBe(calm * 2)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.qty('silver_goblet')).toBe(0)
  })

  it('lifts valuables of the right level', () => {
    newHero()
    setLevel('thieving', 10)
    fixRandom(0)
    const id = G.thiefSucceeded(findAction('thieving', 'man'))
    expect(STOLEN.find(s => s.id === id).lvl).toBeLessThanOrEqual(10)
  })
})

describe('heists', () => {
  it('needs levels, lockpicks and no cooldown', () => {
    newHero()
    expect(G.canHeist('merchant_vault')).toBe(false)
    thiefHero()
    expect(G.canHeist('merchant_vault')).toBe(true)
    HEISTS.forEach(h => Object.values(G.heistChances(h.id)).forEach(c => { expect(c).toBeGreaterThan(0); expect(c).toBeLessThan(1) }))
  })

  it('pays a clean job in gold, loot and heat, then cools down', () => {
    thiefHero()
    fixRandom(0)
    const gold = state.gold
    const r = G.runHeist('merchant_vault')
    expect(r.ok).toBe(true)
    expect(r.stages).toHaveLength(4)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.qty('silver_goblet')).toBeGreaterThan(0)
    expect(G.qty('shadow_mask')).toBe(1)
    expect(G.heat()).toBeGreaterThan(0)
    expect(G.canHeist('merchant_vault')).toBe(false)
    expect(G.heistCooldown('merchant_vault')).toBeGreaterThan(0)
    expect(SET_OF.shadow_mask.id).toBe('shadow')
  })

  it('ends in jail when the getaway fails', () => {
    thiefHero()
    const rolls = [0, 0, 0, 0.999]
    const spy = fixRandom(0)
    spy.mockImplementation(() => (rolls.length ? rolls.shift() : 0.5))
    const r = G.runHeist('merchant_vault')
    expect(r.ok).toBe(false)
    expect(r.caught).toBe(true)
    expect(G.jailed()).toBe(true)
  })
})
