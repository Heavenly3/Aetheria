import { describe, it, expect, vi, afterEach } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { THREAT, THREAT_EFFECT, CLEANSE, THREAT_LEVELS, threatLevel } from '../src/game/data/realm.js'
import { AREAS, MONSTERS } from '../src/game/data/combat.js'
import { i18n } from '../src/i18n/index.js'

afterEach(() => vi.useRealTimers())
const H = 3600e3

describe('a realm that reacts', () => {
  it('starts every region calm or close to it, with texts for every level', () => {
    newHero()
    G.ensureRealm()
    for (const a of AREAS) expect(G.threatOf(a.id)).toBeLessThan(THREAT_LEVELS[2].at)
    for (const l of THREAT_LEVELS) expect(i18n.global.te(`realm.levels.${l.id}.name`, 'en')).toBe(true)
  })

  it('grows threat with time, also while away, and calms down with every hunt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 12))
    newHero()
    G.ensureRealm()
    const start = G.threatOf('swamp')
    vi.setSystemTime(Date.now() + 10 * H)
    expect(G.threatOf('swamp')).toBeCloseTo(start + 10 * THREAT.rise)
    const before = G.threatOf('swamp')
    G.easeThreat('snake')
    expect(G.threatOf('swamp')).toBeCloseTo(before - THREAT.perKill)
  })

  it('makes troubled regions stronger and richer', () => {
    newHero()
    G.ensureRealm()
    const m = MONSTERS.wolf
    state.realm.regions.forest.threat = 0
    const calm = G.scaleMonster(m)
    expect(G.regionShare(m)).toBe(0)
    state.realm.regions.forest.threat = 100
    expect(G.regionShare(m)).toBe(1)
    const wild = G.scaleMonster(m)
    expect(wild.hp).toBeGreaterThan(calm.hp)
    expect(G.regionEffect(m, 'loot')).toBeCloseTo(THREAT_EFFECT.loot)
    expect(threatLevel(100).id).toBe('overrun')
  })

  it('announces an overrun region and pays a bounty for calming it', () => {
    newHero()
    G.ensureRealm()
    const seen = []
    const offs = [G.on('overrun', e => seen.push('overrun:' + e.area)), G.on('cleansed', e => seen.push('cleansed:' + e.area))]
    state.realm.regions.meadow.threat = 90
    G.tickRealm()
    expect(state.realm.regions.meadow.overrun).toBe(true)
    state.realm.regions.meadow.threat = CLEANSE.to + 0.1
    const gold = state.gold
    G.easeThreat('chicken')
    expect(state.realm.regions.meadow.overrun).toBe(false)
    expect(state.gold).toBeGreaterThan(gold)
    expect(seen).toEqual(['overrun:meadow', 'cleansed:meadow'])
    offs.forEach(off => off())
  })
})
