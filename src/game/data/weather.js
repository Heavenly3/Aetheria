import { named } from '../../i18n/bind.js'
import { seeded } from '../systems.js'

/*
  Weather. It changes every few hours and is the same for every player at the same time (seeded by
  the hour block), so there is nothing to store. Seasons follow the real calendar (northern
  hemisphere), and each season favours its own weather. Climate events are rarer, stronger weathers.
  For now weather is atmosphere only: `mods` is empty and nothing in the game reads it yet.
*/
export const BLOCK_HOURS = 3
const BLOCK_MS = BLOCK_HOURS * 3600e3

export const SEASONS = ['spring', 'summer', 'autumn', 'winter']
export const seasonOf = (d = new Date()) => SEASONS[Math.floor(((d.getMonth() + 10) % 12) / 3)] // Mar–May spring, Jun–Aug summer…
export const isNight = (d = new Date()) => d.getHours() >= 21 || d.getHours() < 6

// weights per season; `pi` is a PrimeIcons icon when no game icon fits
const weather = (id, look, weights, extra = {}) =>
  named({ id, ...look, weights, event: false, mods: {}, ...extra }, `weather.${id}.name`, `weather.${id}.desc`)

export const WEATHERS = [
  weather('clear', { icon: 'sun', tint: '#f2c94c' }, { spring: 30, summer: 45, autumn: 24, winter: 24 }),
  weather('cloudy', { pi: 'pi pi-cloud', tint: '#9aa3b5' }, { spring: 24, summer: 14, autumn: 24, winter: 20 }),
  weather('rain', { icon: 'droplets', tint: '#4f9dff' }, { spring: 24, summer: 10, autumn: 26, winter: 8 }),
  weather('fog', { pi: 'pi pi-eye-slash', tint: '#b8c0cc' }, { spring: 8, summer: 2, autumn: 14, winter: 12 }),
  weather('wind', { icon: 'tornado', tint: '#9fd8c8' }, { spring: 10, summer: 8, autumn: 12, winter: 9 }),
  weather('snow', { icon: 'ice-spell-cast', tint: '#dbeeff' }, { spring: 2, summer: 0, autumn: 2, winter: 24 }),
  // Climate events
  weather('storm', { pi: 'pi pi-bolt', tint: '#b38cff' }, { spring: 4, summer: 6, autumn: 5, winter: 1 }, { event: true }),
  weather('heatwave', { icon: 'fire', tint: '#ff8c42' }, { spring: 1, summer: 6, autumn: 0, winter: 0 }, { event: true }),
  weather('blizzard', { icon: 'ice-spell-cast', tint: '#8fd0f2' }, { spring: 0, summer: 0, autumn: 1, winter: 5 }, { event: true }),
]
export const WEATHER_MAP = Object.fromEntries(WEATHERS.map(w => [w.id, w]))

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
// What comes next, so a climate event can be announced
export const nextWeather = (t = Date.now()) => weatherAt((blockOf(t) + 1) * BLOCK_MS)
