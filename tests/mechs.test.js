import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { MECHS, BOSS_MECHS, BREAK_SHARE, GUARD_TAKEN } from '../src/game/data/fighting.js'
import { BOSSES, DUNGEONS } from '../src/game/data/combat.js'
import { i18n } from '../src/i18n/index.js'

const te = k => i18n.global.te(k, 'en')
const bossById = id => BOSSES.find(b => b.id === id) || DUNGEONS.find(d => d.boss.id === id)?.boss
function fight(boss) {
  newHero()
  for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 60)
  state.hp = G.maxHp()
  G.startCombat('boss', boss)
  const act = state.activity
  return { act, m: G.getMonster(act) }
}
// Makes the boss start one of its moves on the next tick
function charge(act, m, id) {
  act.mech = { timers: Object.fromEntries(G.bossMechs(m).map(x => [x, x === id ? 0 : 999])), charge: null }
  G.bossMechTick(act, m, 0.01)
}

describe('boss mechanics', () => {
  it('belong to real bosses and have their texts', () => {
    for (const [boss, list] of Object.entries(BOSS_MECHS)) {
      expect(bossById(boss), boss).toBeTruthy()
      for (const id of list) expect(MECHS[id], id).toBeTruthy()
    }
    for (const id in MECHS) for (const k of ['name', 'desc']) expect(te(`fighting.mechs.${id}.${k}`), id).toBe(true)
  })

  it('charge a strike, brace the hero and put the stance back after', () => {
    const { act, m } = fight('goblin_king')
    G.setStance('attack')
    charge(act, m, 'slam')
    expect(act.mech.charge.id).toBe('slam')
    expect(state.combatStyle).toBe('defense')
    const hp = state.hp
    G.bossMechTick(act, m, MECHS.slam.charge + 0.1)
    expect(act.mech.charge).toBe(null)
    expect(state.combatStyle).toBe('attack')
    expect(act.notes[0].kind).toBe('mechGuarded')
    expect(state.hp).toBeLessThan(hp)
  })

  it('hit far harder when the hero does not guard', () => {
    const guarded = (() => { const { act, m } = fight('goblin_king'); charge(act, m, 'slam'); const hp = state.hp; G.bossMechTick(act, m, 9); return hp - state.hp })()
    const { act, m } = fight('goblin_king')
    state.tactics.brace = false
    G.setStance('attack')
    charge(act, m, 'slam')
    expect(state.combatStyle).toBe('attack')
    const hp = state.hp
    G.bossMechTick(act, m, 9)
    expect(act.notes[0].kind).toBe('mechHit')
    expect(hp - state.hp).toBeGreaterThan(guarded / GUARD_TAKEN * 0.6)
  })

  it('heal unless the hero breaks the channel with damage', () => {
    let { act, m } = fight('troll_lord')
    act.mHp = Math.round(m.hp / 2)
    charge(act, m, 'mend')
    G.bossMechTick(act, m, 9)
    expect(act.mHp).toBeGreaterThan(m.hp / 2)
    ;({ act, m } = fight('troll_lord'))
    act.mHp = Math.round(m.hp / 2)
    charge(act, m, 'mend')
    act.mech.charge.dealt = m.hp * BREAK_SHARE
    G.bossMechTick(act, m, 9)
    expect(act.mHp).toBe(Math.round(m.hp / 2))
    expect(act.notes[0].kind).toBe('mechBroken')
  })

  it('leave ordinary creatures alone', () => {
    newHero()
    G.startCombat('area', 'cow')
    expect(G.bossMechs(G.getMonster(state.activity))).toEqual([])
  })
})
