import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom, run } from './helpers.js'
import { CROPS, ITEMS } from '../src/game/data/items.js'
import { HYBRIDS, BUILDINGS, FAVOURITE_SEASON, SOIL } from '../src/game/data/farm.js'
import { findAction } from '../src/game/data/actions.js'

const plant = (i, crop, t = 100) => { state.farm.plots[i] = { crop, t, total: 100 } }

describe('farm', () => {
  it('gives every crop a favourite season and every hybrid real parents', () => {
    CROPS.forEach(c => expect(['spring', 'summer', 'autumn', 'winter']).toContain(FAVOURITE_SEASON[c.id]))
    HYBRIDS.forEach(h => {
      expect(CROPS.find(c => c.id === h.id)?.hybrid).toBe(true)
      h.parents.forEach(p => expect(CROPS.find(c => c.id === p && !c.hybrid)).toBeTruthy())
    })
    // Each hybrid has a use
    expect(findAction('herblore', 'supercompost').in.moonroot).toBe(1)
    expect(findAction('cooking', 'ember_stew').in.emberbloom).toBe(1)
    expect(findAction('herblore', 'wisdom_elixir').in.starpetal).toBe(2)
  })

  it('works compost into a growing plot for a bigger harvest', () => {
    newHero()
    plant(0, 'potato')
    expect(G.fertilize(0, 'compost')).toBe(false)
    G.addItem('compost', 1); G.addItem('supercompost', 1)
    expect(G.fertilize(0, 'compost')).toBe(true)
    expect(state.farm.plots[0].soil).toBe(1)
    expect(G.fertilize(0, 'supercompost')).toBe(true)
    expect(state.farm.plots[0].soil).toBe(2)
    expect(state.farm.plots[0].t).toBe(75)
    const p = state.farm.plots[0]
    expect(G.plotYield({ ...p, event: null }, 3)).toBeGreaterThanOrEqual(3 + SOIL.supercompost.yield)
  })

  it('rolls bountiful crops and pests halfway, and lets the hero shoo pests', () => {
    newHero()
    plant(0, 'potato', 100)
    fixRandom(0)
    G.updateFarm(51)
    expect(state.farm.plots[0].event).toBe('bountiful')
    expect(G.plotYield(state.farm.plots[0], 4)).toBeGreaterThanOrEqual(8)
    plant(1, 'potato', 100)
    state.farm.plots[1].rolled = true
    state.farm.plots[1].event = 'pests'
    expect(G.plotYield(state.farm.plots[1], 4)).toBeLessThanOrEqual(3)
    const xp = state.skills.farming.xp
    expect(G.shoo(1)).toBe(true)
    expect(state.farm.plots[1].event).toBe(null)
    expect(state.skills.farming.xp).toBeGreaterThan(xp)
  })

  it('keeps pests away with a full scarecrow', () => {
    newHero()
    state.farm.buildings.scarecrow = 3
    plant(0, 'potato', 100)
    // A roll that would have been pests without the scarecrow
    const p = state.farm.plots[0]
    const spy = fixRandom(0.15)
    G.rollPlotEvent(p)
    expect(p.event).toBeFalsy()
    spy.mockRestore()
  })

  it('crosses two parents growing side by side into hybrid seeds', () => {
    newHero()
    setLevel('farming', 40)
    plant(0, 'strawberry', 0)
    plant(1, 'tomato', 50)
    const seen = []
    const off = G.on('hybrid', e => seen.push(e.id))
    fixRandom(0)
    const r = G.harvest(0)
    off()
    expect(r.cross.id).toBe('sunberry')
    expect(G.qty('sunberry_seed')).toBeGreaterThan(0)
    expect(G.hybridKnown('sunberry')).toBe(true)
    expect(seen).toEqual(['sunberry'])
  })

  it('builds a coop that lays eggs on its own, up to what it stores', () => {
    newHero()
    expect(G.buildFarm('coop')).toBe(false)
    state.gold = 1e6
    G.addItem('logs', 100)
    expect(G.buildFarm('coop')).toBe(true)
    expect(G.building('coop')).toBe(1)
    const t0 = state.farm.made.coop
    expect(G.farmReady('coop', t0)).toBe(0)
    expect(G.farmReady('coop', t0 + BUILDINGS.coop.every * 3)).toBe(3)
    expect(G.farmReady('coop', t0 + BUILDINGS.coop.every * 100)).toBe(BUILDINGS.coop.store)
    const got = G.collectFarm('coop', t0 + BUILDINGS.coop.every * 2)
    expect(got.egg).toBeGreaterThanOrEqual(2)
    expect(G.qty('egg')).toBe(got.egg)
    expect(G.farmReady('coop', t0 + BUILDINGS.coop.every * 2)).toBe(0)
  })

  it('makes crops grow faster with a well', () => {
    newHero()
    const c = CROPS[0], before = G.growTime(c)
    state.farm.buildings.well = 2
    expect(G.growTime(c)).toBeLessThan(before)
  })

  it('never puts hybrid seeds in nests or pouches', () => {
    newHero()
    setLevel('farming', 99)
    G.addItem('seed_pouch', 30); G.addItem('bird_nest', 30)
    for (let i = 0; i < 30; i++) { G.openChest('seed_pouch'); G.openChest('bird_nest') }
    HYBRIDS.forEach(h => expect(G.qty(h.id + '_seed')).toBe(0))
    expect(ITEMS.honey && ITEMS.egg).toBeTruthy()
  })
})
