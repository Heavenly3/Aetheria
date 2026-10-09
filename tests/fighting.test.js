import { describe, it, expect, beforeEach, vi } from 'vitest'
import { G, state, newHero, run, fixRandom } from './helpers.js'
import { MONSTERS, BOSSES } from '../src/game/data/combat.js'
import { weaponProfile, MONSTER_TRAITS, TRAITS, STATUSES, ELITES, ELITE_LOOT, ABILITY_MAP, ENERGY, STREAK_STEP, STREAK_BONUS } from '../src/game/data/fighting.js'
import { BESTIARY } from '../src/game/data/bestiary.js'
import { i18n } from '../src/i18n/index.js'

describe('weapons', () => {
  beforeEach(() => newHero())

  it('swing at their own pace and hit harder when slow', () => {
    expect(weaponProfile('bronze_sword')).toBe(weaponProfile('rune_sword'))
    expect(weaponProfile('yew_bow').speed).toBeLessThan(weaponProfile('bronze_sword').speed)
    expect(weaponProfile('troll_hammer').speed).toBeGreaterThan(weaponProfile('bronze_sword').speed)
    expect(weaponProfile('troll_hammer').dmg).toBeGreaterThan(1)
    expect(weaponProfile(null).speed).toBeGreaterThan(0)
    state.equipment.weapon = 'bronze_sword'
    expect(G.attackSpeed()).toBe(weaponProfile('bronze_sword').speed)
  })

  it('land critical hits and leave statuses', () => {
    state.equipment.weapon = 'bronze_sword'
    fixRandom(0) // every roll succeeds: hits, crits and bleeding
    G.startCombat('area', 'cow')
    const seen = vi.fn()
    const off = G.on('hit', d => d.who === 'player' && !d.fx && seen(d.crit))
    run(3, 0.1)
    off()
    expect(seen).toHaveBeenCalledWith(true)
    expect(G.hasStatus(state.activity, 'monster', 'bleed') || state.activity.runKills > 0).toBe(true)
  })
})

describe('statuses', () => {
  beforeEach(() => newHero())

  it('deal damage over time, stack poison and run out', () => {
    G.startCombat('area', 'cow')
    const act = state.activity
    const hp = act.mHp
    G.addStatus(act, 'monster', 'bleed', 20)
    G.tickStatuses(act, 1)
    expect(act.mHp).toBe(hp - Math.round(20 * STATUSES.bleed.dot))
    act.mHp = 999
    state.hp = 999
    G.addStatus(act, 'player', 'poison', 10)
    G.addStatus(act, 'player', 'poison', 10)
    expect(act.fx.player.poison.n).toBe(2)
    G.tickStatuses(act, 30)
    expect(act.fx.player.poison).toBeUndefined()
    expect(act.fx.monster.bleed).toBeUndefined()
  })

  it('stun stops the clock and slow stretches it', () => {
    G.startCombat('area', 'cow')
    const act = state.activity
    G.addStatus(act, 'player', 'stun', 1)
    G.update(0.5)
    expect(act.pTimer).toBe(0)
    expect(G.slowOf(act, 'monster')).toBe(0)
    G.addStatus(act, 'monster', 'slow', 1)
    expect(G.slowOf(act, 'monster')).toBeGreaterThan(0)
  })
})

describe('creatures', () => {
  beforeEach(() => newHero())

  it('have known traits with texts', () => {
    const ids = new Set(BESTIARY.flatMap(g => g.monsters.map(m => m.id)))
    for (const [m, list] of Object.entries(MONSTER_TRAITS)) {
      expect(ids.has(m)).toBe(true)
      for (const t of list) {
        expect(TRAITS[t]).toBeTruthy()
        expect(i18n.global.te(`fighting.traits.${t}.name`, 'en')).toBe(true)
      }
    }
  })

  it('armour soaks damage and regeneration heals', () => {
    G.startCombat('area', 'golem')
    expect(G.traitValue(G.getMonster(state.activity), 'armour')).toBeGreaterThan(0)
    G.startCombat('area', 'troll')
    const act = state.activity, m = G.getMonster(act)
    act.mHp = 1
    vi.spyOn(G, 'attackSpeed').mockReturnValue(999)
    G.update(1)
    expect(act.mHp).toBeGreaterThan(1)
  })
})

