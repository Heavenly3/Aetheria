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
  { id: 'hawk',       icon: 'archery-target',  lvl: 25, mods: { rangedDmg: 0.1, rangedAcc: 0.05 } },
  { id: 'mystic',     icon: 'fire-spell-cast', lvl: 35, mods: { magicDmg: 0.1, magicAcc: 0.05 } },
  { id: 'protect',    icon: 'healing-shield',  lvl: 50, mods: { defense: 0.2 } },
  { id: 'piety',      icon: 'holy-symbol',     lvl: 70, mods: { meleeDmg: 0.15, meleeAcc: 0.1, defense: 0.1 } },
]
PRAYERS.forEach(p => named(p, `prayers.${p.id}.name`, `prayers.${p.id}.desc`))

/* ---------------- Grace rewards (Agility) ---------------- */
export const GRACE_COSTS = [5, 10, 20, 35, 60, 100, 160]
export const GRACE_SPEED = 0.02 // +2% global speed per level

/* ---------------- Random events ---------------- */
export const EVENT_CHANCE_PER_MIN = 1 / 35 // roughly one event every 35 minutes of active play
export const EVENTS = [
  { id: 'stars',    icon: 'falling-star', duration: 900, mods: { xp: 0.25 } },
  { id: 'goldrush', icon: 'gold-nuggets', duration: 600, mods: { gold: 0.5 } },
  { id: 'harvest',  icon: 'droplets',     duration: 900, mods: { farmSpeed: 0.5 } },
  { id: 'merchant', icon: 'shopping-bag', duration: 600, offer: true },
  { id: 'chest',    icon: 'locked-chest', duration: 0,   instant: true },
]
EVENTS.forEach(e => named(e, `events.${e.id}.name`, `events.${e.id}.desc`))
export const MERCHANT_POOL = ['uncut_sapphire', 'uncut_emerald', 'uncut_ruby', 'ranarr_seed', 'irit_seed', 'kwuarm_seed', 'mithril_bar', 'adamant_bar', 'death_rune', 'blood_rune', 'gem_chest', 'wisdom_elixir', 'super_attack', 'super_strength']
