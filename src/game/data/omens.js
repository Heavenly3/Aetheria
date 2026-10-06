import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'
import { ITEMS } from './items.js'

/*
  Omens: rare phenomena of the world that arrive unannounced while you play.
  A cryptic sign comes first (it only hints at the rarity), then the omen itself.
  Each omen has a rarity, a duration and its own rules; several hide rewards that exist nowhere else:
  pets, relics of random quality, permanent wishes and the boons rolled when an omen ends.
*/
export const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic']
export const RARITY_TINT = { common: '#9aa3b5', rare: '#4f9dff', epic: '#b46cff', legendary: '#ffb347', mythic: '#3fe0c5' }

export const OMEN_CHANCE_PER_MIN = 1 / 30 // roughly one omen every half hour of active play
export const SIGN_TIME = 60               // seconds between the sign and the omen
export const OFFERING_COST = 200          // stardust offered to the stars to call the next omen sooner
export const OFFERING_CHANCE_PER_MIN = 0.5

const omen = (id, icon, rarity, weight, duration, extra = {}) =>
  named({ id, icon, rarity, weight, duration, mods: {}, ...extra }, `events.${id}.name`, `events.${id}.desc`)

export const OMENS = [
  // Common
  omen('stars', 'falling-star', 'common', 20, 900, { mods: { xp: 0.25 }, stardust: { action: 0.06, kill: 0.08, qty: [1, 3] }, pet: 'astral_wisp' }),
  omen('goldrush', 'gold-nuggets', 'common', 16, 600, { mods: { gold: 0.5 }, jackpot: 0.015 }),
  omen('harvest', 'droplets', 'common', 8, 900, { mods: { farmSpeed: 0.5, farmYield: 1 } }),
  omen('chest', 'locked-chest', 'common', 8, 0, { instant: true }),
  // Rare
  omen('aurora', 'magic-swirl', 'rare', 10, 900, { mods: { 'double.gathering': 0.35, mastery: 0.5 }, stardust: { action: 0.03, kill: 0, qty: [1, 2] } }),
  omen('merchant', 'hooded-figure', 'rare', 10, 900, { caravan: true }),
  omen('gilded_goblin', 'goblin-head', 'rare', 8, 120, { hunt: 'gilded_goblin' }),
  // Epic
  omen('blood_moon', 'wolf-head', 'epic', 5, 1200, { mods: { loot: 1, 'xp.slayer': 0.5 }, monsterMult: 1.3, rareMult: 3, pet: 'crimson_pup' }),
  omen('eclipse', 'black-hole-bolas', 'epic', 5, 900, { mods: { magicDmg: 0.5, magicAcc: 0.25, runeSave: 0.5, 'xp.runecrafting': 0.5, 'xp.magic': 0.25 }, pet: 'eclipse_orb' }),
  omen('rift', 'magic-portal', 'epic', 4, 1200, { hunt: 'rift_horror' }),
  // Legendary
  omen('comet', 'burning-meteor', 'legendary', 5, 600, { mods: { xp: 0.5 }, wishes: { action: 0.006, kill: 0.008 }, pet: 'comet_sprite' }),
  // Mythic
  omen('eye', 'all-seeing-eye', 'mythic', 1, 300, { mods: { xp: 1, gold: 1, loot: 1, speed: 0.25 }, gift: true }),
]
export const OMEN_MAP = Object.fromEntries(OMENS.map(o => [o.id, o]))

// Pick an omen: an offering to the stars doubles the odds of epic and rarer ones
export function rollOmen(rng = Math.random, offering = false) {
  const w = o => o.weight * (offering && RARITIES.indexOf(o.rarity) >= 2 ? 2 : 1)
  let r = rng() * OMENS.reduce((a, o) => a + w(o), 0)
  for (const o of OMENS) if ((r -= w(o)) < 0) return o
  return OMENS[0]
}

/* ---------------- Creatures that only exist during an omen ---------------- */
// Their strength follows the hero's combat level, so they are a challenge at any stage
export function omenMonster(id, cl) {
  if (id === 'gilded_goblin') return named({
    id, icon: 'goblin-head', omen: true, hp: 15 + Math.round(cl * 1.5), att: 1, def: Math.round(cl * 0.7), maxHit: 1, speed: 3,
    gold: [cl * 150, cl * 300], drops: [{ item: 'gem_chest', chance: 1, qty: [1, 2] }, { item: 'stardust', chance: 1, qty: [10, 25] }, { item: 'starlight_shard', chance: 0.25, qty: [1, 1] }],
    weak: 'melee',
  }, 'omens.creatures.gilded_goblin')
  return named({
    id, icon: 'tentacles-skull', omen: true, hp: 20 + cl * 2, att: Math.round(cl * 1.3), def: cl, maxHit: Math.max(2, Math.round(2 + cl * 0.25)), speed: 2.8,
    gold: [cl * 20, cl * 50], drops: [{ item: 'stardust', chance: 1, qty: [2, 5] }, { item: 'gem_chest', chance: 0.05, qty: [1, 1] }],
    weak: ['melee', 'ranged', 'magic'][cl % 3], relic: 0.15,
  }, 'omens.creatures.rift_horror')
}

