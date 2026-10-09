import { ITEMS } from './items.js'
import { ACTIONS, QUALITY_SKILLS } from './actions.js'
import { CATEGORY_GROUPS, itemCategory } from './categories.js'

/*
  The compendium's item pages: every item the hero has ever held is recorded, page by page (one
  page per inventory category). A full page can be claimed once for gold and a small permanent
  bonus. Finer crafted gear counts as its plain piece; the best quality ever made is kept as well,
  and distinct masterworks unlock milestones of their own. Relics live in the relic forge instead.
*/
export const PAGE_REWARDS = {
  ores: { 'speed.mining': 0.03, 'xp.smithing': 0.03 },
  wood: { 'speed.woodcutting': 0.04 },
  fish: { 'speed.fishing': 0.04 },
  crops: { farmYield: 1 },
  herbs: { 'xp.herblore': 0.05 },
  gems: { 'xp.crafting': 0.04 },
  remains: { 'xp.prayer': 0.05 },
  hides: { 'xp.crafting': 0.03, ammoSave: 0.03 },
  parts: { preserve: 0.02 },
  special: { petChance: 0.05 },
  food: { heal: 0.05 },
  potions: { mastery: 0.04 },
  runes: { runeSave: 0.04 },
  seeds: { farmSpeed: 0.04 },
  weapons: { meleeDmg: 0.02, rangedDmg: 0.02, magicDmg: 0.02 },
  armour: { defense: 0.03 },
  accessories: { maxHp: 3 },
  ammo: { rangedAcc: 0.03 },
  tools: { speed: 0.02 },
  chests: { loot: 0.02 },
}
export const PAGE_IDS = CATEGORY_GROUPS.flatMap(g => g.cats).filter(c => PAGE_REWARDS[c])

// The items on each page: plain items only (no finer versions, no relics)
export const PAGES = Object.fromEntries(PAGE_IDS.map(c => [c, []]))
for (const it of Object.values(ITEMS)) {
  if (it.base || it.relic) continue
  const c = itemCategory(it.id)
  if (PAGES[c]) PAGES[c].push(it.id)
}
export const pageGold = c => 400 * PAGES[c].length

// Every piece of gear a hero can craft, by skill
export const CRAFTED = Object.fromEntries(QUALITY_SKILLS.map(sk => [sk, ACTIONS[sk].filter(a => a.quality).map(a => Object.keys(a.out)[0])]))
export const CRAFTED_COUNT = Object.values(CRAFTED).flat().length
// Distinct masterworks made; `n: 0` means every one of them
export const MASTER_MILESTONES = [
  { n: 5, gold: 5000, mods: { quality: 0.05 } },
  { n: 15, gold: 20000, mods: { quality: 0.05, mastery: 0.03 } },
  { n: 30, gold: 60000, mods: { quality: 0.05, preserve: 0.02 } },
  { n: 50, gold: 150000, mods: { quality: 0.1 } },
  { n: 0, gold: 400000, mods: { quality: 0.1, 'speed.artisan': 0.05 } },
]
export const milestoneNeed = m => m.n || CRAFTED_COUNT
