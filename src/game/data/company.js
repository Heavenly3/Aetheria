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

/*
  Companions met along the way: each joins for free once their moment comes (a page of the story,
  or the guild's trust), is better at their trade (boost) and brings a gift of their own even away
  from the fights (perk: modifiers, while they are in the company). Once they trust the hero fully
  they ask for help with something of their own (quest: a boss to defeat with them along, or affairs to
  settle while they are in the company); done, their trade grows again (quest.boost)
*/
export const UNIQUE_MERCS = {
  maelis: { role: 'mage', icon: 'warlock-hood', tint: '#4a6a3a', unlock: { chapter: 'living_mire' }, boost: { dmg: 0.4, breaker: 3 }, perk: { 'xp.herblore': 0.05 },
    quest: { kill: 'naga', n: 3, boost: { breaker: 4 } } },
  hollis: { role: 'squire', icon: 'visored-helm', tint: '#5a6a7a', unlock: { chapter: 'empty_tomb' }, boost: { draw: 3, guard: 0.45 }, perk: { 'speed.smithing': 0.05 },
    quest: { kill: 'skeleton_king', n: 3, boost: { guard: 0.6 } } },
  seren: { role: 'archer', icon: 'woman-elf-face', tint: '#3a6a7a', unlock: { chapter: 'northern_watch' }, boost: { interrupt: 0.75 }, perk: { 'speed.woodcutting': 0.05 },
    quest: { kill: 'winter_queen', n: 3, boost: { interrupt: 0.9 } } },
  ardan: { role: 'cleric', icon: 'monk-face', tint: '#8a6a2a', unlock: { chapter: 'beyond_the_gate' }, boost: { heal: 0.03, cleanse: 5 }, perk: { 'xp.prayer': 0.1 },
    quest: { kill: 'rift_warden', n: 3, boost: { heal: 0.04, cleanse: 4 } } },
  vela: { role: 'archer', icon: 'hooded-assassin', tint: '#5a3a6a', unlock: { affairs: 10 }, boost: { dmg: 0.45, interrupt: 0.6 }, perk: { thieving: 0.05 },
    quest: { affairs: 5, n: 5, boost: { dmg: 0.55 } } },
}
export const UNIQUE_IDS = Object.keys(UNIQUE_MERCS)
// What a companion brings to a fight: their trade, sharpened if they are one of the companions met along the way
export const mercTrade = m => ({ ...MERC_ROLES[m.role], ...(UNIQUE_MERCS[m.unique]?.boost || {}), ...(m.questDone ? UNIQUE_MERCS[m.unique]?.quest.boost : {}) })
export const mercIcon = m => UNIQUE_MERCS[m.unique]?.icon || MERC_ROLES[m.role].icon
export const mercTint = m => UNIQUE_MERCS[m.unique]?.tint || MERC_ROLES[m.role].tint

// Trust grows with every creature defeated together (more for a boss). Loyal companions fight better,
// and full trust opens a companion's own quest
export const TRUST_MAX = 100
export const TRUST_KILL = 1
export const TRUST_BOSS = 3
export const LOYAL_AT = 50
export const LOYAL_POWER = 1.1
// What a companion met along the way says when the hero talks to them, in `company.talk.<id>.<line>`:
// more as trust grows, a request at full trust, and thanks once their quest is done. Newest first
export const COMPANION_TALKS = [
  { id: 'hello', when: () => true },
  { id: 'past', when: m => (m.trust || 0) >= LOYAL_AT },
  { id: 'ask', when: m => (m.trust || 0) >= TRUST_MAX && !m.questDone },
  { id: 'after', when: m => !!m.questDone },
]
export const companionTalks = m => COMPANION_TALKS.filter(l => l.when(m)).map(l => l.id)
