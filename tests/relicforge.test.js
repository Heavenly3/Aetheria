import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { RARITIES } from '../src/game/data/omens.js'
import { reforgeOdds, rollOdds, REFORGE_COST, FUSE_COST, RESHAPE_COST, HEAT_MAX, SEAL_ITEM } from '../src/game/data/relicforge.js'
import { ITEMS } from '../src/game/data/items.js'

const rich = () => { state.gold = 1e7; G.addItem('stardust', 10000) }

describe('reforge odds', () => {
  it('add up to one, never go down when sealed, and favour better rolls with heat', () => {
    for (const q of RARITIES) {
      for (const sealed of [false, true]) {
        const odds = reforgeOdds(q, 3, sealed)
        expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
        if (sealed) expect(Object.keys(odds).every(x => RARITIES.indexOf(x) >= RARITIES.indexOf(q))).toBe(true)
      }
    }
    const up = (h) => { const o = reforgeOdds('rare', h); return o.epic + o.legendary + o.mythic }
    expect(up(HEAT_MAX)).toBeGreaterThan(up(0))
    expect(rollOdds({ common: 0.5, rare: 0.5 }, () => 0.2)).toBe('common')
    expect(rollOdds({ common: 0.5, rare: 0.5 }, () => 0.7)).toBe('rare')
  })
})

describe('the relic forge', () => {
  beforeEach(() => { newHero(); rich() })

  it('reforges a relic in the bag, pays for it and heats up on a bad roll', () => {
    G.addItem('astral_charm_rare', 1)
    const gold = state.gold, dust = G.qty('stardust')
    const r = G.reforgeRelic('astral_charm_rare', null, false, () => 0) // lowest roll: common
    expect(r).toMatchObject({ from: 'astral_charm_rare', to: 'astral_charm_common', dir: 'down' })
    expect(G.qty('astral_charm_rare')).toBe(0)
    expect(G.qty('astral_charm_common')).toBe(1)
    expect(state.gold).toBe(gold - REFORGE_COST.rare.gold)
    expect(G.qty('stardust')).toBe(dust - REFORGE_COST.rare.dust)
    expect(state.relicForge).toMatchObject({ heat: 1, reforged: 1 })
  })

  it('a seal keeps the quality and is spent; going up cools the forge', () => {
    G.addItem('veil_mantle_epic', 1)
    G.addItem(SEAL_ITEM, 1)
    state.relicForge.heat = 4
    expect(G.reforgeRelic('veil_mantle_epic', null, true, () => 0).to).toBe('veil_mantle_epic')
    expect(G.qty(SEAL_ITEM)).toBe(0)
    expect(state.relicForge.heat).toBe(5)
    expect(G.canReforge('veil_mantle_epic', null, true)).toBe(false)
    const r = G.reforgeRelic('veil_mantle_epic', null, false, () => 0.9999)
    expect(r.dir).toBe('up')
    expect(ITEMS[r.to].quality).toBe('mythic')
    expect(state.relicForge).toMatchObject({ heat: 0, ascended: 1, forgedMythic: 1 })
  })

  it('reforges a worn relic in place', () => {
    setLevel('defense', 50)
    G.addItem('moonlit_aegis_common', 1)
    G.equip('moonlit_aegis_common')
    expect(G.relicsOwned()[0]).toMatchObject({ id: 'moonlit_aegis_common', slot: 'shield' })
    const r = G.reforgeRelic('moonlit_aegis_common', 'shield', false, () => 0.9999)
    expect(state.equipment.shield).toBe(r.to)
    expect(G.qty(r.to)).toBe(0)
  })

  it('cannot reforge a mythic relic or without the stardust', () => {
    G.addItem('astral_charm_mythic', 1)
    expect(G.canReforge('astral_charm_mythic')).toBe(false)
    G.addItem('astral_charm_common', 1)
    G.removeItem('stardust', G.qty('stardust'))
    expect(G.reforgeRelic('astral_charm_common')).toBe(null)
  })

  it('fuses three relics of a quality into one of the next, of the chosen kind, and spares locked ones', () => {
    G.addItem('astral_charm_rare', 2)
    G.addItem('veil_mantle_rare', 1)
    G.addItem('moonlit_aegis_rare', 1)
    state.locked.moonlit_aegis_rare = true
    expect(G.fuseCount('rare')).toBe(3)
    const r = G.fuseRelics('rare', 'moonlit_aegis')
    expect(r.to).toBe('moonlit_aegis_epic')
    expect(r.used.sort()).toEqual(['astral_charm_rare', 'astral_charm_rare', 'veil_mantle_rare'])
    expect(G.qty('moonlit_aegis_rare')).toBe(1)
    expect(G.qty('moonlit_aegis_epic')).toBe(1)
    expect(G.fuseRelics('rare', 'astral_charm')).toBe(null)
    expect(state.relicForge.fused).toBe(1)
    G.addItem('astral_charm_mythic', 3)
    expect(G.canFuse('mythic', 'astral_charm')).toBe(false)
    expect(FUSE_COST.mythic).toBeUndefined()
  })

  it('reshapes a relic into another kind of the same quality', () => {
    G.addItem('moonlit_aegis_legendary', 1)
    const gold = state.gold
    expect(G.canReshape('moonlit_aegis_legendary', 'moonlit_aegis')).toBe(false)
    expect(G.reshapeRelic('moonlit_aegis_legendary', 'astral_charm').to).toBe('astral_charm_legendary')
    expect(G.qty('astral_charm_legendary')).toBe(1)
    expect(G.qty('moonlit_aegis_legendary')).toBe(0)
    expect(state.gold).toBe(gold - RESHAPE_COST.legendary.gold)
  })
})
