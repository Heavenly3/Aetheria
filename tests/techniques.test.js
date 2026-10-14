import { describe, it, expect, vi, afterEach } from 'vitest'
import { G, state, newHero, setLevel, fixRandom } from './helpers.js'
import { findAction } from '../src/game/data/actions.js'
import { TECH_SKILLS, VEIN, FELL, MOMENTUM, MOMENTUM_COOL, BONFIRE } from '../src/game/data/techniques.js'
import { i18n } from '../src/i18n/index.js'

afterEach(() => vi.useRealTimers())
const act = (skill, id) => { state.activity = { type: 'skill', skill, action: id, progress: 0 }; G.completeAction(skill, findAction(skill, id)) }

describe('techniques', () => {
  it('have their texts', () => {
    for (const s of TECH_SKILLS) for (const k of ['name', 'desc']) expect(i18n.global.te(`techniques.${s}.${k}`, 'en'), s).toBe(true)
  })

  it('strike rich veins that bring up an extra ore', () => {
    newHero()
    fixRandom(0)
    act('mining', 'copper_ore')
    expect(state.technique.vein).toBe(VEIN.swings)
    const ore = G.qty('copper_ore')
    act('mining', 'copper_ore')
    expect(G.qty('copper_ore') - ore).toBeGreaterThanOrEqual(1 + VEIN.extra)
    expect(state.technique.vein).toBe(VEIN.swings - 1)
  })

  it('fell a tree after enough cuts', () => {
    newHero()
    fixRandom(0.99)
    for (let i = 0; i < FELL.cuts - 1; i++) act('woodcutting', 'logs')
    const logs = G.qty('logs'), xp = state.skills.woodcutting.xp
    act('woodcutting', 'logs')
    expect(G.qty('logs') - logs).toBeGreaterThanOrEqual(1 + FELL.logs)
    expect(state.skills.woodcutting.xp - xp).toBeGreaterThan(findAction('woodcutting', 'logs').xp * FELL.xp * G.xpMult('woodcutting'))
    expect(state.technique.fell.logs).toBe(0)
  })

  it('build momentum while working, and lose it after a break or a burn', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 12))
    newHero()
    G.addItem('bronze_bar', 50)
    fixRandom(0.99)
    const speed = G.speedFactor('smithing')
    for (let i = 0; i < 10; i++) act('smithing', 'bronze_sword')
    expect(G.momentumOf('smithing')).toBe(10)
    expect(G.speedFactor('smithing')).toBeCloseTo(speed + 10 * MOMENTUM.smithing.per)
    vi.setSystemTime(Date.now() + MOMENTUM_COOL + 1000)
    expect(G.momentumOf('smithing')).toBe(0)
    // Cooking: a streak lowers burning, and a burn ends it
    G.addItem('raw_shrimp', 20)
    for (let i = 0; i < 5; i++) act('cooking', 'shrimp')
    expect(G.momentumOf('cooking')).toBe(5)
    fixRandom(0)
    act('cooking', 'shrimp')
    expect(G.momentumOf('cooking')).toBe(0)
  })

  it('keep the hearth burning after the logs', () => {
    newHero()
    G.addItem('logs', 5)
    fixRandom(0.99)
    const xp = G.mod('xp')
    act('firemaking', 'burn_logs')
    expect(G.hearthLeft()).toBeGreaterThan(BONFIRE.perLog - 1000)
    expect(G.mod('xp')).toBeCloseTo(xp + BONFIRE.mods.xp)
  })

  it('make more runes when they resonate', () => {
    vi.useFakeTimers()
    // Find an hour of night in the weather's own clock
    const night = new Date(2027, 0, 1, 23)
    vi.setSystemTime(night)
    newHero()
    setLevel('runecrafting', 80)
    G.addItem('rune_essence', 10)
    fixRandom(0.99)
    expect(G.resonates('blood_rune')).toBe(true)
    act('runecrafting', 'blood_rune')
    const base = G.runeMult('runecrafting', findAction('runecrafting', 'blood_rune'))
    expect(G.qty('blood_rune')).toBeGreaterThan(base)
  })
})
