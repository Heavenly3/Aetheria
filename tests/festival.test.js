import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { G, state, newHero, run } from './helpers.js'
import { FESTIVALS, festivalAt, nextFestival, windowFor, shopFor, TRACK, fairAt, upcomingFairs, MARKET } from '../src/game/data/festivals.js'
import { TITLE_MAP, EXTRA_AVATARS, titled } from '../src/game/data/cosmetics.js'
import { PETS } from '../src/game/data/pets.js'
import { FEATURES } from '../src/game/features.js'

// Festivals are switched off in the game for now; these tests cover the feature itself
beforeAll(() => { FEATURES.festivals = true })
afterAll(() => { FEATURES.festivals = false })

const day = (y, m, d) => new Date(y, m - 1, d, 12)

describe('festival calendar', () => {
  it('finds the festival running on a date, including one across new year', () => {
    expect(festivalAt(day(2026, 10, 5)).key).toBe('harvest-2026')
    expect(festivalAt(day(2026, 12, 31)).key).toBe('winter-2026')
    expect(festivalAt(day(2027, 1, 3)).key).toBe('winter-2026')
    expect(festivalAt(day(2027, 1, 10))).toBe(null)
    expect(festivalAt(day(2027, 3, 25)).festival.id).toBe('spring')
    expect(festivalAt(day(2027, 7, 1)).festival.id).toBe('summer')
    expect(festivalAt(day(2027, 2, 1))).toBe(null)
  })

  it('knows what comes next', () => {
    expect(nextFestival(day(2027, 2, 1)).key).toBe('spring-2027')
    expect(nextFestival(day(2026, 11, 20)).key).toBe('winter-2026')
    for (const f of FESTIVALS) expect(windowFor(f, day(2027, 2, 1)).end > day(2027, 2, 1)).toBe(true)
  })
})

describe('festival play', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(day(2026, 10, 5)); newHero() })
  afterEach(() => vi.useRealTimers())

  it('applies the festival bonus only while it runs', () => {
    expect(G.activeFestival().id).toBe('harvest')
    expect(G.festivalMods('farmSpeed')).toBeCloseTo(0.15)
    vi.setSystemTime(day(2027, 2, 1))
    expect(G.activeFestival()).toBe(null)
    expect(G.festivalMods('farmSpeed')).toBe(0)
  })

  it('earns tokens from actions, kills and tasks', () => {
    G.startSkill('mining', 'copper_ore')
    run(3600, 1)
    expect(G.festivalState().tokens).toBeGreaterThan(10)
    const before = G.festivalState().tokens
    G.festivalKill({ id: 'goblin_king', boss: true })
    G.festivalTask()
    expect(G.festivalState().tokens).toBe(before + 5 + 15)
  }, 30000) // an hour of play: slow when every suite runs at once

  it('sells one-off rewards once and consumables again', () => {
    G.addFestivalTokens(5000)
    const shop = shopFor(FESTIVALS[0])
    expect(G.buyFestival('pet')).toBe(true)
    expect(G.hasPet('mushling')).toBe(true)
    expect(G.buyFestival('pet')).toBe(false)
    expect(G.buyFestival('title')).toBe(true)
    expect(G.setTitle('harvest_moon')).toBe(true)
    expect(G.heroTitle().id).toBe('harvest_moon')
    const chest = G.qty('gem_chest')
    expect(G.buyFestival('chest')).toBe(true)
    expect(G.buyFestival('chest')).toBe(true)
    expect(G.qty('gem_chest')).toBe(chest + 2)
    expect(G.festivalState().tokens).toBe(5000 - shop.find(e => e.id === 'pet').cost - shop.find(e => e.id === 'title').cost - 2 * shop.find(e => e.id === 'chest').cost)
  })

  it('starts each festival run from zero tokens but keeps what was bought', () => {
    G.addFestivalTokens(1000)
    G.buyFestival('tint')
    vi.setSystemTime(day(2026, 12, 20))
    expect(G.festivalState().key).toBe('winter-2026')
    expect(G.festivalState().tokens).toBe(0)
    expect(G.tintUnlocked('#d9772b')).toBe(true)
    expect(G.buyFestival('pet')).toBe(false)
  })
})

