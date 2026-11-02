import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'

function fight(monster, bar) {
  newHero()
  for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 60)
  state.hp = G.maxHp()
  G.setStyleType('melee')
  state.abilities.bar.melee = bar
  G.startCombat('area', monster)
  const act = state.activity
  act.elite = null
  return { act, m: G.getMonster(act) }
}
function charge(act, m, id) {
  act.mech = { timers: Object.fromEntries(G.monsterMechs(m, act).map(x => [x, x === id ? 0 : 999])), charge: null }
  G.bossMechTick(act, m, 0.01)
}

describe('tactics rules', () => {
  it('answer a creature move at once with an interrupt', () => {
    const { act, m } = fight('ogre', ['power_strike', 'shield_bash'])
    act.energy = 100
    charge(act, m, 'smash')
    G.reactToCharge(act, m, G.playerStats(m), G.monsterRolls(m))
    expect(act.cd.shield_bash).toBeGreaterThan(0)
    expect(act.notes.some(n => n.kind === 'ability' && n.id === 'shield_bash')).toBe(true)
    // A miss leaves the charge going; a landed bash cuts it off
    if (act.fx.monster.stun) expect(act.mech.charge).toBe(null)
  })

  it('keep the interrupt and its energy for a creature that can be cut off', () => {
    const { act } = fight('wolf', ['power_strike', 'shield_bash'])
    act.energy = 45
    expect(G.readyAbility(act)).toBe(null)
    act.energy = 80
    expect(G.readyAbility(act).id).toBe('power_strike')
    state.tactics.interrupt = false
    act.energy = 45
    expect(G.readyAbility(act).id).toBe('power_strike')
  })

  it('defend at low health', () => {
    const { act } = fight('chicken', ['power_strike', 'second_wind'])
    act.energy = 100
    expect(G.readyAbility(act).id).toBe('power_strike')
    state.hp = Math.floor(G.maxHp() * 0.3)
    expect(G.readyAbility(act).id).toBe('second_wind')
    state.tactics.lowHp = false
    expect(G.readyAbility(act).id).toBe('power_strike')
  })

  it('break a healing with the hardest blow', () => {
    const { act, m } = fight('troll', ['power_strike', 'whirlwind'])
    act.energy = 100
    charge(act, m, 'regrow')
    // Whirlwind's three hits (3 × 0.7) outweigh one power strike (1.8)
    expect(G.readyAbility(act).id).toBe('whirlwind')
  })
})
