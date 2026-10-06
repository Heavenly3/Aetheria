import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { G, state, newHero, run } from './helpers.js'
import { FESTIVALS, festivalAt, nextFestival, windowFor, shopFor } from '../src/game/data/festivals.js'
import { TITLE_MAP, EXTRA_AVATARS, titled } from '../src/game/data/cosmetics.js'
import { PETS } from '../src/game/data/pets.js'

const day = (y, m, d) => new Date(y, m - 1, d, 12)

describe('festival calendar', () => {
  it('finds the festival running on a date, including one across new year', () => {
    expect(festivalAt(day(2026, 10, 5)).key).toBe('harvest-2026')
    expect(festivalAt(day(2026, 12, 31)).key).toBe('winter-2026')
    expect(festivalAt(day(2027, 1, 10)).key).toBe('winter-2026')
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
  })

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
