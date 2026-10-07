import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { G, state, newHero, setLevel, run, fixRandom } from './helpers.js'
import { WEEKLY_BOSSES, WEEKLY_MAP, MILESTONES, MECHANICS, RESIST_MULT, bossForWeek, weekIndex, weeklyStats } from '../src/game/data/weekly.js'
import { ITEMS } from '../src/game/data/items.js'

const MONDAY = new Date(2026, 9, 5, 12).getTime() // Monday 5 October 2026
const fighter = (lvl = 80) => {
  ;['attack', 'strength', 'defense', 'hitpoints'].forEach(s => setLevel(s, lvl))
  ;['rune_sword', 'rune_body', 'rune_legs', 'rune_helm', 'rune_shield'].forEach(id => { G.addItem(id, 1); G.equip(id) })
  state.combatStyle = 'strength'
  G.addItem('shark', 200)
  state.food = 'shark'
  state.hp = G.maxHp()
}
// Pin the week's boss for a test
const meet = id => { G.ensureWeekly(); state.weekly.boss = id }

describe('weekly rotation', () => {
  it('meets every boss once per cycle and never the same one two weeks running', () => {
    const n = WEEKLY_BOSSES.length
    for (let c = 0; c < 20; c++) {
      const ids = new Set(Array.from({ length: n }, (_, i) => bossForWeek(c * n + i).id))
      expect(ids.size).toBe(n)
    }
    for (let w = 1; w < 300; w++) expect(bossForWeek(w).id).not.toBe(bossForWeek(w - 1).id)
    expect(bossForWeek(42).id).toBe(bossForWeek(42).id)
  })

  it('counts weeks from Monday to Sunday', () => {
    const mon = weekIndex(new Date(2026, 9, 5)), sun = weekIndex(new Date(2026, 9, 11, 23)), next = weekIndex(new Date(2026, 9, 12))
    expect(sun).toBe(mon)
    expect(next).toBe(mon + 1)
  })
})

describe('the weekly boss', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(MONDAY)
    newHero()
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('is locked below the required combat level', () => {
    G.startCombat('weekly', 'weekly')
    expect(state.activity).toBe(null)
    expect(G.canWeekly()).toBe(false)
  })

  it('keeps its wounds between attempts, ends attempts by enraging and costs no gold', () => {
    fighter()
    meet('colossus')
    state.combatStyle = 'strength'
    state.gold = 1000
    G.startCombat('weekly', 'weekly')
    expect(state.activity.kind).toBe('weekly')
    const max = state.weekly.max
    expect(max).toBe(weeklyStats(state.weekly.cl).hp)
    let t = 0
    while (state.activity && t < 3600) { run(5); t += 5 }
    expect(state.activity).toBe(null)
    const after1 = state.weekly.hp
    expect(after1).toBeLessThan(max)
    expect(state.weekly.dealt).toBe(max - after1)
    expect(state.gold).toBe(1000)
    // Attempts last minutes, not hours
    expect(t).toBeGreaterThan(60)
    expect(t).toBeLessThanOrEqual(305)
    state.hp = G.maxHp()
    G.startCombat('weekly', 'weekly')
    expect(state.activity.mHp).toBe(after1)
    expect(state.weekly.attempts).toBe(2)
  })

  it('resists one style, hardens, and lets thralls soak the blows', () => {
    fighter()
    meet('colossus')
    G.startCombat('weekly', 'weekly')
    const act = state.activity
    expect(G.weeklyIncoming(act, 100, 'melee')).toBe(100 * RESIST_MULT)
    expect(G.weeklyIncoming(act, 100, 'magic')).toBe(100)
    act.hard = 1
    expect(G.weeklyIncoming(act, 100, 'magic')).toBe(100 * MECHANICS.harden.mult)
    act.hard = 0
    meet('lich_queen')
    act.thrall = 30
    expect(G.weeklyIncoming(act, 20, 'ranged')).toBe(0)
    expect(act.thrall).toBe(10)
  })

  it('the hydra regrows part of what it lost', () => {
    fighter()
    meet('hydra')
    G.startCombat('weekly', 'weekly')
    const act = state.activity
    act.mHp -= 1000
    state.weekly.hp = act.mHp
    act.recent = 1000
    act.mt = MECHANICS.regen.every
    G.weeklyTick(act, 0.01, G.getMonster(act))
    expect(act.mHp).toBe(state.weekly.max - 1000 + 1000 * MECHANICS.regen.share)
    expect(state.weekly.hp).toBe(act.mHp)
  })

  it('pays each milestone once and drops its trophy on the first kill', () => {
    fighter()
    meet('rimeheart')
    G.startCombat('weekly', 'weekly')
    expect(G.claimMilestone(0)).toBe(null)
    state.weekly.dealt = Math.ceil(state.weekly.max * 0.3)
    expect(G.claimableMilestones()).toBe(2)
    const gold = state.gold
    expect(G.claimMilestone(0).gold).toBeGreaterThan(0)
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.claimMilestone(0)).toBe(null)
    expect(G.claimMilestone(2)).toBe(null)
    // Finish it off
    state.activity.mHp = 1
    state.weekly.hp = 1
    fixRandom(0)
    run(5)
    vi.restoreAllMocks()
    expect(state.weekly.killed).toBe(true)
    expect(state.activity).toBe(null)
    expect(G.qty('rime_locket')).toBe(1)
    expect(ITEMS.rime_locket.rare).toBe(true)
    expect(state.weekly.slain.rimeheart).toBe(1)
    expect(G.canWeekly()).toBe(false)
    state.weekly.dealt = state.weekly.max
    expect(G.claimMilestone(MILESTONES.length - 1)).not.toBe(null)
  })

  it('starts over with a new boss next week', () => {
    fighter()
    G.startCombat('weekly', 'weekly')
    const first = state.weekly.boss
    state.weekly.killed = true
    vi.setSystemTime(MONDAY + 7 * 864e5)
    G.ensureWeekly()
    expect(state.activity).toBe(null)
    expect(state.weekly.boss).not.toBe(first)
    expect(state.weekly).toMatchObject({ killed: false, dealt: 0, cl: 0, attempts: 0, claimed: [] })
    expect(WEEKLY_MAP[state.weekly.boss]).toBeTruthy()
  })
})
