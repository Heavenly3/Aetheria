/* =========================================================
   EXTRAS — prayers, grace rewards and random events
   ========================================================= */
import { named } from '../../i18n/bind.js'

/* ---------------- Prayers (Prayer used in combat) ---------------- */
// While fighting, an active prayer consumes 1 bone every PRAYER_DRAIN seconds and grants Prayer XP
export const PRAYER_DRAIN = 30
export const PRAYER_BONES = [
  { item: 'bones', xp: 2 }, { item: 'big_bones', xp: 7 }, { item: 'dragon_bones', xp: 36 }, { item: 'demon_ashes', xp: 55 },
]
export const PRAYERS = [
  { id: 'stone_skin', icon: 'checked-shield',  lvl: 1,  mods: { defense: 0.08 } },
  { id: 'clarity',    icon: 'all-seeing-eye',  lvl: 7,  mods: { meleeAcc: 0.06, rangedAcc: 0.06, magicAcc: 0.06 } },
  { id: 'might',      icon: 'biceps',          lvl: 15, mods: { meleeDmg: 0.08 } },
  { id: 'rapid_heal', icon: 'glass-heart',     lvl: 22, mods: { heal: 0.25, maxHp: 4 } },
  { id: 'hawk',       icon: 'archery-target',  lvl: 25, mods: { rangedDmg: 0.1, rangedAcc: 0.05 } },
  { id: 'mystic',     icon: 'fire-spell-cast', lvl: 35, mods: { magicDmg: 0.1, magicAcc: 0.05 } },
  { id: 'evasion',    icon: 'sprint',          lvl: 42, mods: { dodge: 0.06, defense: 0.05 } },
  { id: 'protect',    icon: 'healing-shield',  lvl: 50, mods: { defense: 0.2 } },
  { id: 'keen_edge',  icon: 'shining-sword',   lvl: 58, mods: { crit: 0.05, critDmg: 0.2 } },
  { id: 'piety',      icon: 'holy-symbol',     lvl: 70, mods: { meleeDmg: 0.15, meleeAcc: 0.1, defense: 0.1 } },
  { id: 'rigour',     icon: 'bow-arrow',       lvl: 74, mods: { rangedDmg: 0.15, rangedAcc: 0.1, defense: 0.1 } },
  { id: 'augury',     icon: 'crystal-ball',    lvl: 77, mods: { magicDmg: 0.15, magicAcc: 0.1, defense: 0.1 } },
]
PRAYERS.forEach(p => named(p, `prayers.${p.id}.name`, `prayers.${p.id}.desc`))

/* ---------------- Grace rewards (Agility) ---------------- */
export const GRACE_COSTS = [5, 10, 20, 35, 60, 100, 160]
export const GRACE_SPEED = 0.02 // +2% global speed per level
// The graceful outfit, bought with marks of grace; a set that rewards gathering and agility
export const GRACEFUL = [
  { id: 'graceful_hood', lvl: 10, cost: 20 },
  { id: 'graceful_cape', lvl: 20, cost: 25 },
  { id: 'graceful_legs', lvl: 30, cost: 30 },
  { id: 'graceful_top',  lvl: 40, cost: 40 },
]

