import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { TOWER_AFFIXES, AFFIX_IDS, affixOf, guardianOf, guardianReward } from '../src/game/data/tower.js'
import { towerMonster } from '../src/game/data/combat.js'
import { TRAITS } from '../src/game/data/fighting.js'

describe('endless tower', () => {
  it('gives every block of five floors a weekly affix, after the first', () => {
    for (let f = 1; f <= 5; f++) expect(affixOf(f, 10)).toBe(null)
    // The same all through a block, and different weeks bring different mixes
    expect(affixOf(6, 10)).toBe(affixOf(10, 10))
    expect(AFFIX_IDS).toContain(affixOf(6, 10))
    const weeks = new Set(Array.from({ length: 12 }, (_, w) => affixOf(6, w)))
    expect(weeks.size).toBeGreaterThan(2)
    Object.values(TOWER_AFFIXES).forEach(a => { if (a.trait) expect(TRAITS[a.trait]).toBeTruthy() })
  })

  it('builds floors with their affix and a named guardian every ten floors', () => {
    newHero()
    for (let f = 6; f <= 40; f++) {
      const m = G.towerFloor(f), a = affixOf(f)
      expect(m.affix).toBe(a)
      if (TOWER_AFFIXES[a].trait) expect(G.monsterTraits(m, null)).toContain(TOWER_AFFIXES[a].trait)
      if (TOWER_AFFIXES[a].speed) expect(m.speed).toBeLessThan(towerMonster(f).speed)
    }
    const g = G.towerFloor(20)
    expect(g.guardian).toBe(guardianOf(20))
    expect(g.name).toMatch(/★/)
  })

  it('pays a guardian reward once, on its first defeat', () => {
    newHero()
    for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 99)
    G.startCombat('tower')
    const act = state.activity
    act.floor = 10
    G.spawn(act)
    const r = guardianReward(10)
    const seen = []
    const off = G.on('guardian', e => seen.push(e.floor))
    G.killMonster(G.getMonster(act))
    expect(seen).toEqual([10])
    expect(state.tower.cleared[10]).toBe(true)
    expect(G.qty('gem_chest')).toBe(r.items.gem_chest)
    act.floor = 10
    G.spawn(act)
    G.killMonster(G.getMonster(act))
    off()
    expect(seen).toEqual([10])
    expect(guardianReward(50).items.starlight_shard).toBe(1)
  })

  it('ranks the hero against the best climbers of the guilds', () => {
    newHero()
    const list = G.towerRivals()
    expect(list.some(r => r.hero)).toBe(true)
    expect(list.filter(r => !r.hero).length).toBeGreaterThan(12)
    for (let i = 1; i < list.length; i++) expect(list[i - 1].best).toBeGreaterThanOrEqual(list[i].best)
    state.tower.best = 999
    expect(G.towerRivals()[0].hero).toBe(true)
  })

  it('sells the new tower goods', () => {
    newHero()
    state.tower.tokens = 400
    expect(G.buyTower('climbers_amulet')).toBe(true)
    expect(G.qty('climbers_amulet')).toBe(1)
  })
})
