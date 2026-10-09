import { describe, it, expect } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { ITEMS } from '../src/game/data/items.js'
import { PAGES, PAGE_IDS, PAGE_REWARDS, CRAFTED, CRAFTED_COUNT, MASTER_MILESTONES } from '../src/game/data/codex.js'

describe('compendium', () => {
  it('has a page for every kind of item and puts each item on one page', () => {
    const all = PAGE_IDS.flatMap(p => PAGES[p])
    expect(new Set(all).size).toBe(all.length)
    PAGE_IDS.forEach(p => { expect(PAGES[p].length).toBeGreaterThan(0); expect(PAGE_REWARDS[p]).toBeTruthy() })
    // Finer versions and relics stay out
    expect(all.some(id => ITEMS[id].base || ITEMS[id].relic)).toBe(false)
    expect(CRAFTED_COUNT).toBeGreaterThan(50)
  })

  it('records every item the hero gets, and the plain piece for finer ones', () => {
    newHero()
    expect(G.codexHas('bronze_sword')).toBe(true) // starting gear
    expect(G.codexHas('rune_bar')).toBe(false)
    G.addItem('rune_bar', 1)
    G.removeItem('rune_bar', 1)
    expect(G.codexHas('rune_bar')).toBe(true)
    G.addItem('iron_helm_q2', 1)
    expect(G.codexHas('iron_helm')).toBe(true)
    expect(G.gradeMade('iron_helm')).toBe(2)
    G.addItem('iron_helm_q1', 1)
    expect(G.gradeMade('iron_helm')).toBe(2)
  })

  it('pays a full page once, with its bonus', () => {
    newHero()
    const p = 'wood'
    expect(G.claimPage(p)).toBe(false)
    PAGES[p].forEach(id => G.addItem(id, 1))
    expect(G.pageComplete(p)).toBe(true)
    expect(G.codexClaimable()).toBeGreaterThanOrEqual(1)
    const key = Object.keys(PAGE_REWARDS[p])[0]
    const before = G.mod(key), gold = state.gold
    expect(G.claimPage(p)).toBe(true)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.mod(key)).toBeCloseTo(before + PAGE_REWARDS[p][key])
    expect(G.claimPage(p)).toBe(false)
  })

  it('counts distinct masterworks towards milestones', () => {
    newHero()
    const list = Object.values(CRAFTED).flat()
    list.slice(0, 4).forEach(id => G.addItem(id + '_q3', 1))
    G.addItem(list[0] + '_q3', 1)
    expect(G.masterworks()).toBe(4)
    expect(G.masterworkDone(0)).toBe(false)
    G.addItem(list[4] + '_q3', 1)
    expect(G.masterworkDone(0)).toBe(true)
    const before = G.mod('quality')
    expect(G.claimMasterwork(0)).toBe(true)
    expect(G.mod('quality')).toBeCloseTo(before + MASTER_MILESTONES[0].mods.quality)
    expect(G.claimMasterwork(1)).toBe(false)
  })

  it('fills in what older saves already had', () => {
    newHero()
    state.codex = { items: {}, grades: {}, claimed: {}, seeded: false }
    state.inventory.oak_logs = 3
    state.bestiary.drops.goblin = { bronze_sword: 1, air_rune: 1 }
    G.ensureCodex()
    expect(G.codexHas('oak_logs')).toBe(true)
    expect(G.codexHas('air_rune')).toBe(true)
  })
})
