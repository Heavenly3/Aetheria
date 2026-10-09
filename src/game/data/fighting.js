import { PLAYER_ATTACK_SPEED } from './combat.js'
import { ITEMS } from './items.js'

/*
  The finer side of combat:
  - weapons swing at their own pace and can land critical hits or leave a status on the target;
  - statuses (bleed, poison, burn, stun, slow, weaken) hit both sides for a few seconds;
  - creatures have traits of their own (venom, armour, regeneration…);
  - now and then an elite spawns: tougher, and with much better loot.
*/

/* ================= weapons ================= */
// speed: seconds between swings · dmg: damage multiplier (slow weapons hit harder) · crit: crit chance
// critDmg: crit multiplier · fx: status left on a landed hit, with its chance
const W = (speed, dmg, crit, extra = {}) => ({ speed, dmg, crit, critDmg: 1.5, fx: null, ...extra })
const PROFILES = {
  unarmed: W(PLAYER_ATTACK_SPEED, 1, 0.05),
  sword: W(2.4, 1, 0.06, { fx: { id: 'bleed', chance: 0.12 } }),
  bow: W(2.1, 0.9, 0.08),
  staff: W(2.6, 1.08, 0.05),
  troll_hammer: W(3.2, 1.35, 0.08, { critDmg: 1.8, fx: { id: 'stun', chance: 0.15 } }),
  dragon_blade: W(2.3, 1, 0.1, { fx: { id: 'burn', chance: 0.18 } }),
  void_blade: W(2.1, 1, 0.12, { critDmg: 1.7, fx: { id: 'bleed', chance: 0.22 } }),
  tide_bow: W(2.0, 0.92, 0.1, { fx: { id: 'slow', chance: 0.15 } }),
  astral_bow: W(1.9, 0.92, 0.15, { critDmg: 1.7 }),
  night_staff: W(2.6, 1.08, 0.07, { fx: { id: 'poison', chance: 0.25 } }),
  eclipse_staff: W(2.5, 1.08, 0.12, { critDmg: 1.75 }),
}
export function weaponProfile(id) {
  if (!id) return PROFILES.unarmed
  id = ITEMS[id]?.base || id
  if (PROFILES[id]) return PROFILES[id]
  if (id.endsWith('_sword')) return PROFILES.sword
  if (id.endsWith('bow')) return PROFILES.bow
  if (id.endsWith('staff')) return PROFILES.staff
  return PROFILES.unarmed
}
// Spells add their element's status on top of the staff
export const SPELL_FX = { fire: { id: 'burn', chance: 0.15 }, water: { id: 'slow', chance: 0.15 }, earth: { id: 'weaken', chance: 0.12 }, air: null }
// Air spells are quick to cast instead
export const AIR_SPEED = 0.9

/* ================= statuses ================= */
// dot: share of the hit that caused it, dealt every second · time: seconds it lasts
export const STATUSES = {
  bleed:  { icon: 'droplets',       color: '#e0554b', time: 5, dot: 0.12 },
  poison: { icon: 'death-juice',  color: '#62c17e', time: 8, dot: 0.08, stacks: 3 },
  burn:   { icon: 'fire',           color: '#ff9a3c', time: 4, dot: 0.2 },
  stun:   { icon: 'star-swirl',     color: '#f6dc9a', time: 2 },
  slow:   { icon: 'ice-spell-cast',    color: '#7ad7ff', time: 5, slow: 0.35 },
  weaken: { icon: 'broken-shield',  color: '#c58cff', time: 6, weaken: 0.25 },
}
export const STATUS_IDS = Object.keys(STATUSES)

