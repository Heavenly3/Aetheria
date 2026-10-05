import { describe, it, expect, beforeEach, vi } from 'vitest'
import { G, state, XP_TABLE, newHero, setLevel } from './helpers.js'
import { MAX_LEVEL } from '../src/game/data/skills.js'
import { HERO_XP_SHARE } from '../src/game/data/character.js'

describe('experience and levels', () => {
  beforeEach(() => newHero())

  it('maps the XP table to levels at the exact boundaries', () => {
    expect(G.levelFromXp(0)).toBe(1)
    expect(G.levelFromXp(XP_TABLE[2] - 1)).toBe(1)
    expect(G.levelFromXp(XP_TABLE[2])).toBe(2)
    expect(G.levelFromXp(XP_TABLE[50])).toBe(50)
    expect(G.levelFromXp(XP_TABLE[MAX_LEVEL] * 10)).toBe(MAX_LEVEL)
  })

  it('emits a level-up and shares XP with the hero', () => {
    const levelups = []
    const off = G.on('levelup', d => levelups.push(d))
    const heroBefore = state.hero.xp
    G.addXp('mining', XP_TABLE[10], false)
    off()
    expect(G.level('mining')).toBe(10)
    expect(levelups.at(-1)).toEqual({ skill: 'mining', level: 10 })
    expect(state.hero.xp - heroBefore).toBeCloseTo(XP_TABLE[10] * HERO_XP_SHARE)
  })

  it('applies XP multipliers only when asked to', () => {
    const plain = G.xpMult('mining')
    state.buffs.elixir = 100
    const mult = G.xpMult('mining')
    expect(mult).toBeGreaterThan(plain)
    G.addXp('mining', 100)
    expect(state.skills.mining.xp).toBeCloseTo(100 * mult)
  })

  it('caps skill XP at 200M', () => {
    G.addXp('mining', 1e12, false)
    expect(state.skills.mining.xp).toBe(200_000_000)
  })

  it('counts total and combat level', () => {
    const total = G.totalLevel()
    const before = G.level('attack')
    const combat = G.combatLevel()
    setLevel('attack', 60)
    expect(G.totalLevel()).toBe(total - before + 60)
    expect(G.combatLevel()).toBeGreaterThan(combat)
  })
})

describe('quests', () => {
  beforeEach(() => newHero())

  it('runs a hand-in quest from start to reward', () => {
    expect(G.questStatus({ id: 'first_steps', req: {} })).toBe('available')
    G.startQuest('first_steps')
    G.addItem('copper_ore', 10)
    G.addItem('tin_ore', 10)
    const gold = state.gold
    expect(G.completeQuest('first_steps')).toBe(true)
    expect(G.questDone('first_steps')).toBe(true)
    expect(G.qty('copper_ore')).toBe(0)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.qty('bronze_sword')).toBeGreaterThanOrEqual(1)
  })

  it('does not complete before the objectives are met', () => {
    G.startQuest('first_steps')
    expect(G.completeQuest('first_steps')).toBe(false)
  })

  it('counts only kills made after the quest started', () => {
    state.killsBy.goblin = 50
    G.startQuest('goblin_trouble')
    const q = { id: 'goblin_trouble', obj: [{ type: 'kill', monster: 'goblin', qty: 15 }] }
    expect(G.objProgress(q, q.obj[0]).cur).toBe(0)
    state.killsBy.goblin += 15
    expect(G.objProgress(q, q.obj[0]).cur).toBe(15)
  })
})

describe('achievements', () => {
  beforeEach(() => newHero())

  it('unlocks once and pays its gold', () => {
    for (const sk of Object.keys(state.skills)) setLevel(sk, 3)
    const gold = state.gold
    const spy = vi.fn()
    const off = G.on('achievement', spy)
    G.checkAchievements()
    G.checkAchievements()
    off()
    expect(state.achievements.total_50).toBeTruthy()
    expect(spy.mock.calls.filter(([a]) => a.id === 'total_50')).toHaveLength(1)
    expect(state.gold).toBeGreaterThan(gold)
  })
})
