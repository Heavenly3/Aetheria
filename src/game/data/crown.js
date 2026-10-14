import { AREAS } from './combat.js'

/*
  The Aether Crown: the seven shards the story is about, as something the hero really holds.
  - A shard is found in this life by reaching its place in the story (`check`). Ascending loses them:
    every life the hero has to find them again.
  - Up to three shards sit in the circlet's sockets and give their lasting bonus (`mods`). The Heart is
    the shard inside the hero: once it wakes it always counts, and needs no socket.
  - Every socketed shard has a power that can be called on now and then (`power`): a bonus for a while,
    or something that happens at once.
  - With all seven and the Aether Sovereign defeated, the Crown is whole and the hero decides whom it
    goes to. Each ending leaves a bonus that is kept in every later life.
*/
const life = (g, id) => g.s.killsBy?.[id] || 0
const lifeArea = (g, area) => AREAS.find(a => a.id === area).monsters.reduce((n, m) => n + life(g, m.id), 0)
export const DEEP_KILLS = 200
const H = 3600e3, M = 60e3

export const SHARDS = [
  { id: 'forge', icon: 'anvil-impact', tint: '#ff9a3c', hint: 'forge', check: g => g.level('smithing') >= 40,
    mods: { 'speed.artisan': 0.08, quality: 0.05 }, power: { id: 'temper', time: 30 * M, cd: 8 * H, mods: { quality: 0.25, 'speed.artisan': 0.15 } } },
  { id: 'sap', icon: 'sprout', tint: '#6fbf4a', hint: 'sap', check: g => life(g, 'naga') > 0,
    mods: { farmSpeed: 0.12, 'xp.farming': 0.08 }, power: { id: 'bloom', instant: 'bloom', cd: 8 * H } },
  { id: 'sea', icon: 'fishing', tint: '#3fa8d8', hint: 'sea', check: g => life(g, 'kraken') > 0,
    mods: { 'speed.fishing': 0.08, fishLuck: 0.15 }, power: { id: 'tide', time: 30 * M, cd: 8 * H, mods: { 'speed.fishing': 0.5, fishLuck: 0.5 } } },
  { id: 'winter', icon: 'ice-spell-cast', tint: '#8fd0f2', hint: 'winter', check: g => life(g, 'winter_queen') > 0,
    mods: { defense: 0.06, reduction: 0.03 }, power: { id: 'ward', time: 20 * M, cd: 8 * H, mods: { dodge: 0.1, reduction: 0.1 } } },
  { id: 'flame', icon: 'flame', tint: '#ff6a3c', hint: 'flame', check: g => life(g, 'bronze_wyrm') > 0,
    mods: { meleeDmg: 0.05, rangedDmg: 0.05, magicDmg: 0.05 }, power: { id: 'wildfire', time: 20 * M, cd: 8 * H, mods: { meleeDmg: 0.25, rangedDmg: 0.25, magicDmg: 0.25, crit: 0.05 } } },
  { id: 'deep', icon: 'earth-crack', tint: '#b38cff', hint: 'deep', check: g => life(g, 'ancient_dragon') > 0 && lifeArea(g, 'abyss') >= DEEP_KILLS,
    mods: { xp: 0.05, loot: 0.03 }, power: { id: 'echo', time: 30 * M, cd: 8 * H, mods: { xp: 0.5 } } },
  { id: 'heart', icon: 'glass-heart', tint: '#f6dc9a', hint: 'heart', heart: true, check: g => life(g, 'void_emperor') > 0,
    mods: { xp: 0.05, gold: 0.05, speed: 0.03 }, power: { id: 'awaken', time: 30 * M, cd: 12 * H, mods: { speed: 0.2, xp: 0.2 } } },
]
export const SHARD_MAP = Object.fromEntries(SHARDS.map(s => [s.id, s]))
export const SOCKETS = 3
// Defeating the one at the top of the Spire, with the Crown whole, opens the choice
export const CHOICE_BOSS = 'aether_sovereign'

// Whom the Crown goes to, and what stays with the hero in every later life
export const ENDINGS = [
  { id: 'queen', icon: 'crowned-skull', tint: '#7ad7ff', mods: { meleeDmg: 0.08, rangedDmg: 0.08, magicDmg: 0.08 }, title: 'frost_crowned' },
  { id: 'sky', icon: 'sun', tint: '#f6dc9a', mods: { xp: 0.08 }, title: 'lightbringer' },
  { id: 'king', icon: 'crown', tint: '#c9a24a', mods: { gold: 0.08, loot: 0.05 }, title: 'kings_shield' },
]
export const ENDING_MAP = Object.fromEntries(ENDINGS.map(e => [e.id, e]))
