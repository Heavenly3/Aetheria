import { named } from '../../i18n/bind.js'
import { seeded } from '../systems.js'

/*
  The weekly boss. A different boss every week (Monday to Sunday), picked from a seeded shuffle of
  the week number, so every player meets the same one without a server.
  - Its health is a pool for the whole week: damage from every attempt adds up.
  - Each boss shrugs off one combat style, is weak to another and has one mechanic of its own.
  - Every boss grows enraged during an attempt, and an attempt lasts five minutes at most.
  - Rewards are claimed as the total damage passes each milestone; the kill drops an exclusive trophy.
*/
export const WEEKLY_MIN_CL = 30
export const RESIST_MULT = 0.5         // damage taken from the style it resists
export const ENRAGE_EVERY = 20         // seconds
export const ENRAGE_STEP = 1.1         // max hit ×1.1 per step, compounding
export const ATTEMPT_TIME = 300        // an attempt ends after five minutes even if the hero still stands
export const MILESTONES = [0.1, 0.25, 0.5, 0.75, 1]

// Mechanics; the numbers are read by the engine (weekly.js)
export const MECHANICS = {
  harden: { every: 25, lasts: 6, mult: 0.25 },     // takes 75% less damage for a few seconds
  regen:  { every: 8, share: 0.2 },                // heals 20% of the damage taken since the last regrowth
  summon: { every: 30 },                           // raises a thrall that takes the hits until it falls
  breath: { every: 20 },                           // a blast of fire that cannot be dodged
  reflect: { share: 0.15 },                        // returns 15% of the damage it takes
  frost:  { every: 25, lasts: 8, slow: 0.5 },      // freezes the hero: attacks come half as fast
}

const boss = (id, icon, tint, resist, weak, mechanic, trophy) =>
  named({ id, icon, tint, resist, weak, mechanic, trophy }, `weekly.bosses.${id}.name`, `weekly.bosses.${id}.desc`)

export const WEEKLY_BOSSES = [
  boss('colossus',  'rock-golem',  '#a08a6a', 'melee',  'magic',  'harden',  'colossus_bulwark'),
  boss('hydra',     'hydra',       '#4fbf6a', 'ranged', 'melee',  'regen',   'hydra_heart'),
  boss('lich_queen', 'crowned-skull', '#8a5cff', 'magic', 'ranged', 'summon', 'lich_shroud'),
  boss('ashen_wyrm', 'wyvern',     '#e0602a', 'magic',  'melee',  'breath',  'wyrm_crown'),
  boss('leviathan', 'sea-dragon',  '#2fa8c6', 'melee',  'ranged', 'reflect', 'abyssal_mantle'),
  boss('rimeheart', 'ice-golem',   '#8fd0f2', 'ranged', 'magic',  'frost',   'rime_locket'),
]
export const WEEKLY_MAP = Object.fromEntries(WEEKLY_BOSSES.map(b => [b.id, b]))

// Weeks are counted from Monday 1 January 2024
const EPOCH = new Date(2024, 0, 1)
export function weekIndex(d = new Date()) {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return Math.round((monday - EPOCH) / (7 * 864e5))
}
function cycleOrder(cycle) {
  const rng = seeded('weekly-' + cycle)
  const ids = WEEKLY_BOSSES.map(b => b.id)
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]] }
  return ids
}
// Every boss appears once per cycle, and never twice in a row across cycles
export function bossForWeek(w) {
  const n = WEEKLY_BOSSES.length, cycle = Math.floor(w / n)
  const order = cycleOrder(cycle)
  if (cycle > 0 && order[0] === cycleOrder(cycle - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]]
  return WEEKLY_MAP[order[w % n]]
}

// Stats follow the combat level the hero had on their first attempt of the week
export function weeklyStats(cl) {
  return {
    hp: 90 * cl + 1000, att: Math.round(cl * 1.2), def: Math.round(cl * 1.25),
    maxHit: Math.round(1 + cl * 0.15), speed: 2.6,
    thrallHp: Math.round(cl * 0.25) + 8, thrallHit: Math.max(1, Math.round((2 + cl * 0.22) * 0.4)),
  }
}

// What each milestone pays, scaled by that combat level
export function milestoneReward(i, cl) {
  return [
    { gold: cl * 300, items: { stardust: 20 } },
    { gold: cl * 600, items: { stardust: 40, gem_chest: 1 } },
    { gold: cl * 1200, items: { gem_chest: 2, starlight_shard: 1 } },
    { gold: cl * 2000, items: { gem_chest: 3, starlight_shard: 1 }, relic: 'common' },
    { gold: cl * 3000, items: { starlight_shard: 2 }, relic: 'epic' },
  ][i]
}
