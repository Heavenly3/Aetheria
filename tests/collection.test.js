import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel, run } from './helpers.js'
import { SETS, SET_MAP, SET_OF } from '../src/game/data/sets.js'
import { BESTIARY, BEAST_GROUP, HUNT_BONUS } from '../src/game/data/bestiary.js'
import { AREAS, MONSTERS, BOSSES } from '../src/game/data/combat.js'

const wear = ids => ids.forEach(id => { G.addItem(id, 1); expect(G.equip(id)).toBe(true) })

describe('equipment sets', () => {
  beforeEach(() => { newHero(); ['attack', 'defense', 'strength', 'ranged', 'magic'].forEach(s => setLevel(s, 99)) })

  it('every set piece is a real item in a single set', () => {
    for (const s of SETS) for (const id of s.pieces) expect(SET_OF[id]).toBe(s)
  })

  it('adds bonuses as more pieces are worn', () => {
    ;['weapon', 'shield', 'head', 'body', 'legs'].forEach(slot => G.unequip(slot))
    const iron = SET_MAP.iron
    const def0 = G.mod('defense'), dmg0 = G.mod('meleeDmg'), hp0 = G.maxHp()
    wear(['iron_helm', 'iron_body'])
    expect(G.mod('defense')).toBeCloseTo(def0 + iron.bonuses[0].mods.defense)
    expect(G.mod('meleeDmg')).toBeCloseTo(dmg0)
    wear(['iron_legs', 'iron_shield'])
    expect(G.mod('meleeDmg')).toBeCloseTo(dmg0 + iron.bonuses[1].mods.meleeDmg)
    wear(['iron_sword'])
    expect(G.maxHp()).toBe(hp0 + iron.bonuses[2].mods.maxHp)
    G.unequip('head')
    expect(G.maxHp()).toBe(hp0)
    expect(G.activeSets()).toEqual([{ set: iron, worn: 4 }])
  })
})

describe('bestiary', () => {
  beforeEach(() => newHero())

  it('covers every area monster and boss once', () => {
    const ids = BESTIARY.flatMap(g => g.monsters.map(m => m.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of Object.keys(MONSTERS)) expect(BEAST_GROUP[id]).toBeTruthy()
    for (const b of BOSSES) expect(BEAST_GROUP[b.id].id).toBe('bosses')
    for (const g of BESTIARY) expect(g.reward.gold).toBeGreaterThan(0)
  })

  it('raises knowledge with kills and masters a creature for a combat bonus', () => {
    const m = MONSTERS.chicken
    expect(G.knowledge(m)).toBe(null)
    state.bestiary.kills.chicken = 1
    expect(G.knowledge(m)).toBe('seen')
    state.bestiary.kills.chicken = 25
    expect(G.knowledge(m)).toBe('studied')
    const before = G.playerStats(m).accRoll
    state.bestiary.kills.chicken = 250
    expect(G.knowledge(m)).toBe('hunted')
    expect(G.playerStats(m).accRoll).toBeCloseTo(before * (1 + HUNT_BONUS) / 1, -1)
  })

  it('records drops when they fall', () => {
    G.recordDrop('chicken', 'feathers')
    expect(G.dropSeen('chicken', 'feathers')).toBe(true)
    G.recordDrop('tower_5', 'bones')
    expect(state.bestiary.drops.tower_5).toBeUndefined()
  })

  it('pays a group reward once, after every creature is studied', () => {
    const meadow = BESTIARY.find(g => g.id === AREAS[0].id)
    expect(G.claimGroup(meadow.id)).toBe(false)
    meadow.monsters.forEach(m => (state.bestiary.kills[m.id] = 25))
    const gold = state.gold, mod = G.mod('gold')
    expect(G.claimableGroups()).toBe(1)
    expect(G.claimGroup(meadow.id)).toBe(true)
    expect(state.gold).toBeGreaterThanOrEqual(gold + meadow.reward.gold)
    expect(G.mod('gold')).toBeCloseTo(mod + meadow.reward.mods.gold)
    expect(G.claimGroup(meadow.id)).toBe(false)
  })

  it('survives an ascension', () => {
    state.bestiary.kills.chicken = 30
    G.recordDrop('chicken', 'feathers')
    state.bestiary.claimed.meadow = true
    for (const k of Object.keys(state.skills)) state.skills[k].xp = 2e7
    expect(G.canAscend()).toBe(true)
    G.ascend()
    expect(state.bestiary.claimed.meadow).toBe(true)
    expect(G.dropSeen('chicken', 'feathers')).toBe(true)
  })
})

describe('bestiary migration', () => {
  it('starts old saves from their current kill counts', () => {
    newHero()
    const old = JSON.parse(JSON.stringify(state))
    delete old.bestiary
    old.killsBy = { chicken: 40, goblin: 3 }
    G.loadSave(old)
    expect(G.knowledge(MONSTERS.chicken)).toBe('studied')
    expect(G.beastKills('goblin')).toBe(3)
  })

  it('counts kills made in combat', () => {
    newHero()
    ;['attack', 'strength', 'defense', 'hitpoints'].forEach(s => setLevel(s, 60))
    state.hp = G.maxHp()
    G.startCombat('area', 'chicken')
    run(120)
    expect(G.beastKills('chicken')).toBe(state.killsBy.chicken)
    expect(G.beastKills('chicken')).toBeGreaterThan(5)
  })
})
