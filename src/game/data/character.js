/* =========================================================
   CHARACTER — roles, difficulty, attributes, talents, mastery
   ========================================================= */
import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'
import { modText } from '../../i18n/mods.js'

export const SLOT_COUNT = 4

/* ---------------- Difficulty ---------------- */
// xp: XP multiplier · monster: monster stats · gold: coins · offline: offline hours · death: share of gold lost on death
export const DIFFICULTIES = {
  easy:   { icon: 'sprout',         color: '#62c17e', xp: 1.0,  monster: 0.9,  gold: 1.1, offline: 1.0,  death: 0 },
  normal: { icon: 'crossed-swords', color: '#e2b65a', xp: 0.45, monster: 1.0,  gold: 1.0, offline: 1.0,  death: 0 },
  hard:   { icon: 'death-skull',    color: '#e3843a', xp: 0.3,  monster: 1.25, gold: 0.9, offline: 0.75, death: 0.05 },
  legend: { icon: 'crowned-skull',  color: '#e0554b', xp: 0.2,  monster: 1.5,  gold: 0.8, offline: 0.5,  death: 0.15 },
}
Object.entries(DIFFICULTIES).forEach(([k, d]) => named(d, `difficulty.${k}.name`, `difficulty.${k}.desc`))

/* ---------------- Attributes ---------------- */
// Each point adds `per` to every listed modifier
export const ATTRIBUTES = {
  str:  { icon: 'biceps',         color: '#e0554b', mods: { meleeDmg: 0.008, 'speed.mining': 0.003, 'speed.woodcutting': 0.003, 'speed.smithing': 0.003 } },
  dex:  { icon: 'archery-target', color: '#90be6d', mods: { meleeAcc: 0.006, rangedAcc: 0.006, rangedDmg: 0.008, atkSpeed: 0.0015, crit: 0.0005, thieving: 0.003, 'speed.fishing': 0.003, 'speed.fletching': 0.003 } },
  int:  { icon: 'brain',          color: '#4d96ff', mods: { magicDmg: 0.01, magicAcc: 0.006, 'xp.runecrafting': 0.005, 'xp.herblore': 0.005, 'xp.crafting': 0.005, runeSave: 0.003 } },
  vit:  { icon: 'glass-heart',    color: '#d62839', mods: { maxHp: 0.5, heal: 0.01, defense: 0.004, reduction: 0.0008 } },
  wis:  { icon: 'open-book',      color: '#b38cff', mods: { xp: 0.004, mastery: 0.01 } },
  luck: { icon: 'clover',         color: '#4ecdc4', mods: { double: 0.0015, loot: 0.005, gold: 0.005, crit: 0.0008, eliteChance: 0.0002, fishLuck: 0.003 } },
}
Object.entries(ATTRIBUTES).forEach(([k, a]) => {
  named(a, `attributes.${k}.name`, `attributes.${k}.desc`)
  Object.defineProperty(a, 'short', { get: () => t(`attributes.${k}.short`), enumerable: true })
})
export const POINTS_PER_LEVEL = 3
export const HERO_MAX_LEVEL = 100
export const HERO_XP_SHARE = 0.25 // share of all skill XP that also goes to the hero
// Cumulative XP needed to reach hero level L
export const heroXpFor = L => (L <= 1 ? 0 : Math.floor(60 * Math.pow(L - 1, 2.5)))

