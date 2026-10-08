import { describe, it, expect, vi } from 'vitest'
import { G, newHero } from './helpers.js'
import { WEATHERS, WEATHER_MAP, BLOCK_HOURS, SEASON_MODS, NIGHT_MODS, seasonOf, isNight, weatherAt, nextWeather, skyTotals } from '../src/game/data/weather.js'
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
    // Every weather has upsides and downsides, except calm days that only help
    expect(WEATHERS.every(w => Object.values(w.mods).some(v => v > 0))).toBe(true)
    expect(WEATHERS.filter(w => w.event).every(w => w.monster > 1 && Object.values(w.mods).some(v => v < 0))).toBe(true)
  })
})

describe('weather effects', () => {
  // A moment with the given weather, found by walking the 3-hour blocks
  const find = (id, from = at(2026, 7, 1, 13)) => {
    for (let i = 0; i < 4000; i++) { const t = from + i * BLOCK_HOURS * 3600e3; if (weatherAt(t).weather.id === id) return t }
    return null
  }
  it('add the weather, the season and the night together', () => {
    const t = find('rain')
    const w = weatherAt(t), tot = skyTotals(w)
    const exp = (WEATHER_MAP.rain.mods['speed.fishing'] || 0) + (SEASON_MODS[w.season]['speed.fishing'] || 0)
    expect(tot['speed.fishing']).toBeCloseTo(exp)
    const night = { ...w, night: true }
    expect(skyTotals(night).thieving).toBeCloseTo((tot.thieving || 0) + NIGHT_MODS.thieving)
  })

  it('reach the game through the modifiers and make storms more dangerous', () => {
    newHero()
    FEATURES.weatherEffects = true
    const t = find('storm')
    expect(t).not.toBe(null)
    vi.spyOn(Date, 'now').mockReturnValue(t)
    const base = G.diff().monster * G.omenMonsterMult()
    expect(G.monsterMult()).toBeCloseTo(base * WEATHER_MAP.storm.monster)
    expect(G.weatherMods('magicDmg')).toBeGreaterThan(0)
    expect(G.mod('magicDmg')).toBeGreaterThanOrEqual(G.weatherMods('magicDmg'))
    FEATURES.weatherEffects = false
    vi.spyOn(Date, 'now').mockReturnValue(t + 120e3) // next minute: the cache refreshes
    expect(G.weatherMods('magicDmg')).toBe(0)
    expect(G.monsterMult()).toBeCloseTo(base)
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
