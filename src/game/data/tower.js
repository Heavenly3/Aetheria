import { weekIndex } from './weekly.js'

/*
  The endless tower's twists. Every block of five floors (after the first) carries an affix that
  changes each week, the same for every player: a trait for its creatures or a change to their
  pace or blows, and a quarter more tokens for the trouble. Every tenth floor is guarded by a named
  guardian whose first defeat pays a reward. Rivals from the realm's guilds race the hero up the tower.
*/
export const TOWER_AFFIXES = {
  regen:     { icon: 'glass-heart',     trait: 'regen' },
  armoured:  { icon: 'shield',          trait: 'armour' },
  venom:     { icon: 'death-juice',     trait: 'venom' },
  vampiric:  { icon: 'vampire-dracula', trait: 'drain' },
  frenzied:  { icon: 'biceps',          trait: 'enrage' },
  elusive:   { icon: 'sprint',          trait: 'evasive' },
  swift:     { icon: 'run',             speed: 0.75 },
  brutal:    { icon: 'crossed-swords',  maxHit: 1.3 },
}
export const AFFIX_IDS = Object.keys(TOWER_AFFIXES)
export const AFFIX_TOKENS = 1.25

// The affix of a floor this week (none on floors 1–5)
export function affixOf(floor, week = weekIndex()) {
  const block = Math.floor((floor - 1) / 5)
  if (block === 0) return null
  let h = Math.imul(week + 1, 374761393) ^ Math.imul(block + 1, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = (h ^ (h >>> 16)) >>> 0
  return AFFIX_IDS[h % AFFIX_IDS.length]
}

// The guardians of the tenth floors, in turn
export const GUARDIANS = ['bellkeeper', 'stonewarden', 'emberlord', 'frostwidow', 'hollow_king', 'starbound', 'last_watcher']
export const guardianOf = floor => GUARDIANS[(Math.floor(floor / 10) - 1) % GUARDIANS.length]
// What a guardian pays the first time it falls
export const guardianReward = floor => {
  const items = { gem_chest: 1 + Math.floor(floor / 50) }
  if (floor % 50 === 0) items.starlight_shard = 1
  return { tokens: 10 * Math.floor(floor / 10), items }
}

// How high a rival from a guild has climbed: grows with their level, their guild's tier and the days gone by
export function rivalBest(member, tier, days) {
  return Math.max(1, Math.round(member.level * 0.9 + tier * 4 + Math.min(40, days * 0.6) - 10))
}
