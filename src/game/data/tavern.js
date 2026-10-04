/* =========================================================
   TAVERN — staff, expeditions, daily orders and the bar
   ========================================================= */
import { named } from '../../i18n/bind.js'

/* ---------------- Specialties ---------------- */
// skill: the skill whose actions the worker can perform · tavern: tavern level needed for them to show up
export const SPECIALTIES = {
  miner:      { icon: 'war-pick',           skill: 'mining',       tavern: 1 },
  lumberjack: { icon: 'wood-axe',           skill: 'woodcutting',  tavern: 1 },
  fisher:     { icon: 'fishing-pole',       skill: 'fishing',      tavern: 1 },
  adventurer: { icon: 'crossed-swords',     skill: null,           tavern: 1 },
  cook:       { icon: 'cooking-pot',        skill: 'cooking',      tavern: 2 },
  smith:      { icon: 'anvil-impact',       skill: 'smithing',     tavern: 2 },
  thief:      { icon: 'robber',             skill: 'thieving',     tavern: 2 },
  fletcher:   { icon: 'arrow-flights',      skill: 'fletching',    tavern: 3 },
  crafter:    { icon: 'sewing-needle',      skill: 'crafting',     tavern: 3 },
  alchemist:  { icon: 'round-bottom-flask', skill: 'herblore',     tavern: 4 },
  runesmith:  { icon: 'rune-stone',         skill: 'runecrafting', tavern: 4 },
}
Object.entries(SPECIALTIES).forEach(([k, s]) => named(s, `specs.${k}`))

/* ---------------- Rarity ---------------- */
// eff: efficiency compared to the hero · wage: wage multiplier · lvl: starting level range
export const RARITIES = {
  common:    { color: '#a8a8b8', eff: 0.4,  wage: 1,   weight: 60, lvl: [1, 10],  traits: 1, tavern: 1 },
  rare:      { color: '#4d96ff', eff: 0.55, wage: 1.8, weight: 28, lvl: [8, 25],  traits: 1, tavern: 1 },
  epic:      { color: '#b38cff', eff: 0.7,  wage: 3.2, weight: 10, lvl: [22, 45], traits: 2, tavern: 3 },
  legendary: { color: '#e2b65a', eff: 0.9,  wage: 6,   weight: 2,  lvl: [40, 60], traits: 2, tavern: 5 },
}
Object.entries(RARITIES).forEach(([k, r]) => named(r, `rarities.${k}`))

/* ---------------- Traits ---------------- */
export const TRAITS = {
  hardworking: { good: true,  speed: 0.15 },
  lazy:        { good: false, speed: -0.1, wage: -0.2 },
  lucky:       { good: true,  double: 0.06 },
  thrifty:     { good: true,  preserve: 0.1 },
  learner:     { good: true,  xp: 0.5 },
  cheap:       { good: true,  wage: -0.25 },
  greedy:      { good: false, wage: 0.3, speed: 0.1 },
  brave:       { good: true,  expSuccess: 0.1, expLoot: 0.2 },
  tough:       { good: true,  noInjury: true },
  clumsy:      { good: false, clumsy: 0.1 },
}
Object.entries(TRAITS).forEach(([k, tr]) => named(tr, `traits.${k}.name`, `traits.${k}.desc`))

export const WORKER_NAMES = ['Bram', 'Elda', 'Tobias', 'Mirella', 'Gundar', 'Lys', 'Oskar', 'Fenna', 'Rurik', 'Sabela', 'Corwin', 'Ilsa', 'Dorian', 'Maeve', 'Tomas',
  'Yara', 'Hugo', 'Nessa', 'Brokk', 'Alba', 'Kellan', 'Ines', 'Wulf', 'Greta', 'Piers', 'Lucia', 'Hamish', 'Vera', 'Ansel', 'Runa']

export const WAGE_BASE = 45        // coins per hour for a level 1 common worker
export const HIRE_FEE_HOURS = 3    // hiring costs this many hours of wages
export const BOARD_REFRESH = 3 * 3600

/* ---------------- Tavern levels ---------------- */
export const TAVERN_LEVELS = [
  { level: 1, slots: 1, board: 3, maxBet: 1000,   cost: {} },
  { level: 2, slots: 2, board: 3, maxBet: 5000,   cost: { gold: 3000, oak_logs: 60, iron_bar: 10 } },
  { level: 3, slots: 3, board: 4, maxBet: 20000,  cost: { gold: 15000, willow_logs: 80, steel_bar: 25 } },
  { level: 4, slots: 4, board: 4, maxBet: 80000,  cost: { gold: 75000, maple_logs: 100, mithril_bar: 25, gold_bar: 10 } },
  { level: 5, slots: 5, board: 5, maxBet: 300000, cost: { gold: 350000, yew_logs: 120, adamant_bar: 25, diamond: 3 } },
]
TAVERN_LEVELS.forEach(l => named(l, `tavernLevels.${l.level}`))

