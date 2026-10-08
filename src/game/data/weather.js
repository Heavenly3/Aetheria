import { named } from '../../i18n/bind.js'
import { seeded } from '../systems.js'

/*
  Weather. It changes every few hours and is the same for every player at the same time (seeded by
  the hour block), so there is nothing to store. Seasons follow the real calendar (northern
  hemisphere), and each season favours its own weather. Climate events are rarer, stronger weathers.
  Weather changes how the realm plays: every weather, season and the night carry modifiers (same keys
  as everything else that feeds G.mod), and climate events can make monsters stronger. Each one has
  upsides and downsides, so it pays to switch activities with the sky.
*/
export const BLOCK_HOURS = 3
const BLOCK_MS = BLOCK_HOURS * 3600e3

export const SEASONS = ['spring', 'summer', 'autumn', 'winter']
export const seasonOf = (d = new Date()) => SEASONS[Math.floor(((d.getMonth() + 10) % 12) / 3)] // Mar–May spring, Jun–Aug summer…
export const isNight = (d = new Date()) => d.getHours() >= 21 || d.getHours() < 6

// weights per season; `pi` is a PrimeIcons icon when no game icon fits; `monster` scales monster stats
const weather = (id, look, weights, mods, extra = {}) =>
  named({ id, ...look, weights, event: false, mods, monster: 1, ...extra }, `weather.${id}.name`, `weather.${id}.desc`)

export const WEATHERS = [
  weather('clear', { icon: 'sun', tint: '#f2c94c' }, { spring: 30, summer: 45, autumn: 24, winter: 24 },
    { 'speed.gathering': 0.1, farmSpeed: 0.15, 'xp.agility': 0.2, rangedAcc: 0.08 }),
  weather('cloudy', { pi: 'pi pi-cloud', tint: '#9aa3b5' }, { spring: 24, summer: 14, autumn: 24, winter: 20 },
    { 'speed.artisan': 0.1, preserve: 0.05, defense: 0.05, 'xp.crafting': 0.15 }),
  weather('rain', { icon: 'droplets', tint: '#4f9dff' }, { spring: 24, summer: 10, autumn: 26, winter: 8 },
    { 'speed.fishing': 0.3, 'xp.fishing': 0.2, farmSpeed: 0.35, farmYield: 1, 'xp.herblore': 0.15, 'speed.firemaking': -0.25, rangedAcc: -0.1 }),
  weather('fog', { pi: 'pi pi-eye-slash', tint: '#b8c0cc' }, { spring: 8, summer: 2, autumn: 14, winter: 12 },
    { thieving: 0.3, 'xp.thieving': 0.25, petChance: 0.25, loot: 0.08, meleeAcc: 0.06, rangedAcc: -0.18, magicAcc: -0.06 }),
  weather('wind', { icon: 'tornado', tint: '#9fd8c8' }, { spring: 10, summer: 8, autumn: 12, winter: 9 },
    { 'speed.woodcutting': 0.25, 'speed.agility': 0.25, 'xp.fletching': 0.2, rangedDmg: 0.12, rangedAcc: -0.1, 'speed.fishing': -0.15 }),
  weather('snow', { icon: 'ice-spell-cast', tint: '#dbeeff' }, { spring: 2, summer: 0, autumn: 2, winter: 24 },
    { 'speed.cooking': 0.25, heal: 0.2, defense: 0.08, 'speed.mining': 0.1, farmSpeed: -0.4, 'speed.fishing': -0.15 }),
  // Climate events: big swings both ways
  weather('storm', { pi: 'pi pi-bolt', tint: '#b38cff' }, { spring: 4, summer: 6, autumn: 5, winter: 1 },
    { magicDmg: 0.3, magicAcc: 0.12, 'xp.runecrafting': 0.4, 'xp.magic': 0.25, loot: 0.25, farmSpeed: 0.25, 'speed.gathering': -0.2, rangedAcc: -0.15 },
    { event: true, monster: 1.2 }),
  weather('heatwave', { icon: 'fire', tint: '#ff8c42' }, { spring: 1, summer: 6, autumn: 0, winter: 0 },
    { 'speed.smithing': 0.35, 'xp.smithing': 0.25, 'speed.firemaking': 0.4, 'speed.cooking': 0.3, meleeDmg: 0.12, heal: -0.2, farmSpeed: -0.35, 'speed.agility': -0.2 },
    { event: true, monster: 1.1 }),
  weather('blizzard', { icon: 'ice-spell-cast', tint: '#8fd0f2' }, { spring: 0, summer: 0, autumn: 1, winter: 5 },
    { xp: 0.15, gold: 0.3, defense: 0.2, meleeDmg: 0.15, 'speed.gathering': -0.3, farmSpeed: -0.6, rangedAcc: -0.2 },
    { event: true, monster: 1.15 }),
]
export const WEATHER_MAP = Object.fromEntries(WEATHERS.map(w => [w.id, w]))

// Seasons and the night add their own touch on top of the weather
export const SEASON_MODS = {
  spring: { farmSpeed: 0.15, petChance: 0.1, 'xp.herblore': 0.1 },
  summer: { 'speed.fishing': 0.1, 'xp.agility': 0.1, 'speed.firemaking': 0.1 },
  autumn: { farmYield: 1, 'speed.woodcutting': 0.1, gold: 0.05 },
  winter: { heal: 0.1, 'speed.mining': 0.1, 'xp.cooking': 0.1 },
}
export const NIGHT_MODS = { thieving: 0.15, magicAcc: 0.06, 'xp.runecrafting': 0.1, 'speed.gathering': -0.05 }

const blockOf = t => Math.floor(t / BLOCK_MS)
function rollFor(block, season) {
  const rng = seeded(`weather-${block}`)
  const pool = WEATHERS.filter(w => w.weights[season] > 0)
  let r = rng() * pool.reduce((s, w) => s + w.weights[season], 0)
  for (const w of pool) if ((r -= w.weights[season]) < 0) return w
  return pool[pool.length - 1]
}

// The weather at a moment: which one, the season, whether it is night and when it changes
export function weatherAt(t = Date.now()) {
  const d = new Date(t), block = blockOf(t), season = seasonOf(d)
  return { weather: rollFor(block, season), season, night: isNight(d), block, endsAt: (block + 1) * BLOCK_MS }
}
// Every modifier the sky gives right now, split by where it comes from
export function skyMods(w = weatherAt()) {
  const parts = [{ from: 'weather', mods: w.weather.mods }, { from: 'season', mods: SEASON_MODS[w.season] }]
  if (w.night) parts.push({ from: 'night', mods: NIGHT_MODS })
  return parts
}
// The same, summed per key
export function skyTotals(w = weatherAt()) {
  const out = {}
  for (const p of skyMods(w)) for (const k in p.mods) out[k] = (out[k] || 0) + p.mods[k]
  return out
}
// What comes next, so a climate event can be announced
export const nextWeather = (t = Date.now()) => weatherAt((blockOf(t) + 1) * BLOCK_MS)
