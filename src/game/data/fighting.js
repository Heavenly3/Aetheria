import { PLAYER_ATTACK_SPEED } from './combat.js'

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
}
export const ELITE_IDS = Object.keys(ELITES)
// What an elite pays on top: drop chances multiplied, gold multiplied, and a bonus stardust
export const ELITE_LOOT = { drops: 2.5, gold: 4, stardust: [1, 3] }