/* ---------------- Expeditions ---------------- */
export const EXPEDITION_DURATIONS = [
  { hours: 1, mult: 1 },
  { hours: 4, mult: 4.5 },
  { hours: 8, mult: 10 },
]
const L = (item, chance, a = 1, b = a) => ({ item, chance, qty: [a, b] })
export const EXPEDITIONS = [
  { id: 'meadows', icon: 'wheat', power: 1, gold: 30,
    loot: [L('feathers', 0.6, 5, 15), L('cowhide', 0.5, 1, 3), L('potato_seed', 0.3, 1, 3), L('bones', 0.6, 1, 3), L('copper_ore', 0.4, 2, 6)] },
  { id: 'forest', icon: 'pine-tree', power: 10, gold: 80,
    loot: [L('logs', 0.6, 4, 10), L('oak_logs', 0.4, 2, 6), L('wolf_pelt', 0.3, 1, 2), L('onion_seed', 0.25, 1, 3), L('uncut_sapphire', 0.04)] },
  { id: 'caves', icon: 'stone-block', power: 25, gold: 180,
    loot: [L('iron_ore', 0.6, 3, 8), L('coal', 0.5, 3, 8), L('gold_ore', 0.2, 1, 3), L('big_bones', 0.4, 1, 2), L('uncut_emerald', 0.04), L('coin_pouch', 0.08)] },
  { id: 'swamp', icon: 'mushroom', power: 40, gold: 320,
    loot: [L('venom_sac', 0.4, 1, 3), L('harralander_seed', 0.12, 1, 2), L('ranarr_seed', 0.06), L('chaos_rune', 0.3, 5, 15), L('uncut_ruby', 0.03)] },
  { id: 'peaks', icon: 'crystal-cluster', power: 60, gold: 600,
    loot: [L('ice_shard', 0.4, 1, 3), L('mithril_ore', 0.4, 2, 5), L('adamantite_ore', 0.2, 1, 3), L('raw_shark', 0.3, 2, 5), L('uncut_diamond', 0.02), L('gem_chest', 0.03)] },
  { id: 'dragons', icon: 'dragon-head', power: 80, gold: 1200,
    loot: [L('dragon_bones', 0.5, 1, 3), L('green_dhide', 0.4, 1, 2), L('runite_ore', 0.15, 1, 2), L('blood_rune', 0.2, 2, 6), L('torstol_seed', 0.03), L('gem_chest', 0.06)] },
]
EXPEDITIONS.forEach(e => named(e, `expeditions.${e.id}`))
export const INJURY_TIME = 1800

/* ---------------- Bar: drinks ---------------- */
export const DRINK_DURATION = 1800
export const DRINKS = [
  { id: 'ale',     icon: 'beer-horn',         price: { gold: 300 },  mods: { speed: 0.1 } },
  { id: 'mead',    icon: 'honeypot',          price: { gold: 500 },  mods: { xp: 0.1 } },
  { id: 'wine',    icon: 'glass-celebration', price: { gold: 800 },  mods: { double: 0.05, loot: 0.1 } },
  { id: 'grog',    icon: 'fire-bottle',       price: { gold: 600 },  mods: { meleeDmg: 0.1, rangedDmg: 0.1, magicDmg: 0.1 } },
  { id: 'special', icon: 'bubbling-flask',    price: { tokens: 5 },  mods: { xp: 0.2, speed: 0.1 } },
]
DRINKS.forEach(d => named(d, `drinks.${d.id}.name`, `drinks.${d.id}.desc`))
export const MYSTERY_CHEST = { tokens: 10, loot: [L('gem_chest', 0.25), L('coin_pouch', 0.3, 2, 4), L('wisdom_elixir', 0.15), L('ranarr_seed', 0.2, 2, 4), L('death_rune', 0.2, 20, 50), L('uncut_diamond', 0.05)] }

/* ---------------- Daily orders ---------------- */
export const ORDERS_PER_DAY = 3
export const ORDER_SKILLS = ['mining', 'woodcutting', 'fishing', 'cooking', 'smithing', 'fletching', 'crafting', 'herblore', 'runecrafting']
