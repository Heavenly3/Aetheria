import { describe, it, expect, afterEach, vi } from 'vitest'
import { G, state, newHero, fixRandom } from './helpers.js'
import { CHAPTERS } from '../src/game/data/journal.js'
import { GUESTS } from '../src/game/data/bar.js'
import { PAGES, PAGE_IDS } from '../src/game/data/codex.js'
import { ACHIEVEMENTS } from '../src/game/data/progression.js'
import { TRACK } from '../src/game/data/festivals.js'

const at = (y, m, d) => { vi.useFakeTimers(); vi.setSystemTime(new Date(y, m - 1, d, 12)); newHero() }
afterEach(() => vi.useRealTimers())

function joinFirst() {
  const g = G.guildList().find(x => G.guildStatus(x) === 'open')
  G.applyGuild(g.id)
  const tr = state.guilds.trial
  tr.solved = true
  tr.task.target = 0
  if (tr.task.type === 'deliver') G.addItem(tr.task.item, 1)
  G.finishTrial()
  return g
}

describe('festival tales', () => {
  it('tells three tales per festival, unlocked by its own points', () => {
    const fest = CHAPTERS.filter(c => c.act === 'festivals')
    expect(fest).toHaveLength(12)
    at(2027, 3, 25)
    G.addFestivalPoints(5000)
    G.checkJournal(true)
    expect(['fest_spring_1', 'fest_spring_2', 'fest_spring_3'].every(id => G.chapterUnlocked(id))).toBe(true)
    expect(G.chapterUnlocked('fest_winter_1')).toBe(false)
  })
})

describe('festival contracts', () => {
  it('only show up while a festival runs', () => {
    at(2027, 3, 25)
    state.gold = 5000
    joinFirst()
    let seen = false
    // Several periods, since the asks are rolled
    for (let p = 0; p < 20 && !seen; p++) {
      state.guilds.period = -1
      state.guilds.contracts = []
      seen = G.ensureContracts(Date.now() + p * 864e5).some(c => c.type === 'fest')
    }
    expect(seen).toBe(true)
    vi.setSystemTime(new Date(2027, 7, 20, 12))
    for (let p = 0; p < 20; p++) {
      state.guilds.period = -1
      state.guilds.contracts = []
      expect(G.ensureContracts(Date.now() + p * 864e5).some(c => c.type === 'fest')).toBe(false)
    }
  })
})

describe('seasonal guests', () => {
  it('drop in only during their festival and pay tokens', () => {
    at(2026, 12, 20)
    fixRandom(0)
    const p = G.makePatron()
    expect(GUESTS.find(g => g.id === p.guest).festival ?? 'winter').toBe('winter')
    const frost = GUESTS.find(g => g.id === 'frost_pilgrim')
    state.tavern.patrons = [{ id: 'g', at: Date.now(), until: Date.now() + 1e6, name: null, guest: frost.id, item: 'shrimp', qty: 2, tip: 0.1 }]
    G.addItem('shrimp', 2)
    const tokens = G.festivalState().tokens
    expect(G.serve('g')).toBeTruthy()
    expect(G.festivalState().tokens - tokens).toBeGreaterThanOrEqual(frost.festTokens)
  })

  it('stay away out of season', () => {
    at(2027, 8, 20)
    for (let i = 0; i < 50; i++) {
      fixRandom(i / 50)
      const p = G.makePatron()
      if (p?.guest) expect(GUESTS.find(g => g.id === p.guest).festival).toBeFalsy()
    }
  })
})

describe('festival keepsakes and achievements', () => {
  it('have a compendium page of their own', () => {
    expect(PAGE_IDS).toContain('festival')
    expect(PAGES.festival).toContain('festive_hat')
    expect(PAGES.festival).toContain('raw_sunfish')
  })

  it('count a completed track', () => {
    at(2027, 3, 25)
    G.addFestivalPoints(1e6)
    TRACK.forEach((_, i) => G.claimTrack(i))
    expect(state.stats.festTracks).toBe(1)
    expect(ACHIEVEMENTS.find(a => a.id === 'festTrack_1').check(G)).toBe(true)
  })
})
