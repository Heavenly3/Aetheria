import { describe, it, expect } from 'vitest'
import { G, newHero } from './helpers.js'
import { WEATHERS, BLOCK_HOURS, seasonOf, isNight, weatherAt, nextWeather } from '../src/game/data/weather.js'
import { FEATURES } from '../src/game/features.js'

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime()

describe('weather', () => {
  it('follows the seasons of the real calendar and knows when it is night', () => {
    expect(seasonOf(new Date(2026, 2, 21))).toBe('spring')
    expect(seasonOf(new Date(2026, 6, 1))).toBe('summer')
    expect(seasonOf(new Date(2026, 9, 7))).toBe('autumn')
    expect(seasonOf(new Date(2026, 0, 15))).toBe('winter')
    expect(isNight(new Date(2026, 0, 1, 23))).toBe(true)
    expect(isNight(new Date(2026, 0, 1, 12))).toBe(false)
  })

  it('is the same for everyone at the same moment and changes every few hours', () => {
    const t = at(2026, 10, 7, 13)
    expect(weatherAt(t).weather.id).toBe(weatherAt(t + 60e3).weather.id)
    expect(weatherAt(t).endsAt - weatherAt(t).block * BLOCK_HOURS * 3600e3).toBe(BLOCK_HOURS * 3600e3)
    expect(nextWeather(t).block).toBe(weatherAt(t).block + 1)
  })

  it('only brings weather that suits the season, climate events included', () => {
    const seen = { summer: new Set(), winter: new Set() }
    for (let i = 0; i < 2000; i++) {
      seen.summer.add(weatherAt(at(2026, 7, 1) + i * BLOCK_HOURS * 3600e3 % (40 * 864e5)).weather.id)
      seen.winter.add(weatherAt(at(2026, 1, 1) + i * BLOCK_HOURS * 3600e3 % (40 * 864e5)).weather.id)
    }
    expect(seen.summer.has('snow')).toBe(false)
    expect(seen.summer.has('blizzard')).toBe(false)
    expect(seen.winter.has('heatwave')).toBe(false)
    expect(seen.winter.has('snow')).toBe(true)
    expect(WEATHERS.filter(w => w.event).map(w => w.id).sort()).toEqual(['blizzard', 'heatwave', 'storm'])
    // Atmosphere only for now
    expect(WEATHERS.every(w => !Object.keys(w.mods).length)).toBe(true)
  })
})

describe('festivals switched off', () => {
  it('give no festival, bonus or tokens while the feature is off', () => {
    newHero()
    expect(FEATURES.festivals).toBe(false)
    expect(G.activeFestival()).toBe(null)
    expect(G.festivalShop()).toEqual([])
    expect(G.festivalMods('xp')).toBe(0)
  })
})
