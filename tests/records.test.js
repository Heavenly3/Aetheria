import { describe, it, expect, vi, afterEach } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { RECORDS } from '../src/game/records.js'
import { i18n } from '../src/i18n/index.js'

afterEach(() => vi.useRealTimers())
const DAY = 86400e3

describe('weekly records', () => {
  it('names every measure', () => {
    for (const r of RECORDS) expect(i18n.global.te(`records.names.${r.id}`, 'en')).toBe(true)
  })

  it('counts this week from a snapshot, keeps last week and announces a best week beaten once', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 4, 12)) // a Monday
    newHero()
    const seen = []
    const off = G.on('record', e => seen.push(e.id))
    state.stats.kills += 5
    G.tickRecords()
    expect(G.recordsThisWeek().kills).toBe(5)
    state.stats.kills += 5
    G.tickRecords()
    expect(seen).toEqual([]) // the first week sets the bar quietly
    expect(state.records.best.kills).toBe(10)

    vi.setSystemTime(Date.now() + 7 * DAY)
    G.tickRecords()
    expect(state.records.last.kills).toBe(10)
    expect(G.recordsThisWeek().kills).toBe(0)
    state.stats.kills += 11
    G.tickRecords()
    state.stats.kills += 3
    G.tickRecords()
    off()
    expect(seen).toEqual(['kills'])
    expect(state.records.best.kills).toBe(14)
  })

  it('keeps the highest tower floor of the week', () => {
    newHero()
    G.ensureRecords()
    G.recordFloor(12)
    G.recordFloor(8)
    expect(G.recordsThisWeek().floor).toBe(12)
  })
})