/* ================= creature traits ================= */
// on: status put on the hero by a landed hit, with its chance · armour: share of damage ignored
// regen: share of max HP healed every second · drain: share of damage dealt that heals it
// enrage: extra damage below 30% HP · evade: chance to dodge the hero's attack
export const TRAITS = {
  venom:   { icon: 'death-juice', on: { id: 'poison', chance: 0.3 } },
  bleeds:  { icon: 'droplets',      on: { id: 'bleed', chance: 0.25 } },
  burns:   { icon: 'fire',          on: { id: 'burn', chance: 0.25 } },
  chills:  { icon: 'ice-spell-cast',   on: { id: 'slow', chance: 0.3 } },
  stuns:   { icon: 'star-swirl',    on: { id: 'stun', chance: 0.12 } },
  curses:  { icon: 'broken-shield', on: { id: 'weaken', chance: 0.25 } },
  armour:  { icon: 'shield',        armour: 0.2 },
  regen:   { icon: 'glass-heart',    regen: 0.015 },
  drain:   { icon: 'vampire-dracula', drain: 0.5 },
  enrage:  { icon: 'biceps',        enrage: 0.4 },
  evasive: { icon: 'sprint',        evade: 0.2 },
}
export const MONSTER_TRAITS = {
  goblin: ['evasive'], rat: ['evasive'], wolf: ['bleeds', 'enrage'], bandit: ['evasive'],
  skeleton: ['armour'], golem: ['armour'], troll: ['regen'],
  snake: ['venom'], scorpion: ['venom', 'armour'], werewolf: ['bleeds', 'enrage'],
  specter: ['curses'], vampire: ['drain'], gargoyle: ['armour'],
  bear: ['bleeds', 'enrage'], ice_golem: ['armour', 'chills'], ogre: ['stuns'],
  green_dragon: ['venom'], red_dragon: ['burns'], wyvern: ['evasive', 'venom'],
  minotaur: ['enrage', 'stuns'], hydra: ['regen', 'venom'], demon: ['burns', 'drain'],
  void_stalker: ['evasive', 'bleeds'], star_wraith: ['curses', 'chills'], abyssal_titan: ['armour', 'stuns'],
  seraph: ['curses', 'burns'], astral_golem: ['armour', 'regen'], elder_wyrm: ['burns', 'enrage'],
  warren_chief: ['evasive'], skeleton_king: ['armour', 'curses'], naga: ['venom', 'regen'], winter_queen: ['chills', 'curses'],
  bronze_wyrm: ['burns', 'armour'], rift_warden: ['curses', 'stuns', 'regen'],
  goblin_king: ['evasive', 'stuns'], troll_lord: ['regen', 'stuns'], kraken: ['chills', 'stuns'], necromancer: ['drain', 'curses'],
  ancient_dragon: ['burns', 'armour', 'enrage'], void_emperor: ['drain', 'curses', 'evasive'], aether_sovereign: ['burns', 'regen', 'armour'],
}
export const traitsOf = id => MONSTER_TRAITS[id] || []

/* ================= elites ================= */
export const ELITE_CHANCE = 0.04
// hp / att / def / maxHit multiply the creature · speed multiplies its attack interval · trait: an extra trait
export const ELITES = {
  fierce:   { color: '#ff7a59', hp: 2, att: 1.3, def: 1, maxHit: 1.5, speed: 1 },
  armoured: { color: '#9fb3c8', hp: 2.2, att: 1, def: 1.6, maxHit: 1.1, speed: 1, trait: 'armour' },
  swift:    { color: '#9fd8c8', hp: 1.8, att: 1.2, def: 1, maxHit: 1.1, speed: 0.65, trait: 'evasive' },
  ancient:  { color: '#e2b65a', hp: 3, att: 1.35, def: 1.35, maxHit: 1.4, speed: 0.9, trait: 'regen' },
  // Only steps up while the creature is the hero's slayer task
  superior: { color: '#d36bff', hp: 3.5, att: 1.4, def: 1.3, maxHit: 1.5, speed: 0.9, trait: 'enrage' },
}
export const ELITE_IDS = Object.keys(ELITES).filter(k => k !== 'superior')
// What an elite pays on top: drop chances multiplied, gold multiplied, and a bonus stardust
export const ELITE_LOOT = { drops: 2.5, gold: 4, stardust: [1, 3] }

