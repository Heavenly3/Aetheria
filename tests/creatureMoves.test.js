import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { MECHS, CREATURE_MOVES, ELITE_MOVES, ELITES, CREATURE_BUFFS, FLEE_TIME } from '../src/game/data/fighting.js'
import { MONSTERS } from '../src/game/data/combat.js'
import { i18n } from '../src/i18n/index.js'

const te = k => i18n.global.te(k, 'en')
function fight(monster, kind = 'area') {
  newHero()
  for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 70)
  state.hp = G.maxHp()
  G.startCombat(kind, monster)
  const act = state.activity
  act.elite = null
  return { act, m: G.getMonster(act) }
}
// Makes the creature start one of its moves on the next tick
function charge(act, m, id) {
  act.mech = { timers: Object.fromEntries(G.monsterMechs(m, act).map(x => [x, x === id ? 0 : 999])), charge: null }
  G.bossMechTick(act, m, 0.01)
}

describe('creature moves', () => {
  it('belong to real creatures and have their texts', () => {
    for (const [id, move] of Object.entries(CREATURE_MOVES)) {
      expect(MONSTERS[id], id).toBeTruthy()
      expect(MECHS[move]?.creature, move).toBe(true)
    }
    for (const [kind, move] of Object.entries(ELITE_MOVES)) {
      expect(ELITES[kind], kind).toBeTruthy()
      expect(MECHS[move], move).toBeTruthy()
    }
    for (const id in MECHS) for (const k of ['name', 'desc']) expect(te(`fighting.mechs.${id}.${k}`), id).toBe(true)
  })

  it('are only used out in the regions and dungeons, and an elite brings one more', () => {
    const { act, m } = fight('wolf')
    act.elite = null
    expect(G.monsterMechs(m, act)).toEqual(['howl'])
    act.elite = 'armoured'
    expect(G.monsterMechs(m, act)).toEqual(['howl', 'harden'])
    expect(G.monsterMechs(m, { type: 'combat', kind: 'tower' })).toEqual([])
    expect(G.monsterMechs(MONSTERS.chicken, null)).toEqual([])
  })

  it('are unknown until seen in a fight', () => {
    const { act, m } = fight('wolf')
    expect(G.moveKnown(m, 'howl')).toBe(false)
    charge(act, m, 'howl')
    expect(act.mech.charge.id).toBe('howl')
    expect(G.moveKnown(m, 'howl')).toBe(true)
  })

  it('are cut off by a stun or a slow while they charge', () => {
    const { act, m } = fight('ogre')
    charge(act, m, 'smash')
    expect(act.mech.charge).toBeTruthy()
    G.addStatus(act, 'monster', 'stun', 5)
    expect(act.mech.charge).toBe(null)
    expect(act.notes[0].kind).toBe('mechInterrupted')
    expect(state.stats.interrupts).toBe(1)
  })

  it('give the creature a boon for a while', () => {
    const { act, m } = fight('skeleton')
    charge(act, m, 'harden')
    G.bossMechTick(act, m, MECHS.harden.charge + 0.1)
    expect(act.mb.harden).toBeGreaterThan(0)
    expect(G.creatureBuff(act, 'armour')).toBe(CREATURE_BUFFS.harden.armour)
    G.bossMechTick(act, m, CREATURE_BUFFS.harden.time + 1)
    expect(act.mb.harden).toBeUndefined()
  })

  it('let a thief run off with gold unless it falls first', () => {
    let { act, m } = fight('goblin')
    state.gold = 1000
    charge(act, m, 'steal')
    G.bossMechTick(act, m, MECHS.steal.charge + 0.1)
    const taken = act.stolen
    expect(taken).toBeGreaterThan(0)
    expect(state.gold).toBe(1000 - taken)
    // Defeated in time: the gold comes back
    act.mHp = 0
    G.killMonster(m)
    expect(state.gold).toBeGreaterThanOrEqual(1000)
    // Not in time: it is gone
    ;({ act, m } = fight('goblin'))
    state.gold = 1000
    charge(act, m, 'steal')
    G.bossMechTick(act, m, MECHS.steal.charge + 0.1)
    const lost = act.stolen
    expect(G.bossMechTick(act, m, FLEE_TIME + 1)).toBe('fled')
    G.monsterFled(m)
    expect(state.gold).toBe(1000 - lost)
    expect(act.respawn).toBeGreaterThan(0)
  })
})
