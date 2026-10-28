import { describe, it, expect, afterEach, vi } from 'vitest'
import { G, state, newHero, fixRandom } from './helpers.js'
import { BLOOM_CROP, BLOOM_SCORE, FREE_SEEDS, BONFIRE_LEVELS, SUNFISH, GIANT, WRAITH, GIFTS, GIFT_POINTS } from '../src/game/data/festivalActs.js'
import { findAction, outputsOf } from '../src/game/data/actions.js'
import { PAGES } from '../src/game/data/codex.js'

const day = (y, m, d) => new Date(y, m - 1, d, 12)
const at = (y, m, d) => { vi.useFakeTimers(); vi.setSystemTime(day(y, m, d)); newHero() }
afterEach(() => vi.useRealTimers())

describe('spring: the flower contest', () => {
  it('hands out seeds once a day and judges every bloom', () => {
    at(2027, 3, 25)
    expect(G.claimFreeSeeds()).toBe(FREE_SEEDS)
    expect(G.claimFreeSeeds()).toBe(0)
    state.farm.plots[0] = { crop: BLOOM_CROP, t: 0, total: 100, soil: 2, rolled: true, event: 'bountiful' }
    const before = G.festivalState().points
    G.harvest(0)
    const each = (BLOOM_SCORE.base + BLOOM_SCORE.soil[2] + BLOOM_SCORE.season) * BLOOM_SCORE.bountiful
    expect(G.festivalState().points - before).toBeGreaterThanOrEqual(each)
    expect(G.festAct().bestBloom).toBe(each)
  })
})

describe('summer: bonfire and regatta', () => {
  it('levels the bonfire with logs and raises token income', () => {
    at(2027, 7, 1)
    expect(G.festTokenMult()).toBe(1)
    G.addItem('logs', BONFIRE_LEVELS[1])
    G.feedBonfire('logs')
    expect(G.bonfireLevel()).toBe(1)
    expect(G.festTokenMult()).toBeGreaterThan(1)
  })

  it('opens the regatta water only in summer, where sunfish pay points', () => {
    at(2027, 7, 1)
    const bay = findAction('fishing', 'sunlit_bay')
    expect(G.festivalOpen(bay)).toBe(true)
    const pts = G.festivalState().points
    G.festivalCatch(SUNFISH.item)
    expect(G.festivalState().points).toBeGreaterThan(pts)
    vi.setSystemTime(day(2027, 8, 20))
    expect(G.festivalOpen(bay)).toBe(false)
    G.startSkill('fishing', 'sunlit_bay')
    expect(state.activity).toBe(null)
  })
})

describe('harvest: the fair', () => {
  it('asks three things a day and pays for each once', () => {
    at(2026, 10, 5)
    const reqs = G.standRequests()
    expect(reqs).toHaveLength(3)
    expect(G.deliverStand(0)).toBe(null)
    G.addItem(reqs[0].item, reqs[0].qty)
    expect(G.deliverStand(0)).toBeGreaterThan(0)
    expect(G.deliverStand(0)).toBe(null)
    expect(G.standRequests()[0].done).toBe(true)
  })

  it('turns up giant vegetables while harvesting', () => {
    at(2026, 10, 5)
    fixRandom(0)
    state.farm.plots[0] = { crop: 'potato', t: 0, total: 100 }
    G.harvest(0)
    expect(G.qty(GIANT.item)).toBe(1)
    expect(G.deliverGiants()).toBe(1)
  })
})

describe('winter: the Frost Wraith and gifts', () => {
  it('lets the hero fight the Wraith only in winter, for points and no gold lost', () => {
    at(2026, 12, 20)
    G.startCombat('festival', WRAITH.id)
    expect(state.activity?.kind).toBe('festival')
    expect(G.getMonster(state.activity).id).toBe(WRAITH.id)
    const pts = G.festivalState().points
    G.killMonster(G.getMonster(state.activity))
    expect(G.festivalState().points).toBeGreaterThan(pts)
    state.gold = 1000
    G.die(G.getMonster(state.activity))
    expect(state.gold).toBe(1000)
    vi.setSystemTime(day(2027, 2, 1))
    G.startCombat('festival', WRAITH.id)
    expect(state.activity).toBe(null)
  })

  it('takes one liked gift a day from each friend met', () => {
    at(2026, 12, 20)
    const keeper = G.giftPeople().find(c => c.id === 'keeper')
    expect(keeper).toBeTruthy()
    const liked = GIFTS.keeper.likes[0]
    G.addItem(liked, 2)
    expect(G.giveGift('keeper', 'bones')).toBe(null)
    const pts = G.festivalState().points
    expect(G.giveGift('keeper', liked)).toEqual(GIFTS.keeper.gives)
    expect(G.festivalState().points - pts).toBeGreaterThanOrEqual(GIFT_POINTS)
    expect(G.giveGift('keeper', liked)).toBe(null)
  })
})

describe('festival things outside the festival', () => {
  it('are never asked for and stay out of the year-round compendium pages', () => {
    for (const sk of ['fishing', 'cooking']) expect(outputsOf(sk).some(o => o.item === SUNFISH.item || o.item === 'sunfish')).toBe(false)
    const all = Object.entries(PAGES).filter(([p]) => p !== 'festival').flatMap(([, l]) => l)
    for (const id of [SUNFISH.item, 'sunfish', BLOOM_CROP, BLOOM_CROP + '_seed', GIANT.item, 'festive_hat']) expect(all).not.toContain(id)
  })
})

describe('the Frost Wraith', () => {
  it('stays a little above the hero at every level', async () => {
    const { wraithStats } = await import('../src/game/data/festivalActs.js')
    const { monsterLevel } = await import('../src/game/data/combat.js')
    for (const cl of [3, 20, 60, 120]) {
      const lvl = monsterLevel(wraithStats(cl))
      expect(lvl).toBeGreaterThanOrEqual(cl)
      expect(lvl).toBeLessThanOrEqual(cl + 10)
    }
  })
})