describe('elites', () => {
  beforeEach(() => newHero())

  it('are tougher and pay much better', () => {
    fixRandom(0) // the spawn roll always brings an elite
    G.startCombat('area', 'chicken')
    const act = state.activity
    expect(act.elite).toBeTruthy()
    const m = G.getMonster(act)
    expect(m.hp).toBeGreaterThan(MONSTERS.chicken.hp)
    expect(m.elite).toBe(act.elite)
    vi.restoreAllMocks()
    const dust = G.qty('stardust')
    G.killMonster(m)
    expect(G.qty('stardust') - dust).toBeGreaterThanOrEqual(ELITE_LOOT.stardust[0])
    expect(state.stats.elites).toBe(1)
    for (const k of Object.keys(ELITES)) expect(i18n.global.te(`fighting.elites.${k}`, 'en')).toBe(true)
  })

  it('only appear in the open field', () => {
    fixRandom(0)
    state.tower.best = 0
    G.startCombat('tower')
    expect(state.activity.elite).toBe(null)
  })
})

describe('combat profile', () => {
  beforeEach(() => newHero())

  it('sums up the hero in numbers that grow with better gear', () => {
    const before = G.combatProfile()
    expect(before.dps).toBeGreaterThan(0)
    expect(before.power).toBeGreaterThan(0)
    expect(before.hitTaken).toBeGreaterThan(0)
    G.addItem('rune_sword', 1)
    const better = G.withGear('rune_sword', () => G.combatProfile())
    expect(better.maxHit).toBeGreaterThan(before.maxHit)
    expect(better.dps).toBeGreaterThan(before.dps)
    expect(better.power).toBeGreaterThan(before.power)
    // Nothing really changed
    expect(G.combatProfile().power).toBe(before.power)
    expect(state.equipment.weapon).not.toBe('rune_sword')
  })

  it('judges a weapon of another style with that style, and puts everything back', () => {
    const style = state.combatStyle
    const bow = G.withGear('magic_bow', () => ({ type: G.styleType(), shield: state.equipment.shield }))
    expect(bow).toEqual({ type: 'ranged', shield: null })
    expect(state.combatStyle).toBe(style)
    expect(state.equipment.shield).toBeTruthy()
  })

  it('tells how long a kill takes and how risky it is', () => {
    const easy = G.combatProfile(MONSTERS.chicken), hard = G.combatProfile(MONSTERS.red_dragon)
    expect(easy.killTime).toBeLessThan(hard.killTime)
    expect(easy.risk).toBeLessThan(hard.risk)
  })
})

