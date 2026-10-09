import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel, run, fixRandom } from './helpers.js'
import { MONSTERS } from '../src/game/data/combat.js'

describe('combat formulas', () => {
  beforeEach(() => newHero())

  it('keeps hit chance between 0 and 1 and rewards accuracy', () => {
    for (const [a, d] of [[0, 0], [1, 1e6], [1e6, 1], [500, 500]]) {
      const h = G.hitChance(a, d)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(1)
    }
    expect(G.hitChance(2000, 1000)).toBeGreaterThan(G.hitChance(1000, 2000))
  })

  it('scales monsters with difficulty', () => {
    const m = MONSTERS.goblin
    expect(G.scaleMonster(m)).toBe(m)
    state.difficulty = 'legend'
    expect(G.scaleMonster(m).hp).toBeGreaterThan(m.hp)
  })

  it('makes better gear and enchantments hit harder', () => {
    const base = G.playerStats(MONSTERS.goblin).maxHit
    setLevel('strength', 40); setLevel('attack', 40)
    G.addItem('rune_sword', 1); G.equip('rune_sword')
    const geared = G.playerStats(MONSTERS.goblin).maxHit
    expect(geared).toBeGreaterThan(base)
    state.enchant.weapon = 10
    expect(G.playerStats(MONSTERS.goblin).maxHit).toBeGreaterThan(geared)
  })
})

describe('fighting', () => {
  beforeEach(() => newHero())

  it('kills a monster, pays gold, drops loot and gives XP', () => {
    fixRandom(0) // every swing lands
    const gold = state.gold
    G.startCombat('area', 'chicken')
    run(30, 0.1)
    expect(state.killsBy.chicken).toBeGreaterThan(0)
    expect(G.qty('feathers')).toBeGreaterThan(0)
    expect(state.skills.attack.xp).toBeGreaterThan(0)
    expect(state.gold).toBeGreaterThanOrEqual(gold)
  })

  it('a landed hit always deals at least 1 damage', () => {
    fixRandom(0)
    G.startCombat('area', 'cow')
    const full = G.getMonster(state.activity).hp
    run(2.5, 0.1)
    expect(state.activity.mHp).toBeLessThan(full)
  })

  it('dying stops the fight, refills HP and counts the death', () => {
    state.difficulty = 'hard'
    state.gold = 1000
    G.startCombat('area', 'goblin')
    state.hp = 0
    G.die(MONSTERS.goblin)
    expect(state.stats.deaths).toBeGreaterThan(0)
    expect(state.activity).toBeNull()
    expect(state.hp).toBe(G.maxHp())
    expect(state.gold).toBeLessThan(1000)
  })

  it('locked areas cannot be entered', () => {
    G.startCombat('area', 'minotaur')
    expect(state.activity).toBeNull()
  })

  it('climbs the tower and records the best floor', () => {
    fixRandom(0)
    setLevel('attack', 60); setLevel('strength', 60); setLevel('defense', 60); setLevel('hitpoints', 60)
    state.hp = G.maxHp()
    G.startCombat('tower')
    run(120, 0.1)
    expect(state.tower.best).toBeGreaterThan(1)
    expect(state.tower.tokens).toBeGreaterThan(0)
  })
})
