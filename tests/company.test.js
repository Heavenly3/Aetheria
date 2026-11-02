import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { MERC_ROLES, PARTY_SLOTS, HURT_TIME, wageOf, mercXpNeed } from '../src/game/data/company.js'
import { MECHS } from '../src/game/data/fighting.js'
import { te } from '../src/i18n/index.js'
import { SKILLS } from '../src/game/data/skills.js'
import { ASCEND_MIN_TOTAL } from '../src/game/data/ascension.js'

function hero() {
  newHero()
  for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 60)
  state.hp = G.maxHp()
  state.gold = 1e6
}

describe('the company', () => {
  it('hires one of each trade, fills the party up to its slots and has its texts', () => {
    hero()
    const gold = state.gold
    const sq = G.hireMerc('squire')
    expect(sq.name).toBeTruthy()
    expect(state.gold).toBe(gold - G.mercHireCost())
    expect(G.hireMerc('squire')).toBe(null)
    G.hireMerc('archer'); G.hireMerc('cleric')
    expect(state.company.party).toHaveLength(PARTY_SLOTS)
    expect(G.toggleParty('cleric')).toBe(false)
    G.toggleParty('squire')
    expect(G.toggleParty('cleric')).toBe(true)
    for (const r in MERC_ROLES) for (const k of ['name', 'desc']) expect(te(`company.roles.${r}.${k}`), r).toBe(true)
  })

  it('comes along to bosses and dungeons for a wage, but not to the open field', () => {
    hero()
    G.hireMerc('squire'); G.hireMerc('mage')
    const gold = state.gold
    G.startCombat('boss', 'goblin_king')
    expect(state.activity.party).toEqual(['squire', 'mage'])
    expect(state.gold).toBe(gold - 2 * wageOf(1))
    G.stop()
    G.startCombat('area', 'goblin')
    expect(state.activity.party).toEqual([])
  })

  it('stays behind when the wages cannot be paid', () => {
    hero()
    G.hireMerc('archer')
    state.gold = 0
    G.startCombat('boss', 'goblin_king')
    expect(state.activity.party).toEqual([])
  })

  it('fights: draws blows, deals damage, and an archer can cut off a move', () => {
    hero()
    G.hireMerc('squire'); G.hireMerc('archer')
    G.startCombat('dungeon', 'goblin_warren')
    const act = state.activity, m = G.getMonster(act)
    expect(G.heroDrawShare(act)).toBeCloseTo(1 / 4)
    expect(G.partyGuard(act)).toBe(MERC_ROLES.squire.guard)
    const hp = act.mHp
    for (let i = 0; i < 10; i++) G.companyTick(act, m, 2.4, G.playerStats(m))
    expect(act.mHp).toBeLessThan(hp)
    act.mHp = hp
    // A move of the goblin, with the archer sure to answer it
    const real = Math.random
    Math.random = () => 0
    act.mech = { timers: {}, charge: { id: 'steal', left: MECHS.steal.charge, total: MECHS.steal.charge, dealt: 0 } }
    G.companyTick(act, m, 0.1, G.playerStats(m))
    Math.random = real
    expect(act.mech.charge).toBe(null)
    expect(act.notes.some(n => n.kind === 'mercInterrupt')).toBe(true)
  })

  it('grows with every creature defeated, and is hurt for a while if the hero falls', () => {
    hero()
    G.hireMerc('cleric')
    G.startCombat('boss', 'goblin_king')
    const act = state.activity, m = G.getMonster(act)
    const mem = G.companyMember('cleric')
    mem.xp = mercXpNeed(1) - 1
    G.companyKill(m, act)
    expect(mem.lvl).toBeGreaterThan(1)
    G.companyFell(act)
    expect(G.mercHurt(mem)).toBe(true)
    expect(mem.hurtUntil - Date.now()).toBeLessThanOrEqual(HURT_TIME)
    expect(G.partyReady()).toEqual([])
  })

  it('stays with the hero through rebirth', () => {
    hero()
    G.hireMerc('mage')
    const per = Math.ceil(ASCEND_MIN_TOTAL / Object.keys(SKILLS).length) + 1
    for (const k of Object.keys(SKILLS)) setLevel(k, Math.min(99, per))
    for (const id of Object.keys(state.inventory)) delete state.inventory[id]
    G.ascend()
    expect(G.companyMember('mage')?.role).toBe('mage')
    expect(state.company.party).toEqual(['mage'])
  })
})