/* ---------------- Relics: equipment of random quality ---------------- */
// Quality is rolled when a relic appears; each step multiplies its stats
export const QUALITY = {
  common:    { weight: 50, mult: 1 },
  rare:      { weight: 30, mult: 1.15 },
  epic:      { weight: 14, mult: 1.3 },
  legendary: { weight: 5,  mult: 1.45 },
  mythic:    { weight: 1,  mult: 1.6 },
}
export const RELICS = [
  { id: 'astral_charm', icon: 'floating-crystal', slot: 'amulet', value: 6000, stats: { atk: 10, str: 10, def: 6, rAtk: 10, mAtk: 10 }, req: {} },
  { id: 'veil_mantle', icon: 'cloak', slot: 'cape', value: 7000, stats: { atk: 8, str: 8, def: 8, rAtk: 8, rStr: 4, mAtk: 8, mDmg: 0.04 }, req: {} },
  { id: 'moonlit_aegis', icon: 'magic-shield', slot: 'shield', value: 9000, stats: { def: 45 }, req: { defense: 40 } },
]
const scale = (stats, m) => Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, k === 'mDmg' ? +(v * m).toFixed(3) : Math.round(v * m)]))
RELICS.forEach(r => RARITIES.forEach(q => {
  ITEMS[`${r.id}_${q}`] = {
    id: `${r.id}_${q}`, icon: r.icon, type: 'equip', slot: r.slot, value: Math.round(r.value * QUALITY[q].mult ** 3), tint: RARITY_TINT[q],
    stats: scale(r.stats, QUALITY[q].mult), req: r.req, rare: q !== 'common', relic: r.id, quality: q, hasDesc: false,
    get name() { return t('tpl.relic', { relic: t(`relics.${r.id}`), quality: t(`omens.rarity.${q}`) }) },
    get desc() { return t('relics.desc') },
  }
}))
export function rollRelic(rng = Math.random, minQuality = 'common') {
  const pool = RARITIES.slice(RARITIES.indexOf(minQuality))
  let r = rng() * pool.reduce((a, q) => a + QUALITY[q].weight, 0)
  let quality = pool[pool.length - 1]
  for (const q of pool) if ((r -= QUALITY[q].weight) < 0) { quality = q; break }
  const base = RELICS[Math.floor(rng() * RELICS.length)]
  return `${base.id}_${quality}`
}

/* ---------------- Wishes: permanent gifts of the Wishing Comet ---------------- */
export const WISH_LIMIT = 30
export const WISHES = [
  { id: 'xp', mods: { xp: 0.005 } },
  { id: 'gold', mods: { gold: 0.005 } },
  { id: 'loot', mods: { loot: 0.005 } },
  { id: 'speed', mods: { speed: 0.003 } },
  { id: 'double', mods: { double: 0.003 } },
  { id: 'mastery', mods: { mastery: 0.01 } },
  { id: 'heal', mods: { heal: 0.01 } },
  { id: 'vigour', mods: { maxHp: 1 } },
]

/* ---------------- Boons: rolled when an omen you took part in ends ---------------- */
export const BOONS = [
  { id: 'swift_wind', rarity: 'common', weight: 60, duration: 1800, mods: { speed: 0.1 } },
  { id: 'scholar', rarity: 'rare', weight: 28, duration: 1800, mods: { xp: 0.2 } },
  { id: 'fortune', rarity: 'epic', weight: 10, duration: 1200, mods: { loot: 0.5, gold: 0.25 } },
  { id: 'fools_luck', rarity: 'legendary', weight: 2, duration: 600, mods: { loot: 1, gold: 1, double: 0.25 } },
]
export function rollBoon(rng = Math.random) {
  let r = rng() * BOONS.reduce((a, b) => a + b.weight, 0)
  for (const b of BOONS) if ((r -= b.weight) < 0) return b
  return BOONS[0]
}

/* ---------------- The Veiled Caravan ---------------- */
// Three offers drawn from this pool; prices in gold or stardust
export const CARAVAN_POOL = [
  { id: 'relic', relic: true, qty: 1, stardust: 450 },
  { id: 'shard', item: 'starlight_shard', qty: 2, stardust: 180 },
  { id: 'elixir', item: 'wisdom_elixir', qty: 2, stardust: 90 },
  { id: 'chest', item: 'gem_chest', qty: 3, gold: 9000 },
  { id: 'diamond', item: 'uncut_diamond', qty: 3, gold: 6000 },
  { id: 'void', item: 'void_essence', qty: 5, stardust: 220 },
  { id: 'aether', item: 'aetherium_ore', qty: 10, gold: 15000 },
  { id: 'seeds', item: 'torstol_seed', qty: 2, stardust: 120 },
]