/* ---------------- Roles ---------------- */
export const ROLES = {
  warrior: {
    icon: 'barbarian', color: '#e0554b',
    attrs: { str: 6, dex: 2, int: 0, vit: 5, wis: 1, luck: 1 },
    bonus: { meleeDmg: 0.1, meleeAcc: 0.05, maxHp: 2 },
    skills: { attack: 5, strength: 5, defense: 3 },
    items: { shrimp: 25 }, equip: ['bronze_sword', 'bronze_shield'], style: 'attack',
  },
  ranger: {
    icon: 'archer', color: '#90be6d',
    attrs: { str: 1, dex: 7, int: 1, vit: 3, wis: 1, luck: 2 },
    bonus: { rangedDmg: 0.1, rangedAcc: 0.05, 'speed.gathering': 0.05, ammoSave: 0.1 },
    skills: { ranged: 5, woodcutting: 3, fishing: 3 },
    items: { bronze_arrow: 300, shrimp: 20 }, equip: ['bow', 'bronze_arrow'], style: 'ranged',
  },
  mage: {
    icon: 'wizard-face', color: '#4d96ff',
    attrs: { str: 0, dex: 1, int: 8, vit: 2, wis: 3, luck: 1 },
    bonus: { magicDmg: 0.15, magicAcc: 0.05, 'xp.runecrafting': 0.1, runeSave: 0.1 },
    skills: { magic: 5, runecrafting: 3 },
    items: { air_rune: 300, mind_rune: 300, water_rune: 100, shrimp: 15 }, equip: ['apprentice_staff'], style: 'magic',
  },
  artisan: {
    icon: 'anvil-impact', color: '#e3a64a',
    attrs: { str: 3, dex: 3, int: 3, vit: 2, wis: 3, luck: 1 },
    bonus: { 'speed.artisan': 0.1, preserve: 0.05, 'xp.smithing': 0.05, 'xp.crafting': 0.05, quality: 0.25 },
    skills: { smithing: 4, crafting: 4, cooking: 3 },
    items: { bronze_bar: 10, shrimp: 10 }, gold: 250, equip: [], style: 'attack',
  },
  rogue: {
    icon: 'rogue', color: '#9d79bc',
    attrs: { str: 1, dex: 6, int: 1, vit: 2, wis: 1, luck: 6 },
    bonus: { gold: 0.15, thieving: 0.1, double: 0.03, loot: 0.05 },
    skills: { thieving: 5, agility: 3 },
    items: { shrimp: 20 }, equip: ['bronze_sword'], style: 'attack',
  },
  paladin: {
    icon: 'holy-symbol', color: '#f1e3b0',
    attrs: { str: 3, dex: 1, int: 2, vit: 6, wis: 3, luck: 0 },
    bonus: { defense: 0.1, heal: 0.2, 'xp.prayer': 0.15, blessing: 0.25 },
    skills: { defense: 5, prayer: 5, hitpoints: 12 },
    items: { bones: 30, shrimp: 20 }, equip: ['bronze_helm', 'bronze_sword'], style: 'defense',
  },
}
Object.entries(ROLES).forEach(([k, r]) => {
  named(r, `roles.${k}.name`, `roles.${k}.desc`)
  // Perks are generated from the role bonuses so they always match the real numbers
  Object.defineProperty(r, 'perks', {
    get: () => [...Object.entries(r.bonus).map(([m, v]) => modText(m, v)), ...(r.gold ? [t('roles.startGold', { n: r.gold })] : [])],
    enumerable: true,
  })
})

/* ---------------- Portraits ---------------- */
export const AVATARS = ['wizard-face', 'woman-elf-face', 'dwarf-face', 'barbarian', 'swordwoman', 'archer', 'rogue', 'monk-face', 'nun-face', 'viking-head', 'ninja-head', 'visored-helm', 'hooded-assassin', 'dwarf-king', 'elf-helmet', 'warlock-hood']
export const TINTS = ['#6f5cd2', '#c0392b', '#2e8b57', '#2f6fdf', '#c9a04a', '#9d3fbf', '#3fb6c6', '#7a7a8a']

