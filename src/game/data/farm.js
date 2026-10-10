/*
  The farm beyond the plots:
  - soil: compost and supercompost worked into a growing plot raise its yield and its chance to turn bountiful
  - events: halfway through growing, a plot can turn bountiful (double harvest) or catch pests (half harvest
    unless they are shooed away); a scarecrow keeps pests off
  - hybrids: two parent crops growing side by side can cross when one is harvested, giving seeds of a crop
    found nowhere else; each discovery goes into the almanac
  - buildings: a coop and a beehive that produce on their own (also offline), a scarecrow and a well
  - seasons: every crop has a favourite season in which it yields more
*/
export const SOIL = {
  compost: { level: 1, yield: 1, bountiful: 0.08 },
  supercompost: { level: 2, yield: 3, bountiful: 0.18, speed: 0.25 },
}
export const SOIL_BY_LEVEL = { 1: SOIL.compost, 2: SOIL.supercompost }

export const BOUNTIFUL_CHANCE = 0.07
export const PEST_CHANCE = 0.14
export const SCARECROW_GUARD = 0.34 // share of pests each scarecrow level keeps away
export const SHOO_XP = 25 // Farming XP per level of the crop for shooing pests

// Hybrids: the crop they make and the two parents that must grow next to each other
export const HYBRIDS = [
  { id: 'sunberry', parents: ['strawberry', 'tomato'] },
  { id: 'moonroot', parents: ['potato', 'marrentill'] },
  { id: 'emberbloom', parents: ['harralander', 'onion'] },
  { id: 'starpetal', parents: ['ranarr', 'snapdragon'] },
]
export const HYBRID_CHANCE = 0.12
export const hybridOf = (a, b) => HYBRIDS.find(h => (h.parents[0] === a && h.parents[1] === b) || (h.parents[0] === b && h.parents[1] === a)) || null

// Buildings: cost of each level, and what the producing ones make every `every` ms per level
export const BUILDINGS = {
  coop:      { icon: 'chicken',        max: 3, every: 20 * 60e3, store: 8, makes: { egg: [1, 2], feathers: [3, 6] }, cost: l => ({ gold: 800 * 3 ** l, logs: 40 * (l + 1) }) },
  hive:      { icon: 'honeypot',       max: 3, every: 30 * 60e3, store: 6, makes: { honey: [1, 1] }, cost: l => ({ gold: 1500 * 3 ** l, oak_logs: 30 * (l + 1) }) },
  scarecrow: { icon: 'farmer',         max: 3, cost: l => ({ gold: 600 * 3 ** l, flax: 10 * (l + 1) }) },
  well:      { icon: 'water-drop',     max: 3, speed: 0.06, cost: l => ({ gold: 1200 * 3 ** l, iron_bar: 8 * (l + 1) }) },
}
export const BUILDING_IDS = Object.keys(BUILDINGS)
// Flowers that make the bees busier: a hive yields an extra honey while one of them grows
export const FLOWERS = ['strawberry', 'starpetal', 'sunberry', 'snapdragon']

// Favourite seasons: the crop yields this much more while it is in season
export const SEASON_BONUS = 0.25
export const FAVOURITE_SEASON = {
  potato: 'autumn', flax: 'summer', onion: 'spring', guam: 'spring', tomato: 'summer', marrentill: 'autumn', tarromin: 'winter',
  harralander: 'summer', strawberry: 'summer', ranarr: 'spring', irit: 'autumn', kwuarm: 'winter', snapdragon: 'spring', torstol: 'winter',
  sunberry: 'summer', moonroot: 'winter', emberbloom: 'autumn', starpetal: 'spring',
}
