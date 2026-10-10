/*
  The thief's life:
  - heat: every theft draws the guard's eye; heat makes thefts likelier to fail, and getting caught while
    the guard is on alert lands the hero in jail for a while (a bribe gets them out). Heat cools with time.
  - stolen goods: valuables lifted now and then, worth most at the fence while the heat is low
  - heists: four big jobs played in stages (plan, slip in, crack, get away), each with its own requirements
    and cooldown; they pay gold, stolen goods and pieces of the shadow outfit
*/
export const HEAT_MAX = 100
export const HEAT_DECAY = 6000 // ms for one point of heat to cool
export const heatGain = a => (a.group === 'groups.stalls' ? 3 : 2) + a.lvl / 25
export const HEAT_FAIL = 0.0025 // extra failure chance per point of heat
export const CAUGHT_FROM = 60 // from this heat, a failed theft can end in jail
export const jailChance = heat => Math.max(0, (heat - CAUGHT_FROM) / 80)
export const jailTime = level => (90 + level * 3) * 1000
export const bribeCost = level => 60 + level * 25
export const informantCost = level => 40 + level * 15 // halves the heat
export const HEAT_ON_FAIL = 6

// Valuables: the thieving level from which they turn up, their worth, and how rare they are
export const STOLEN = [
  { id: 'silver_goblet', lvl: 1, value: 120, weight: 10 },
  { id: 'jewelled_ring', lvl: 25, value: 380, weight: 6 },
  { id: 'old_painting', lvl: 45, value: 950, weight: 3 },
  { id: 'noble_seal', lvl: 70, value: 2400, weight: 1 },
]
export const STOLEN_CHANCE = 0.03 // per successful theft, grows a little with level
export const fenceMult = heat => 1.6 - heat / 125 // the fence pays more while the guard is calm

// Heists. req: levels needed (thieving, agility) and lockpick tier · cd: cooldown (ms) · heat: heat it raises
export const HEISTS = [
  { id: 'merchant_vault', icon: 'locked-chest', req: { thieving: 20, agility: 10 }, lockpick: 2, cd: 2 * 3600e3, heat: 30,
    gold: [800, 1500], loot: { silver_goblet: [1, 3], coin_pouch: [1, 2] }, gear: 'shadow_mask' },
  { id: 'bishop_reliquary', icon: 'church', req: { thieving: 40, agility: 25 }, lockpick: 3, cd: 4 * 3600e3, heat: 40,
    gold: [3000, 6000], loot: { jewelled_ring: [1, 2], holy_water: [1, 3] }, gear: 'shadow_cloak' },
  { id: 'guild_vault', icon: 'swords-emblem', req: { thieving: 60, agility: 40 }, lockpick: 4, cd: 6 * 3600e3, heat: 50,
    gold: [9000, 16000], loot: { old_painting: [1, 2], gem_chest: [1, 2] }, gear: 'shadow_garb' },
  { id: 'royal_treasury', icon: 'crown', req: { thieving: 80, agility: 60 }, lockpick: 5, cd: 12 * 3600e3, heat: 70,
    gold: [30000, 50000], loot: { noble_seal: [1, 2], starlight_shard: [1, 1] }, gear: null },
]
export const HEIST_MAP = Object.fromEntries(HEISTS.map(h => [h.id, h]))
export const HEIST_STAGES = ['plan', 'slip', 'crack', 'escape']
export const GEAR_CHANCE = 0.35 // a heist's outfit piece, the first times it pays off
