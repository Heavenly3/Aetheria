import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { G, state, newHero, fixRandom } from './helpers.js'
import { PET_MAP } from '../src/game/data/pets.js'
import {
  HATCH_MS, HUNGER_MS, START_FULL, FULL_MAX, BASKET_MAX, GIFTS_AT, MAX_LEVEL, PAT_COOLDOWN, xpToNext, feedValue, giftEveryMs, rollGift,
} from '../src/game/data/companions.js'
import { itemCategory } from '../src/game/data/categories.js'

const T0 = new Date('2026-10-06T12:00:00Z').getTime()
const at = ms => vi.setSystemTime(T0 + ms)
const adopt = id => { G.awardPet(PET_MAP[id]); return G.careOf(id) }

describe('raising pets', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at(0)
    newHero()
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('hatch eggs only once they are warm, and the first pet becomes the companion', () => {
    fixRandom(0)
    G.rollMonsterPet('goblin_king')
    vi.restoreAllMocks()
    expect(G.hatchEgg(0)).toBe(null)
    at(HATCH_MS - 1000)
    expect(G.readyEggs()).toBe(0)
    at(HATCH_MS)
    expect(G.readyEggs()).toBe(1)
    expect(G.hatchEgg(0).id).toBe('goblin_whelp')
    expect(G.hasPet('goblin_whelp')).toBe(true)
    expect(state.companions.eggs).toHaveLength(0)
    expect(G.companion().id).toBe('goblin_whelp')
  })

  it('only the companion gets hungry, and the clock keeps running', () => {
    adopt('beaver')
    adopt('heron')
    expect(G.isCompanion('beaver')).toBe(true)
    at(HUNGER_MS / 2)
    expect(G.fullness('beaver')).toBeCloseTo(START_FULL - FULL_MAX / 2)
    expect(G.fullness('heron')).toBe(START_FULL)
    at(HUNGER_MS)
    expect(G.fullness('beaver')).toBe(0)
    expect(G.hungerState('beaver')).toBe('starving')
    // Swapping companions freezes the old one where it was
    G.setCompanion('heron')
    at(HUNGER_MS * 2)
    expect(G.fullness('beaver')).toBe(0)
    expect(G.fullness('heron')).toBe(0)
  })

  it('eat their favourite food or cooked food, nothing else', () => {
    expect(itemCategory('copper_ore')).toBe('ores')
    expect(feedValue('rock_golem', 'copper_ore').fav).toBe(true)
    expect(feedValue('rock_golem', 'shark').fav).toBe(false)
    expect(feedValue('rock_golem', 'oak_logs')).toBe(null)
    const c = adopt('rock_golem')
    G.addItem('copper_ore', 3)
    G.addItem('oak_logs', 3)
    // Favourite food first; the starting cooked food is fine too, logs are not
    expect(G.foodsFor('rock_golem')[0]).toBe('copper_ore')
    expect(G.foodsFor('rock_golem')).not.toContain('oak_logs')
    expect(G.feedPet('rock_golem', 'oak_logs')).toBe(null)
    const v = G.feedPet('rock_golem', 'copper_ore')
    expect(c.full).toBe(START_FULL + v.full)
    expect(c.bond).toBe(v.bond)
    expect(c.xp).toBe(v.xp)
    expect(G.qty('copper_ore')).toBe(2)
    // A full pet refuses more
    G.feedPet('rock_golem', 'copper_ore')
    expect(G.canFeed('rock_golem')).toBe(false)
    expect(G.feedPet('rock_golem', 'copper_ore')).toBe(null)
    expect(G.qty('copper_ore')).toBe(1)
  })

  it('a fed companion doubles its bonus; a starving one does not', () => {
    const base = G.mod('gold')
    adopt('goblin_whelp')
    expect(G.mod('gold')).toBeCloseTo(base + 0.03 * 2)
    at(HUNGER_MS)
    expect(G.mod('gold')).toBeCloseTo(base + 0.03)
    G.setCompanion(null)
    expect(G.mod('gold')).toBeCloseTo(base + 0.03)
  })

  it('learn from the skill XP you earn while fed, and level up', () => {
    const c = adopt('beaver')
    G.addXp('woodcutting', 10000, false)
    expect(c.lvl).toBeGreaterThan(1)
    const before = c.lvl
    at(HUNGER_MS)
    G.addXp('woodcutting', 10000, false)
    expect(c.lvl).toBe(before)
    G.addPetXp('beaver', 1e9)
    expect(c.lvl).toBe(MAX_LEVEL)
    expect(G.maxPetLevel()).toBe(MAX_LEVEL)
    expect(xpToNext(2)).toBeGreaterThan(xpToNext(1))
  })

  it('can be petted once an hour and renamed', () => {
    const c = adopt('fox')
    expect(G.patPet('fox')).toBe(true)
    expect(G.patPet('fox')).toBe(false)
    at(PAT_COOLDOWN)
    expect(G.patPet('fox')).toBe(true)
    expect(c.bond).toBe(4)
    G.renamePet('fox', '   Sir   Whiskers the Very Long Named   ')
    expect(G.petName('fox')).toBe('Sir Whiskers the Ver')
    G.renamePet('fox', '')
    expect(G.petName('fox')).toBe(PET_MAP.fox.name)
  })

  it('bring gifts once friendly, while fed, up to a full basket', () => {
    const c = adopt('rock_golem')
    G.processGifts()
    at(giftEveryMs(0) * 3)
    G.processGifts()
    expect(state.companions.basket).toHaveLength(0)
    G.addBond('rock_golem', GIFTS_AT)
    G.setCompanion('rock_golem')
    c.full = FULL_MAX
    const every = giftEveryMs(c.bond)
    at(giftEveryMs(0) * 3 + every * 2.5)
    G.processGifts()
    expect(state.companions.basket).toHaveLength(2)
    expect(state.companions.basket.every(g => itemCategory(g.item) === 'ores' && g.n > 0)).toBe(true)
    // Far in the future: it starved long ago, so only the fed hours count, never above the cap
    at(giftEveryMs(0) * 3 + HUNGER_MS * 10)
    G.processGifts()
    expect(state.companions.basket.length).toBeLessThanOrEqual(BASKET_MAX)
    const got = G.collectGifts()
    expect(got.length).toBeGreaterThan(0)
    expect(state.companions.basket).toHaveLength(0)
    expect(got.every(g => G.qty(g.item) >= g.n)).toBe(true)
  })

  it('gifts get better with level', () => {
    const low = rollGift('rock_golem', 1, 40, () => 0.999)
    const high = rollGift('rock_golem', MAX_LEVEL, 40, () => 0.999)
    expect(low && high).toBeTruthy()
    expect(high.item).not.toBe(low.item)
  })

  it('old saves give every owned pet a care record and keep it through a reload', () => {
    state.pets.beaver = 1
    state.companions.care = {}
    G.migrateState()
    expect(G.careOf('beaver').lvl).toBe(1)
    G.renamePet('beaver', 'Chip')
    G.setCompanion('beaver')
    const save = JSON.parse(JSON.stringify(state))
    newHero()
    G.loadSave(save)
    expect(G.petName('beaver')).toBe('Chip')
    expect(G.companion().id).toBe('beaver')
  })
})