/* ---------------- Talents ---------------- */
// mod: modifier key · per: value per rank · max: ranks · lvl: hero level required · role: exclusive to that role
export const TALENT_POINT_EVERY = 2
export const TALENTS = [
  { id: 'diligent',   icon: 'hourglass',           mod: 'speed',            per: 0.03, max: 5, lvl: 1 },
  { id: 'scholar',    icon: 'open-book',           mod: 'xp',               per: 0.04, max: 5, lvl: 1 },
  { id: 'prospector', icon: 'war-pick',            mod: 'double.gathering', per: 0.02, max: 5, lvl: 4 },
  { id: 'thrifty',    icon: 'hand-saw',            mod: 'preserve',         per: 0.03, max: 5, lvl: 4 },
  { id: 'iron_skin',  icon: 'checked-shield',      mod: 'defense',          per: 0.04, max: 5, lvl: 6 },
  { id: 'vigor',      icon: 'glass-heart',         mod: 'maxHp',            per: 3,    max: 5, lvl: 6 },
  { id: 'green',      icon: 'sprout',              mod: 'farmSpeed',        per: 0.1,  max: 5, lvl: 8 },
  { id: 'harvester',  icon: 'sickle',              mod: 'farmYield',        per: 1,    max: 3, lvl: 12 },
  { id: 'merchant',   icon: 'two-coins',           mod: 'gold',             per: 0.05, max: 5, lvl: 10 },
  { id: 'fortune',    icon: 'open-treasure-chest', mod: 'loot',             per: 0.04, max: 5, lvl: 14 },
  { id: 'master',     icon: 'laurels-trophy',      mod: 'mastery',          per: 0.1,  max: 5, lvl: 16 },
  { id: 'dreamer',    icon: 'wood-cabin',          mod: 'offline',          per: 1,    max: 4, lvl: 20 },
  { id: 'angler',     icon: 'fishing-pole',        mod: 'fishLuck',         per: 0.15, max: 3, lvl: 10 },
  { id: 'tough',      icon: 'shield',              mod: 'reduction',        per: 0.015, max: 5, lvl: 22 },
  { id: 'swift_blade', icon: 'sprint',             mod: 'atkSpeed',         per: 0.02, max: 5, lvl: 24 },
  { id: 'hunter',     icon: 'crowned-skull',       mod: 'eliteChance',      per: 0.006, max: 4, lvl: 26 },
  { id: 'berserker',  icon: 'biceps',              mod: 'meleeDmg',         per: 0.05, max: 5, lvl: 8,  role: 'warrior' },
  { id: 'warlord',    icon: 'crossed-swords',      mod: 'meleeAcc',         per: 0.05, max: 5, lvl: 18, role: 'warrior' },
  { id: 'shield_wall', icon: 'checked-shield',     mod: 'block',            per: 0.025, max: 4, lvl: 28, role: 'warrior' },
  { id: 'eagle_eye',  icon: 'archery-target',      mod: 'rangedDmg',        per: 0.05, max: 5, lvl: 8,  role: 'ranger' },
  { id: 'quiver',     icon: 'quiver',              mod: 'ammoSave',         per: 0.1,  max: 3, lvl: 18, role: 'ranger' },
  { id: 'deadeye',    icon: 'eye-target',          mod: 'crit',             per: 0.015, max: 5, lvl: 28, role: 'ranger' },
  { id: 'arcane',     icon: 'fire-spell-cast',     mod: 'magicDmg',         per: 0.06, max: 5, lvl: 8,  role: 'mage' },
  { id: 'rune_saver', icon: 'rune-stone',          mod: 'runeSave',         per: 0.1,  max: 3, lvl: 18, role: 'mage' },
  { id: 'quickcast',  icon: 'magic-swirl',         mod: 'atkSpeed',         per: 0.025, max: 4, lvl: 28, role: 'mage' },
  { id: 'efficient',  icon: 'anvil',               mod: 'speed.artisan',    per: 0.05, max: 5, lvl: 8,  role: 'artisan' },
  { id: 'perfection', icon: 'cut-diamond',         mod: 'double.artisan',   per: 0.03, max: 5, lvl: 18, role: 'artisan' },
  { id: 'masterhand', icon: 'anvil-impact',        mod: 'quality',          per: 0.06, max: 5, lvl: 28, role: 'artisan' },
  { id: 'nimble',     icon: 'robber-hand',         mod: 'thieving',         per: 0.04, max: 5, lvl: 8,  role: 'rogue' },
  { id: 'lucky',      icon: 'clover',              mod: 'double',           per: 0.02, max: 5, lvl: 18, role: 'rogue' },
  { id: 'assassin',   icon: 'hooded-assassin',     mod: 'crit',             per: 0.02, max: 5, lvl: 28, role: 'rogue' },
  { id: 'healer',     icon: 'healing-shield',      mod: 'heal',             per: 0.1,  max: 5, lvl: 8,  role: 'paladin' },
  { id: 'devout',     icon: 'prayer',              mod: 'blessing',         per: 0.15, max: 3, lvl: 18, role: 'paladin' },
  { id: 'bulwark',    icon: 'bordered-shield',     mod: 'block',            per: 0.03, max: 5, lvl: 12, role: 'paladin' },
]
TALENTS.forEach(tal => {
  named(tal, `talents.${tal.id}`)
  tal.desc = v => modText(tal.mod, v)
})

/* ---------------- Per-action mastery ---------------- */
export const MASTERY = {
  xpScale: 0.5,        // mastery uses the XP table scaled by this factor
  doublePer: 0.002,    // +0.2% double output per mastery level
  speedPer: 0.001,     // +0.1% speed per level
  preserveEvery: 25,   // +3% chance to keep materials every 25 levels
  preservePer: 0.03,
}
export const masteryXpPerAction = time => 5 + time * 2

/* ---------------- Tools ---------------- */
export const TOOL_TYPES = {
  pickaxe: { skill: 'mining',      icon: 'war-pick' },
  axe:     { skill: 'woodcutting', icon: 'wood-axe' },
  rod:     { skill: 'fishing',     icon: 'fishing-pole' },
  // Optional tools: no resource needs them, but they help the skill
  sickle:   { skill: 'farming',  icon: 'sickle' },
  lockpick: { skill: 'thieving', icon: 'robber-hand' },
}
Object.entries(TOOL_TYPES).forEach(([k, tt]) => named(tt, `tools.${k}`))
export const TOOL_SPEED_PER_TIER = 0.05
