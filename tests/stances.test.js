import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, run, fixRandom } from './helpers.js'
import { COMBAT_STYLES, STYLE_TYPES, stancesOf, MONSTERS } from '../src/game/data/combat.js'
import { LOADOUT_SLOTS } from '../src/game/systems.js'
import { i18n } from '../src/i18n/index.js'

const armed = () => {
  newHero({ role: 'warrior' })
  for (const s of ['attack', 'strength', 'defense', 'hitpoints', 'ranged', 'magic']) setLevel(s, 40)
  state.hp = G.maxHp()
}
const xpOf = list => Object.fromEntries(list.map(s => [s, state.skills[s].xp]))

describe('stances', () => {
  it('give every kind of fight several stances, each with its texts and an XP share that adds up', () => {
    for (const type of STYLE_TYPES) expect(stancesOf(type).length).toBeGreaterThanOrEqual(4)
    for (const [id, st] of Object.entries(COMBAT_STYLES)) {
      expect(i18n.global.te(`styles.${id}.name`, 'en'), id).toBe(true)
      expect(i18n.global.te(`styles.${id}.desc`, 'en'), id).toBe(true)
      expect(Object.values(st.xp).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    }
  })

  it('remember the last stance of each kind of fight', () => {
    armed()
    G.setStance('berserk')
    G.setStyleType('ranged')
    expect(state.combatStyle).toBe('ranged')
    G.setStance('rapid')
    G.setStyleType('melee')
    expect(state.combatStyle).toBe('berserk')
    G.setStyleType('ranged')
    expect(state.combatStyle).toBe('rapid')
    // An unknown stance from an old save falls back to Accurate
    state.combatStyle = 'nonsense'
    expect(G.stance()).toBe(COMBAT_STYLES.attack)
  })

  it('trade damage, speed and defence', () => {
    armed()
    const m = MONSTERS.cow
    const of = id => G.withStance(id, () => ({ ...G.playerStats(m), speed: G.attackSpeed(), crit: G.critChance() }))
    const accurate = of('attack'), berserk = of('berserk')
    expect(berserk.maxHit).toBeGreaterThan(accurate.maxHit)
    expect(berserk.defRoll).toBeLessThan(accurate.defRoll)
    expect(of('rapid').speed).toBeLessThan(of('ranged').speed)
    expect(of('aimed').crit).toBeGreaterThan(of('ranged').crit)
    expect(of('overcharge').maxHit).toBeGreaterThanOrEqual(of('magic').maxHit)
    expect(state.combatStyle).toBe('attack')
  })

  it('share the XP between the skills they train', () => {
    armed()
    G.setStance('controlled')
    let before = xpOf(['attack', 'strength', 'defense'])
    G.styleXp(30)
    const gained = Object.fromEntries(Object.entries(before).map(([k, v]) => [k, state.skills[k].xp - v]))
    expect(gained.attack).toBeGreaterThan(0)
    expect(gained.attack).toBeCloseTo(gained.strength)
    expect(gained.attack).toBeCloseTo(gained.defense)
    G.setStance('warding')
    before = xpOf(['magic', 'defense'])
    G.styleXp(30)
    expect(state.skills.magic.xp).toBeGreaterThan(before.magic)
    expect(state.skills.defense.xp).toBeGreaterThan(before.defense)
  })
})

describe('tactics', () => {
  it('retreat from a fight before falling when the food is gone', () => {
    armed()
    state.food = null
    state.gold = 1000
    state.tactics.retreat = true
    state.tactics.retreatPct = 50
    const deaths = state.stats.deaths
    G.startCombat('area', 'cow')
    state.hp = 2
    fixRandom(0.5)
    run(10, 0.1)
    expect(state.activity).toBe(null)
    expect(state.stats.deaths).toBe(deaths)
    expect(state.stats.retreats).toBe(1)
    expect(state.gold).toBe(1000)
  })

  it('stop the hunt when the slayer task is done', () => {
    armed()
    state.tactics.stopOnTask = true
    state.slayer.task = { monster: 'chicken', total: 1, left: 1, kind: 'easy' }
    fixRandom(0)
    G.startCombat('area', 'chicken')
    run(30, 0.1)
    expect(state.slayer.task).toBe(null)
    expect(state.activity).toBe(null)
  })
})

describe('loadouts', () => {
  it('keep five slots, also for older saves with three', () => {
    newHero()
    expect(state.loadouts).toHaveLength(LOADOUT_SLOTS)
    G.saveLoadout(0, 'Old')
    state.loadouts.length = 3
    G.save()
    expect(G.loadSlot(0)).toBe(true)
    expect(state.loadouts).toHaveLength(LOADOUT_SLOTS)
    expect(state.loadouts[0].name).toBe('Old')
  })

  it('save the stance and its ability bar', () => {
    armed()
    G.setStance('berserk')
    const bar = G.abilityBar()
    bar.splice(0, Infinity)
    const first = G.abilitiesFor().find(a => G.abilityUnlocked(a))
    G.toggleAbility(first.id)
    G.saveLoadout(0, 'Brawler')
    G.setStance('defense')
    G.toggleAbility(first.id)
    expect(G.abilityBar()).toEqual([])
    G.applyLoadout(0)
    expect(state.combatStyle).toBe('berserk')
    expect(state.stances.melee).toBe('berserk')
    expect(G.abilityBar()).toEqual([first.id])
  })
})