describe('abilities', () => {
  beforeEach(() => newHero())

  it('build energy with attacks and fire on their own from the bar', () => {
    state.hp = 999
    G.startCombat('area', 'cow')
    const act = state.activity
    act.mHp = 9999
    const used = vi.fn()
    const off = G.on('ability', used)
    run(30, 0.1)
    off()
    expect(used).toHaveBeenCalled()
    expect(used.mock.calls[0][0].id).toBe('power_strike')
    expect(act.cd.power_strike ?? 0).toBeLessThanOrEqual(ABILITY_MAP.power_strike.cd)
    expect(ENERGY.attack).toBeGreaterThan(0)
  })

  it('can be chosen, reordered and switched off', () => {
    state.skills.attack.xp = 2e6
    expect(G.toggleAbility('whirlwind')).toBe(true)
    expect(G.abilityBar()).toEqual(['power_strike', 'whirlwind'])
    G.moveAbility('whirlwind', -1)
    expect(G.abilityBar()).toEqual(['whirlwind', 'power_strike'])
    expect(G.toggleAbility('aimed_shot')).toBe(false) // another style's ability
    G.toggleAbility('rending_slash')
    expect(G.toggleAbility('shield_bash')).toBe(false) // the bar is full
    state.abilities.auto = false
    G.startCombat('area', 'cow')
    state.activity.energy = 100
    expect(G.readyAbility(state.activity)).toBe(null)
  })

  it('keep healing for when it is needed, and boons wear off', () => {
    state.skills.attack.xp = 2e6
    state.abilities.bar.melee = ['second_wind', 'berserk']
    G.startCombat('area', 'cow')
    const act = state.activity
    act.energy = 100
    expect(G.readyAbility(act).id).toBe('berserk') // full health: no heal yet
    state.hp = 1
    expect(G.readyAbility(act).id).toBe('second_wind')
    state.hp = 999
    // The bar is a priority list: a cheaper ability waits while the first one charges
    state.abilities.bar.melee = ['whirlwind', 'power_strike']
    act.energy = 40
    expect(G.readyAbility(act)).toBe(null)
    act.energy = 60
    expect(G.readyAbility(act).id).toBe('whirlwind')
    act.cd = { whirlwind: 5 }
    act.energy = 30
    expect(G.readyAbility(act).id).toBe('power_strike')
    act.hb = { berserk: { t: 1 } }
    expect(G.buffValue(act, 'dmg')).toBeGreaterThan(0)
    G.tickAbilities(act, 2)
    expect(G.buffValue(act, 'dmg')).toBe(0)
  })
})

describe('boss phases', () => {
  beforeEach(() => newHero())

  it('grow fiercer at half and a quarter of their health', () => {
    const b = BOSSES.find(x => !x.reqQuest) || BOSSES[0]
    if (b.reqQuest) state.quests[b.reqQuest] = { status: 'done' }
    G.startCombat('boss', b.id)
    const act = state.activity, m = G.getMonster(act)
    const seen = vi.fn()
    const off = G.on('bossPhase', seen)
    act.mHp = Math.floor(m.hp * 0.5)
    G.checkPhase(act, m)
    expect(act.phase).toBe(1)
    expect(G.phaseOf(act).maxHit).toBeGreaterThan(1)
    act.mHp = Math.floor(m.hp * 0.2)
    G.checkPhase(act, m)
    off()
    expect(act.phase).toBe(2)
    expect(G.hasStatus(act, 'player', 'weaken')).toBe(true)
    expect(seen).toHaveBeenCalledTimes(2)
  })

  it('do not touch ordinary creatures', () => {
    G.startCombat('area', 'cow')
    const act = state.activity
    act.mHp = 1
    G.checkPhase(act, G.getMonster(act))
    expect(act.phase).toBe(0)
  })
})

describe('hunting streaks', () => {
  beforeEach(() => newHero())

  it('build up with kills, pay more XP and loot, and break on death', () => {
    const xp = G.mod('xp.attack'), loot = G.mod('loot'), mining = G.mod('xp.mining')
    for (let i = 0; i < STREAK_STEP * 2; i++) G.addStreak()
    expect(G.streakBonus()).toBeCloseTo(STREAK_BONUS * 2)
    expect(G.mod('xp.attack')).toBeCloseTo(xp + STREAK_BONUS * 2)
    expect(G.mod('loot')).toBeCloseTo(loot + STREAK_BONUS * 2)
    expect(G.mod('xp.mining')).toBeCloseTo(mining) // only combat skills
    G.startCombat('area', 'cow')
    G.die(G.getMonster(state.activity))
    expect(state.hunt.streak).toBe(0)
    expect(state.hunt.best).toBe(STREAK_STEP * 2)
  })
})

describe('live numbers', () => {
  beforeEach(() => newHero())

  it('track damage, kills and earnings per fight', () => {
    state.hp = 999
    G.startCombat('area', 'chicken')
    run(60, 0.1)
    const live = G.liveStats()
    expect(live.dps).toBeGreaterThan(0)
    expect(live.killsH).toBeGreaterThan(0)
    expect(live.xpH).toBeGreaterThan(0)
    expect(state.activity.notes.length).toBeGreaterThan(0)
  })
})
