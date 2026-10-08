import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel, run } from './helpers.js'

describe('save slots', () => {
  beforeEach(() => newHero({ name: 'Saver' }))

  it('saves, lists and loads a slot', () => {
    setLevel('mining', 30)
    G.addItem('iron_ore', 42)
    state.gold = 777
    G.save()
    const slots = G.listSlots()
    expect(slots[0]).toMatchObject({ name: 'Saver', gold: 777 })
    expect(slots.slice(1)).toEqual([null, null, null])
    expect(G.lastSlot()).toBe(0)

    newHero({ name: 'Other' })
    expect(G.loadSlot(0)).toBe(true)
    expect(state.name).toBe('Other') // newHero overwrote slot 0
  })

  it('keeps independent slots', () => {
    state.gold = 111
    G.save()
    G.newGame(2, { name: 'Second', role: 'mage', difficulty: 'easy' })
    state.gold = 222
    G.save()
    expect(G.loadSlot(0)).toBe(true)
    expect(state.gold).toBe(111)
    expect(G.loadSlot(2)).toBe(true)
    expect(state).toMatchObject({ name: 'Second', role: 'mage', gold: 222 })
  })

  it('deletes a slot', () => {
    G.deleteSlot(0)
    expect(G.listSlots()[0]).toBeNull()
    expect(G.lastSlot()).toBeNull()
  })

  it('round-trips through export and import', () => {
    setLevel('fishing', 45)
    G.addItem('raw_lobster', 9)
    const code = G.exportSave()
    newHero({ name: 'Blank' })
    G.importSave(code)
    expect(state.name).toBe('Saver')
    expect(G.level('fishing')).toBe(45)
    expect(G.qty('raw_lobster')).toBe(9)
  })

  it('rejects an invalid save code', () => {
    expect(() => G.importSave('not a save')).toThrow()
    expect(() => G.importSave(btoa(JSON.stringify({ hello: 1 })))).toThrow()
  })
})

describe('older saves', () => {
  beforeEach(() => newHero())

  it('fills in systems added after the save was made', () => {
    const raw = JSON.parse(JSON.stringify(state))
    for (const k of ['pets', 'enchant', 'daily', 'ascension', 'tavern', 'queue', 'settings']) delete raw[k]
    raw.inventory.removed_item = 5
    raw.skills.construction = { xp: 100 }
    G.importSave(btoa(unescape(encodeURIComponent(JSON.stringify(raw)))))
    expect(state.pets).toEqual({})
    expect(state.enchant).toEqual({})
    expect(state.ascension).toMatchObject({ shards: 0, count: 0 })
    expect(Array.isArray(state.tavern.workers)).toBe(true)
    expect(state.settings.autoChain).toBe(true)
    expect(state.inventory.removed_item).toBeUndefined()
    expect(state.skills.construction).toBeUndefined()
    // and the game keeps running
    run(5)
    expect(state.daily.tasks).toHaveLength(3)
  })
})

describe('offline progress', () => {
  beforeEach(() => newHero())

  it('simulates time away and reports it', () => {
    G.startSkill('mining', 'copper_ore')
    const summary = G.simulate(600)
    expect(summary.seconds).toBe(600)
    expect(summary.items.copper_ore || G.qty('copper_ore')).toBeGreaterThan(50)
    expect(summary.xp.mining).toBeGreaterThan(0)
  })

  it('stops at the offline cap', () => {
    G.startSkill('mining', 'copper_ore')
    const cap = G.offlineCapHours() * 3600
    const summary = G.simulate(cap * 3)
    expect(summary.capped).toBe(true)
    expect(summary.seconds).toBe(cap)
  }, 30000) // simulates eight hours of play, which can be slow on a busy machine
})
