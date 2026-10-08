import { RARITIES, QUALITY, RELICS } from './omens.js'

/*
  The relic forge: reforge a relic's quality, fuse three into a better one, or reshape its kind.
  - Reforging rolls a new quality with the same weights relics drop with, so it can go down;
    a seal (a starlight shard) keeps the roll at the current quality or better.
  - Forge heat: every reforge that does not go up adds heat, which favours better qualities on the
    next roll. Going up cools the forge again.
  - Fusing three relics of one quality always gives one of the next quality, of the kind you choose.
*/
export const SEAL_ITEM = 'starlight_shard'
export const HEAT_MAX = 6
export const HEAT_BONUS = 0.35   // each point of heat makes better qualities 35% more likely
export const FUSE_COUNT = 3

export const REFORGE_COST = {
  common: { gold: 2000, dust: 30 },
  rare: { gold: 6000, dust: 60 },
  epic: { gold: 20000, dust: 120 },
  legendary: { gold: 60000, dust: 250 },
}
export const FUSE_COST = {
  common: { gold: 1500, dust: 20 },
  rare: { gold: 5000, dust: 50 },
  epic: { gold: 15000, dust: 120 },
  legendary: { gold: 50000, dust: 300 },
}
export const RESHAPE_COST = {
  common: { gold: 1000, dust: 15 },
  rare: { gold: 3000, dust: 30 },
  epic: { gold: 10000, dust: 60 },
  legendary: { gold: 30000, dust: 120 },
  mythic: { gold: 90000, dust: 300 },
}

export const RELIC_BASES = RELICS.map(r => r.id)
export const relicId = (base, quality) => `${base}_${quality}`
export const nextQuality = q => RARITIES[RARITIES.indexOf(q) + 1] || null
export const qualityRank = q => RARITIES.indexOf(q)

// Chance of each quality on a reforge, given the current quality, the heat and the seal
export function reforgeOdds(quality, heat = 0, sealed = false) {
  const cur = qualityRank(quality)
  const pool = sealed ? RARITIES.slice(cur) : RARITIES
  const weights = pool.map(q => QUALITY[q].weight * (qualityRank(q) > cur ? 1 + HEAT_BONUS * heat : 1))
  const sum = weights.reduce((a, b) => a + b, 0)
  return Object.fromEntries(pool.map((q, i) => [q, weights[i] / sum]))
}
export function rollOdds(odds, rng = Math.random) {
  let r = rng()
  const entries = Object.entries(odds)
  for (const [q, p] of entries) if ((r -= p) < 0) return q
  return entries[entries.length - 1][0]
}
