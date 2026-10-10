import { describe, it, expect } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { ACHIEVEMENTS } from '../src/game/data/progression.js'
import { TITLES } from '../src/game/data/cosmetics.js'
import { i18n } from '../src/i18n/index.js'

describe('achievements', () => {
  it('all evaluate on a fresh hero without errors and have texts', () => {
    newHero()
    for (const a of ACHIEVEMENTS) {
      expect(() => a.check(G)).not.toThrow()
      expect(a.name).not.toMatch(/^ach\./)
      expect(a.desc).not.toMatch(/^ach\./)
    }
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('unlock for the new systems', () => {
    newHero()
    Object.assign(state.stats, { contracts: 10, superiors: 1, patrons: 10, guests: 1, bountiful: 10, jailed: 1, fenced: 10000, fish: 100 })
    state.guilds.best = { g0: 5 }
    state.tower.cleared = { 10: true }
    state.thief.done = { royal_treasury: 1 }
    state.farm.almanac = { sunberry: 1 }
    G.addItem('raw_anglerfish', 1)
    G.checkAchievements()
    for (const id of ['guild_join', 'guild_rank_3', 'guild_rank_5', 'contracts_10', 'superiors_1', 'patrons_10', 'guest_1', 'bountiful_10',
      'jailed_1', 'fenced_10000', 'fish_100', 'guardians_1', 'heists_1', 'royal_heist', 'hybrids_1', 'deep_catch']) {
      expect(state.achievements[id], id).toBeTruthy()
    }
    expect(state.achievements.royal_heist).toBeTruthy()
  })

  it('give every title a real unlock and a name', () => {
    const ids = new Set(ACHIEVEMENTS.map(a => a.id))
    for (const t of TITLES) {
      if (t.ach) expect(ids.has(t.ach), t.id).toBe(true)
      expect(i18n.global.te(`cosmetics.titles.${t.id}`), t.id).toBe(true)
    }
  })
})
