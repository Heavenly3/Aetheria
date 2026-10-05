import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel, run, fixRandom } from './helpers.js'
import { findAction } from '../src/game/data/actions.js'
import { CROPS } from '../src/game/data/items.js'

const clearOres = () => Object.keys(state.inventory).forEach(k => { if (/_ore$|_bar$/.test(k)) delete state.inventory[k] })

describe('skill actions', () => {
  beforeEach(() => newHero())

  it('turns inputs into outputs and XP', () => {
    fixRandom(0.999) // no doubles, no preserve, no extra loot
    G.addItem('copper_ore', 1)
    G.addItem('tin_ore', 1)
    G.startSkill('smithing', 'bronze_bar')
    const time = G.actionTime('smithing', findAction('smithing', 'bronze_bar'))
    run(time + 0.1, 0.1)
    expect(G.qty('bronze_bar')).toBe(1)
    expect(G.qty('copper_ore')).toBe(0)
    expect(state.skills.smithing.xp).toBeGreaterThan(0)
    expect(state.stats.actions).toBe(1)
  })

  it('refuses actions above your level or without the right tool', () => {
    G.startSkill('mining', 'runite_ore')
    expect(state.activity).toBeNull()
    setLevel('mining', 90)
    G.unequipTool('pickaxe')
    G.startSkill('mining', 'runite_ore')
    expect(state.activity).toBeNull()
  })

  it('gets faster with tools, agility and mastery', () => {
    const a = findAction('mining', 'copper_ore')
    const base = G.actionTime('mining', a)
    setLevel('agility', 50)
    expect(G.actionTime('mining', a)).toBeLessThan(base)
    state.mastery.mining = { copper_ore: 1e6 }
    expect(G.actionTime('mining', a)).toBeLessThan(base * 0.95)
  })

  it('stops a limited queue item after its count', () => {
    setLevel('mining', 1)
    G.enqueue('mining', 'copper_ore', 3)
    run(60)
    expect(G.qty('copper_ore')).toBeGreaterThanOrEqual(3)
    expect(state.activity).toBeNull()
  })
})

describe('chained crafting', () => {
  beforeEach(() => { newHero(); clearOres() })

  it('mines and smelts what a recipe is missing, then returns to it', () => {
    setLevel('smithing', 5)
    const seen = new Set()
    const off = G.on('activity', () => state.activity && seen.add(state.activity.action))
    G.startSkill('smithing', 'bronze_sword')
    run(300)
    off()
    expect([...seen]).toEqual(expect.arrayContaining(['bronze_bar', 'copper_ore', 'tin_ore']))
    expect(G.qty('bronze_sword')).toBeGreaterThan(0)
  })

  it('finishes a queued recipe exactly and moves on', () => {
    setLevel('mining', 20)
    setLevel('smithing', 20)
    G.enqueue('smithing', 'iron_bar', 3)
    run(300)
    expect(G.qty('iron_bar')).toBeGreaterThanOrEqual(3)
    expect(state.activity).toBeNull()
  })

  it('will not start when a material cannot be produced', () => {
    delete state.inventory.feathers
    G.addItem('arrow_shaft', 15)
    G.startSkill('fletching', 'headless_arrow')
    expect(state.activity).toBeNull()
  })

  it('can be switched off', () => {
    state.settings.autoChain = false
    setLevel('smithing', 5)
    G.startSkill('smithing', 'bronze_sword')
    expect(state.activity).toBeNull()
  })
})

describe('farming', () => {
  beforeEach(() => newHero())

  it('grows in real time and harvests', () => {
    state.farm.auto = false
    G.addItem('potato_seed', 1)
    expect(G.plant(0, 'potato')).toBe(true)
    expect(G.harvest(0)).toBeNull()
    run(G.growTime(CROPS.find(c => c.id === 'potato')) + 1, 1)
    const r = G.harvest(0)
    expect(r.item).toBe('potato')
    expect(r.n).toBeGreaterThan(0)
    expect(state.stats.harvests).toBe(1)
  })

  it('auto-harvests and replants when enabled', () => {
    G.addItem('potato_seed', 2)
    G.plant(0, 'potato')
    run(G.growTime(CROPS.find(c => c.id === 'potato')) + 1, 1)
    expect(G.qty('potato')).toBeGreaterThan(0)
    expect(state.farm.plots[0]?.crop).toBe('potato')
  })
})
