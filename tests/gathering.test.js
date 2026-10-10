import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom } from './helpers.js'
import { ITEMS, CROPS } from '../src/game/data/items.js'
import { findAction, ACTIONS } from '../src/game/data/actions.js'
import { TOOL_TYPES } from '../src/game/data/character.js'

describe('gathering', () => {
  it('has a gem rock, two more fish and thieving stalls', () => {
    expect(findAction('mining', 'gem_rock').extra.some(e => e.item === 'uncut_diamond')).toBe(true)
    expect(findAction('fishing', 'raw_tuna')).toBeTruthy()
    expect(findAction('fishing', 'raw_anglerfish')).toBeTruthy()
    expect(findAction('cooking', 'tuna')).toBeTruthy()
    for (const id of ['bakery_stall', 'silk_stall', 'gem_stall']) expect(findAction('thieving', id).group).toBe('groups.stalls')
    // Every skill's list stays in level order
    for (const sk of ['mining', 'fishing', 'thieving']) {
      const lv = ACTIONS[sk].map(a => a.lvl)
      expect([...lv].sort((a, b) => a - b)).toEqual(lv)
    }
  })

  it('turns up rare finds while gathering', () => {
    expect(findAction('mining', 'iron_ore').extra.some(e => e.item === 'geode')).toBe(true)
    expect(findAction('fishing', 'raw_trout').extra.some(e => e.item === 'casket')).toBe(true)
    for (const id of ['geode', 'casket', 'seed_pouch']) expect(ITEMS[id].type).toBe('chest')
  })

  it('opens geodes, caskets and seed pouches', () => {
    newHero()
    setLevel('mining', 50); setLevel('farming', 40)
    for (const id of ['geode', 'casket', 'seed_pouch']) {
      G.addItem(id, 1)
      const got = G.openChest(id)
      expect(Object.keys(got).length).toBeGreaterThan(0)
      expect(G.qty(id)).toBe(0)
    }
    // Seed pouches never hold seeds far above the hero's level
    G.addItem('seed_pouch', 20)
    for (let i = 0; i < 20; i++) {
      const got = G.openChest('seed_pouch')
      for (const k of Object.keys(got)) expect(CROPS.find(c => c.id + '_seed' === k).lvl).toBeLessThanOrEqual(50)
    }
  })

  it('makes crops grow faster and yield more with a sickle', () => {
    newHero()
    expect(TOOL_TYPES.sickle).toBeTruthy()
    const crop = CROPS[0]
    const slow = G.growTime(crop)
    setLevel('farming', 60)
    G.addItem('rune_sickle', 1)
    expect(G.equip('rune_sickle')).toBe(true)
    expect(G.growTime(crop)).toBeLessThan(slow)
    expect(findAction('smithing', 'rune_sickle')).toBeTruthy()
  })

  it('makes thieving safer with lockpicks', () => {
    newHero()
    setLevel('thieving', 60)
    const a = { lvl: 55 }
    const before = G.failChance('thieving', a)
    G.addItem('mithril_lockpick', 1)
    expect(G.equip('mithril_lockpick')).toBe(true)
    expect(G.failChance('thieving', a)).toBeLessThan(before)
    expect(G.actionTime('thieving', findAction('thieving', 'knight'))).toBeLessThan(findAction('thieving', 'knight').time)
  })

  it('drops a seed pouch now and then when harvesting', () => {
    newHero()
    state.farm.plots[0] = { crop: 'potato', t: 0, total: 100 }
    fixRandom(0)
    G.harvest(0)
    expect(G.qty('seed_pouch')).toBe(1)
  })
})
