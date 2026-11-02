/* =========================================================
   COMPANY — hired companions who follow the hero into boss fights and dungeons. Each trade does
   something of its own on top of a share of the hero's damage, and they grow with every fight.
   ========================================================= */

// dmg: share of the hero's max hit their blows reach · draw: how much of the enemy's attention they pull
// guard: share of a charged strike they take off the hero · interrupt: chance to cut off a creature's move
// breaker: their damage counts this many times towards breaking a healing
// heal: share of the hero's health mended each turn · cleanse: seconds between lifting a bleed, poison or burn
export const MERC_ROLES = {
  squire: { icon: 'black-knight-helm', tint: '#4a6a8a', dmg: 0.15, draw: 2, guard: 0.3 },
  archer: { icon: 'bowman', tint: '#3f7a4a', dmg: 0.35, draw: 1, interrupt: 0.5 },
  mage: { icon: 'wizard-face', tint: '#6a3fbf', dmg: 0.3, draw: 1, breaker: 2 },
  cleric: { icon: 'holy-symbol', tint: '#a8862a', dmg: 0.06, draw: 1, heal: 0.02, cleanse: 8 },
}
export const MERC_ROLE_IDS = Object.keys(MERC_ROLES)
// How many go with the hero at once
export const PARTY_SLOTS = 2
// Seconds between their turns, like a hero's swing
export const MERC_SPEED = 2.4
// A companion who saw the hero fall needs this long (real time, ms) to recover
export const HURT_TIME = 10 * 60 * 1000
export const MERC_MAX_LVL = 99

// Gold to take one on for good, and the wage for each boss fight or dungeon they join
export const hireCost = combatLevel => 500 + 200 * combatLevel
export const wageOf = lvl => 20 + lvl * 8
// XP to reach the next level
export const mercXpNeed = lvl => 40 * lvl
// How much of their trade's power they bring: grows with their level, up to the hero's own
export const mercPower = (lvl, heroLevel) => 0.4 + 0.6 * Math.min(1, lvl / Math.max(1, heroLevel))