describe('cosmetics', () => {
  beforeEach(() => newHero({ name: 'Lyra' }))

  it('unlocks titles and portraits with their achievement', () => {
    expect(G.setTitle('dragonslayer')).toBe(false)
    const ghost = EXTRA_AVATARS.find(a => a.ach === 'hunted_1')
    expect(G.avatarUnlocked(ghost.id)).toBe(false)
    G.setAppearance(ghost.id)
    expect(state.avatar).not.toBe(ghost.id)
    state.achievements.boss_ancient_dragon = Date.now()
    state.achievements.hunted_1 = Date.now()
    expect(G.setTitle('dragonslayer')).toBe(true)
    G.setAppearance(ghost.id)
    expect(state.avatar).toBe(ghost.id)
  })

  it('writes titled names', () => {
    expect(titled('Lyra', TITLE_MAP.dragonslayer)).toBe('Lyra, Dragonslayer')
    expect(titled('Lyra', TITLE_MAP.many_lives)).toBe('Lyra of Many Lives')
    expect(titled('Lyra', null)).toBe('Lyra')
  })

  it('does not ask for festival pets to complete the collection', () => {
    PETS.filter(p => !p.source.festival).forEach(p => (state.pets[p.id] = 1))
    expect(G.petsComplete()).toBe(true)
  })
})

describe('festival track and ranking', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(day(2026, 10, 5)); newHero() })
  afterEach(() => vi.useRealTimers())

  it('turns every token into a point, and pays each track step once', () => {
    G.addFestivalTokens(130)
    expect(G.festivalState().points).toBe(130)
    expect(G.trackClaimable()).toBe(2)
    expect(G.claimTrack(0).tokens).toBe(TRACK[0].reward.tokens)
    expect(G.claimTrack(0)).toBe(null)
    expect(G.claimTrack(2)).toBe(null)
    G.addFestivalPoints(100)
    expect(G.claimTrack(2)).toBeTruthy()
    expect(G.qty('festive_hat')).toBe(1)
  })

  it('ranks the hero against the guilds', () => {
    const list = G.festivalRanking()
    expect(list.some(r => r.hero)).toBe(true)
    for (let i = 1; i < list.length; i++) expect(list[i - 1].points).toBeGreaterThanOrEqual(list[i].points)
    G.addFestivalPoints(1e7)
    expect(G.festivalRanking()[0].hero).toBe(true)
  })
})

describe('weekend fairs', () => {
  afterEach(() => vi.useRealTimers())
  const at = (y, m, d) => { vi.useFakeTimers(); vi.setSystemTime(day(y, m, d)); newHero() }

  it('fall on the second weekend of months without a big festival', () => {
    expect(fairAt(day(2026, 11, 14)).fair).toBe('market')
    expect(fairAt(day(2027, 2, 13)).fair).toBe('tower_rush')
    expect(fairAt(day(2027, 1, 9)).fair).toBe('derby')
    expect(fairAt(day(2027, 8, 14)).fair).toBe('omen_night')
    expect(fairAt(day(2026, 11, 20))).toBe(null)
    // October is the harvest festival's month: no fair
    expect(fairAt(day(2026, 10, 10))).toBe(null)
    expect(upcomingFairs(day(2026, 11, 1), 3)).toHaveLength(3)
  })

  it('score points by their own rule and pay three rewards', () => {
    at(2027, 1, 9)
    expect(G.activeFair()).toBe('derby')
    G.fairCatch(85)
    expect(G.fairState().points).toBe(17)
    G.addFairPoints(30)
    expect(G.claimFair(0)).toBeTruthy()
    expect(G.claimFair(0)).toBe(null)
    expect(G.claimFair(1)).toBe(null)
  })

  it('doubles tower tokens in a tower rush and sells limited stock on market day', () => {
    at(2027, 2, 13)
    expect(G.towerTokenMult()).toBe(2)
    at(2026, 11, 14)
    expect(G.towerTokenMult()).toBe(1)
    state.gold = 1e6
    const e = MARKET.find(x => x.stock === 1)
    expect(G.buyMarket(e.id)).toBe(true)
    expect(G.buyMarket(e.id)).toBe(false)
    expect(G.fairState().points).toBeGreaterThan(0)
  })
})