/* ================= the hero's abilities ================= */
/*
  Every attack builds energy (crits and blows taken build more). Abilities on the bar fire on their
  own in place of a normal attack when there is enough energy and their cooldown is over; the bar is
  read left to right, so the first slot has priority.
  - mult: damage of each hit · hits: number of hits · acc: extra hit chance · crit: extra crit chance
  - fx: statuses always left on a landed hit · heal: share of max HP restored · buff: a boon on the hero
*/
export const ENERGY_MAX = 100
export const ENERGY = { attack: 14, crit: 10, struck: 5 }
export const BAR_SIZE = 3
const A = (id, icon, lvl, cost, cd, effect) => ({ id, icon, lvl, cost, cd, mult: 1, hits: 1, acc: 0, crit: 0, fx: [], heal: 0, buff: null, ...effect })
// skill: the level that unlocks each style's abilities
export const ABILITY_SKILL = { melee: 'attack', ranged: 'ranged', magic: 'magic' }
export const ABILITIES = {
  melee: [
    A('power_strike', 'broadsword', 1, 30, 6, { mult: 1.8, acc: 0.2 }),
    A('rending_slash', 'blood', 10, 35, 10, { mult: 1.2, fx: ['bleed'] }),
    A('shield_bash', 'shield-reflect', 20, 40, 14, { mult: 0.8, fx: ['stun'], acc: 0.15 }),
    A('second_wind', 'glass-heart', 30, 50, 30, { mult: 0, heal: 0.22 }),
    A('whirlwind', 'swords-emblem', 45, 60, 16, { mult: 0.7, hits: 3 }),
    A('berserk', 'biceps', 60, 70, 40, { mult: 1, buff: 'berserk' }),
  ],
  ranged: [
    A('aimed_shot', 'archery-target', 1, 30, 6, { mult: 1.6, acc: 0.4 }),
    A('poison_arrow', 'arrowhead', 10, 35, 10, { mult: 1.1, fx: ['poison', 'poison'] }),
    A('volley', 'arrow-flights', 20, 45, 12, { mult: 0.6, hits: 3 }),
    A('crippling_shot', 'eye-target', 30, 45, 16, { mult: 1, fx: ['slow', 'weaken'] }),
    A('evasion', 'sprint', 45, 50, 30, { mult: 0, buff: 'evasion' }),
    A('deadeye', 'high-shot', 60, 75, 30, { mult: 2.6, crit: 1, acc: 0.5 }),
  ],
  magic: [
    A('arcane_bolt', 'magic-swirl', 1, 30, 6, { mult: 1.7, acc: 0.2 }),
    A('flame_burst', 'fire-spell-cast', 10, 40, 10, { mult: 1.2, fx: ['burn'] }),
    A('frost_nova', 'ice-spell-cast', 20, 45, 14, { mult: 0.9, fx: ['slow', 'stun'] }),
    A('mana_shield', 'magic-shield', 30, 50, 30, { mult: 0, buff: 'ward' }),
    A('chain_lightning', 'sparkles', 45, 60, 16, { mult: 0.55, hits: 4 }),
    A('meteor', 'burning-meteor', 60, 80, 32, { mult: 3.2, acc: 0.3 }),
  ],
}
export const ABILITY_MAP = Object.fromEntries(Object.values(ABILITIES).flat().map(a => [a.id, a]))
// Boons the hero gives themself: dmg and crit add, dodge adds, ward cuts damage taken
export const BUFFS = {
  berserk: { icon: 'biceps', color: '#ff7a59', time: 10, dmg: 0.3, crit: 0.1 },
  evasion: { icon: 'sprint', color: '#9fd8c8', time: 8, dodge: 0.3 },
  ward: { icon: 'magic-shield', color: '#7ad7ff', time: 8, ward: 0.4 },
}
export const defaultBar = () => ({ melee: ['power_strike'], ranged: ['aimed_shot'], magic: ['arcane_bolt'] })

/* ================= boss phases ================= */
// Bosses change as they weaken: at: share of health left · speed: attack interval · maxHit and armour
// stack with the creature's own · weaken: the hero is weakened when the phase begins
export const BOSS_PHASES = [
  { id: 'enraged', at: 0.5, speed: 0.85, maxHit: 1.25, armour: 0, weaken: false },
  { id: 'desperate', at: 0.25, speed: 0.75, maxHit: 1.35, armour: 0.15, weaken: true },
]

/* ================= hunting streaks ================= */
// Kills in a row without dying: every STREAK_STEP kills adds a step of combat XP and loot, up to the cap
export const STREAK_STEP = 25
export const STREAK_BONUS = 0.025
export const STREAK_MAX = 0.25
export const COMBAT_SKILLS = ['attack', 'strength', 'defense', 'ranged', 'magic', 'hitpoints', 'slayer']

/* ================= armour ================= */
// Gear defence also soaks part of every blow: defence / (defence + ARMOUR_K), up to ARMOUR_CAP
export const ARMOUR_K = 600
export const ARMOUR_CAP = 0.4
