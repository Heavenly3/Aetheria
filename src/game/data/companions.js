import { ITEMS } from './items.js'
import { itemCategory } from './categories.js'

/*
  Raising pets. A rolled pet arrives as an egg that hatches after a while; once hatched it can be
  chosen as the companion, fed, petted and levelled up.
  - Every owned pet keeps its bonus, scaled by its level (`growth`).
  - The companion's bonus is boosted while it is fed, and only the companion gets hungry.
  - Bond grows with care and unlocks gifts: the companion brings things it likes to a small basket.
*/
export const MAX_LEVEL = 20
export const xpToNext = lvl => Math.round(250 * Math.pow(1.4, lvl - 1))
export const growth = lvl => 1 + 0.05 * (lvl - 1)

export const FULL_MAX = 100
export const START_FULL = 60
export const HUNGER_MS = 12 * 3600e3      // a full companion goes hungry in 12 hours
export const SKILL_SHARE = 0.1            // the fed companion earns 10% of the skill XP you earn
export const HATCH_MS = 30 * 60e3
export const PAT_COOLDOWN = 3600e3
export const PAT_BOND = 2
export const BOND_MAX = 100
export const BOND_TIME = 2 * 3600         // seconds as a fed companion for +1 bond
export const BASKET_MAX = 6
export const NICK_MAX = 20

// Bond tiers and what each one adds
export const BOND_TIERS = [
  { id: 'wary', at: 0 },
  { id: 'curious', at: 15 },
  { id: 'friendly', at: 35 },  // brings gifts
  { id: 'loyal', at: 60 },     // bigger gifts
  { id: 'devoted', at: 85 },   // stronger companion boost
  { id: 'soulbound', at: 100 },// half again its bonus while resting
]
export const CURIOUS_AT = 15
export const GIFTS_AT = 35
export const LOYAL_AT = 60
export const DEVOTED_AT = 85
export const bondTier = bond => [...BOND_TIERS].reverse().find(b => bond >= b.at)
export const companionBoost = bond => (bond >= DEVOTED_AT ? 2.5 : 2)
export const restMult = bond => (bond >= BOND_MAX ? 1.5 : 1)
export const giftEveryMs = bond => (45 - bond * 0.3) * 60e3

// What each pet loves to eat (an inventory category); cooked food is fine for every pet
export const DIETS = {
  rock_golem: 'ores', beaver: 'wood', heron: 'fish', squirrel: 'crops', fox: 'gems', anvil_imp: 'ores',
  hedgehog: 'crops', ember_sprite: 'wood', owl: 'seeds', butterfly: 'herbs', herb_snail: 'herbs', rune_fairy: 'runes',
  hummingbird: 'crops', bone_raven: 'remains', goblin_whelp: 'gems', troll_pup: 'remains', baby_kraken: 'fish',
  little_lich: 'remains', hatchling: 'gems', void_wisp: 'runes', star_cub: 'special', slayer_bat: 'crops', lucky_cat: 'fish',
  astral_wisp: 'special', gilded_imp: 'gems', crimson_pup: 'remains', eclipse_orb: 'runes', rift_gargoyle: 'ores',
  comet_sprite: 'special', wandering_eye: 'gems', mushling: 'crops', frost_cub: 'fish', spring_chick: 'seeds', sunfox: 'crops',
}
export const ANY_FOOD = 'food'
export const dietOf = id => DIETS[id] || 'crops'

// How much one bite gives: favourite food fills more and builds more bond
export function feedValue(petId, itemId) {
  const it = ITEMS[itemId]
  if (!it) return null
  const cat = itemCategory(itemId)
  const fav = cat === dietOf(petId)
  if (!fav && cat !== ANY_FOOD) return null
  const worth = Math.sqrt(Math.max(1, it.value || 1))
  return { fav, full: fav ? 30 : 20, bond: fav ? 3 : 1, xp: Math.round((fav ? 30 : 15) + worth * (fav ? 4 : 3)) }
}

// Items a pet can bring: its favourite category, minus rare finds; better ones unlock with level
const giftCache = new Map()
function giftPool(cat) {
  if (!giftCache.has(cat))
    giftCache.set(cat, Object.values(ITEMS).filter(it => !it.rare && !it.quality && itemCategory(it.id) === cat).sort((a, b) => (a.value || 0) - (b.value || 0)))
  return giftCache.get(cat)
}
export function rollGift(petId, level, bond, rng = Math.random) {
  const pool = giftPool(dietOf(petId))
  if (!pool.length) return null
  const open = Math.max(1, Math.ceil(pool.length * (0.3 + 0.7 * (level / MAX_LEVEL))))
  const it = pool[Math.floor(rng() * open)]
  const size = (2 + level) * (bond >= LOYAL_AT ? 1.5 : 1) * (0.5 + rng() * 0.5)
  return { item: it.id, n: Math.max(1, Math.round(size / Math.sqrt(Math.max(1, (it.value || 1) / 5)))) }
}
