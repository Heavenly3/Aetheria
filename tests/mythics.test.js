import { describe, it, expect } from 'vitest'
import { G, state, newHero, fixRandom } from './helpers.js'
import { ITEMS } from '../src/game/data/items.js'
import { MONSTERS, BOSSES } from '../src/game/data/combat.js'
import { MYTHIC_DROPS, MYTHIC_TIERS } from '../src/game/data/mythics.js'
import { MYTHIC_IDS } from '../src/game/mythics.js'
import { sourcesOf } from '../src/game/data/sources.js'
import { i18n } from '../src/i18n/index.js'
import ICONS from '../src/game/icons.json'

describe('ultra rare finds', () => {
  it('each has a tier, a drop, an icon, a name and a description', () => {
    expect(MYTHIC_IDS.length).toBe(25)
    for (const id of MYTHIC_IDS) {
      const it = ITEMS[id]
      expect(MYTHIC_TIERS[it.myth], id).toBeTruthy()
      expect(MYTHIC_DROPS.some(d => d.item === id), id).toBe(true)
      expect(ICONS[it.icon], id).toBeTruthy()
      expect(i18n.global.te(`items.${id}`, 'en') && i18n.global.te(`itemDesc.${id}`, 'en'), id).toBe(true)
      expect(sourcesOf(id).some(s => s.kind === 'mythic'), id).toBe(true)
    }
    // One in a million really is one in a million
    expect(Math.min(...MYTHIC_DROPS.map(d => d.chance))).toBe(1e-6)
  })

  it('are rolled by skill actions, only for their own skill', () => {
    newHero()
    fixRandom(0)
    const found = G.mythicAction('mining', 3)
    expect(found).toContain('worldheart_pickaxe')
    expect(found).toContain('hourglass_of_ages')
    expect(found).toContain('heart_of_aetheria')
    expect(found).not.toContain('evergreen_axe')
  })

  it('are rolled by kills, narrowed to bosses, areas, dragons and the tower', () => {
    newHero()
    fixRandom(0)
    const boss = G.mythicKill(BOSSES[0], { kind: 'boss' })
    expect(boss).toContain('forgotten_kings_crown')
    expect(boss).toContain('doomsday_edge')
    expect(boss).not.toContain('eternal_dragonplate')
    expect(G.mythicKill(MONSTERS.green_dragon, { kind: 'area' })).toContain('eternal_dragonplate')
    expect(G.mythicKill(MONSTERS.minotaur, { kind: 'area' })).toContain('voidwalker_greaves')
    expect(G.mythicKill(MONSTERS.chicken, { kind: 'area' })).not.toContain('starfall_cloak')
    expect(G.mythicKill({ id: 'tower_12', hp: 10, drops: [] }, { kind: 'tower' })).toContain('starfall_cloak')
  })

  it('keep the tiers apart: a roll good enough for an epic is far from a legendary', () => {
    newHero()
    fixRandom(1 / 55000)
    expect(G.mythicAction('mining', 3)).toEqual(['worldheart_pickaxe'])
    state.mythicStreak = {}
    fixRandom(1 / 45000)
    expect(G.mythicAction('mining', 3)).toEqual([])
    // A slow action counts for more
    expect(G.mythicAction('mining', 6)).toEqual(['worldheart_pickaxe'])
  })

  it('are locked, remembered, celebrated and give their bonuses', () => {
    newHero()
    const seen = []
    const off = G.on('mythic', e => seen.push(e))
    const speed = G.mod('speed.mining'), xp = G.mod('xp')
    G.awardMythic('worldheart_pickaxe')
    G.awardMythic('heart_of_aetheria')
    G.awardMythic('heart_of_aetheria')
    off()
    expect(seen.map(e => e.first)).toEqual([true, true, false])
    expect(G.isLocked('worldheart_pickaxe')).toBe(true)
    expect(G.sell('worldheart_pickaxe', 1)).toBe(0)
    expect(state.mythics.heart_of_aetheria.n).toBe(2)
    // A charm counts from the bag (once, however many), a tool once equipped
    expect(G.mod('xp')).toBeCloseTo(xp + 1)
    expect(G.mod('speed.mining')).toBe(speed)
    G.equip('worldheart_pickaxe')
    expect(G.mod('speed.mining')).toBeCloseTo(speed + 0.3)
    expect(G.toolTier('pickaxe')).toBe(10)
    expect(G.mythicsFound()).toBe(2)
  })

  it('grow likelier the longer an epic or legendary find is overdue, never a mythic one', () => {
    newHero()
    fixRandom(0.999)
    // 25,000 actions of 3 s (here as 25 of 3,000 s): half an epic and a tenth of the hourglass were due
    for (let i = 0; i < 25; i++) G.mythicAction('mining', 3000)
    expect(G.mythicStreak('worldheart_pickaxe')).toBeCloseTo(1.5)
    expect(G.mythicStreak('hourglass_of_ages')).toBeCloseTo(1.1)
    expect(G.mythicStreak('heart_of_aetheria')).toBe(1)
    expect(G.mythicStreak('evergreen_axe')).toBe(1)
    // Capped at three times the chance
    for (let i = 0; i < 200; i++) G.mythicAction('mining', 3000)
    expect(G.mythicStreak('worldheart_pickaxe')).toBe(3)
    // A roll that would miss at the base chance now hits, and the count starts again
    fixRandom(2.5 / 50000)
    expect(G.mythicAction('mining', 3)).toContain('worldheart_pickaxe')
    expect(G.mythicStreak('worldheart_pickaxe')).toBe(1)
    // The streak is kept through an ascension
    fixRandom(0.999)
    for (let i = 0; i < 25; i++) G.mythicAction('mining', 3000)
    for (const k of Object.keys(state.skills)) state.skills[k].xp = 1e6
    G.ascend()
    expect(G.mythicStreak('worldheart_pickaxe')).toBeCloseTo(1.5)
  })

  it('come through an ascension in the new bag', () => {
    newHero()
    G.awardMythic('doomsday_edge')
    G.awardMythic('evergreen_axe')
    for (const k of Object.keys(state.skills)) state.skills[k].xp = 1e6
    G.equip('doomsday_edge')
    G.ascend()
    expect(G.qty('doomsday_edge')).toBe(1)
    expect(G.qty('evergreen_axe')).toBe(1)
    expect(G.isLocked('doomsday_edge')).toBe(true)
    expect(G.mythicFound('doomsday_edge')).toBe(true)
  })
})
