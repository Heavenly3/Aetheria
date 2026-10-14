/*
  What each big festival asks the hero to do, on top of earning tokens everywhere.
  - spring: festival blooms grown on the farm; each harvest is judged (soil, bountiful, season)
  - summer: the bonfire, fed with logs, raises everyone's token income; the regatta is a festival water
  - harvest: the fair stand asks for crops and dishes every day; giant vegetables turn up while harvesting
  - winter: the Frost Wraith, a creature that grows with the hero; gifts for the people of the journal
*/
export const ACTIVITY = { spring: 'blooms', summer: 'bonfire', harvest: 'fair', winter: 'frost' }

// Spring: blooms
export const BLOOM_CROP = 'bloomflower'
export const BLOOM_SCORE = { base: 12, soil: [0, 6, 14], bountiful: 2, season: 6 }
export const FREE_SEEDS = 3 // festival seeds handed out each day

// Summer: the bonfire and the regatta
export const LOG_VALUE = { logs: 1, oak_logs: 2, willow_logs: 3, maple_logs: 5, yew_logs: 8, magic_logs: 12, elder_logs: 18 }
export const BONFIRE_LEVELS = [0, 150, 500, 1200, 2500] // value fed to reach each level
export const BONFIRE_TOKENS = 0.15 // extra token income per bonfire level
export const REGATTA_WATER = 'sunlit_bay'
export const SUNFISH = { item: 'raw_sunfish', points: 12, tokens: 2 }

// Harvest: the fair stand and giant vegetables
export const STAND_REQUESTS = 3
export const STAND_REWARD = { points: [30, 45, 60], tokens: 10 }
export const GIANT = { item: 'giant_vegetable', chance: 0.06, points: 40, tokens: 8 }

// Winter: the Frost Wraith and gifts
export const WRAITH = { id: 'frost_wraith', icon: 'ice-golem', points: 25, tokens: 5 }
// About four levels above the hero, whatever their level
export const wraithStats = cl => ({
  hp: Math.round(8 + cl * 1.6), att: Math.round(2 + cl * 0.7), def: Math.round(2 + cl * 0.7), maxHit: Math.max(1, Math.round(1 + cl * 0.12)),
  speed: 2.6, gold: [cl, cl * 3],
})
// What each person of the journal likes, and what they give back
export const GIFTS = {
  keeper: { likes: ['amber_ale', 'stew', 'baked_potato', 'honey'], gives: { coin_pouch: 2 } },
  astrologer: { likes: ['stardust', 'sapphire', 'glow_lure', 'starpetal'], gives: { stardust: 20 } },
  smith: { likes: ['iron_bar', 'steel_bar', 'coal', 'mithril_bar'], gives: { gem_chest: 1 } },
  priest: { likes: ['holy_water', 'bones', 'linen_cloth', 'big_bones'], gives: { holy_water: 2 } },
}
export const GIFT_POINTS = 30
