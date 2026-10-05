import { named } from '../../i18n/bind.js'

/*
  Ascension: start the hero over for Aether shards, spent on permanent upgrades.
  Upgrade: { id, branch, icon, max, cost (shards for rank 1; rank r costs cost * r), req?, mods }
  `mods` are per rank and use the same keys as everything else (see engine `mod`).
*/
export const ASCEND_MIN_TOTAL = 500 // total level needed to ascend

export const BRANCHES = {
  wisdom:  { icon: 'open-book',      color: '#b38cff' },
  fortune: { icon: 'two-coins',      color: '#e2b65a' },
  war:     { icon: 'crossed-swords', color: '#e0554b' },
}
Object.entries(BRANCHES).forEach(([k, b]) => named(b, `ascension.branches.${k}`))

const up = (id, branch, icon, max, cost, req, mods) => named({ id, branch, icon, max, cost, req, mods }, `ascension.upgrades.${id}`)

export const UPGRADES = [
  up('echoes',      'wisdom',  'open-book',          5, 5,  null,        { xp: 0.05 }),
  up('memory',      'wisdom',  'brain',              3, 8,  'echoes',    { mastery: 0.1 }),
  up('ancestry',    'wisdom',  'family-tree',        4, 12, 'echoes',    { startSkills: 5 }),
  up('dreams',      'wisdom',  'night-sleep',        3, 10, 'memory',    { offline: 2 }),
  up('quickened',   'wisdom',  'hourglass',          5, 15, 'dreams',    { speed: 0.03 }),
  up('gilded',      'fortune', 'two-coins',          5, 5,  null,        { gold: 0.1 }),
  up('keen_eye',    'fortune', 'eye-target',         4, 8,  'gilded',    { loot: 0.05 }),
  up('inheritance', 'fortune', 'locked-chest',       4, 6,  'gilded',    { startGold: 2500 }),
  up('beast_bond',  'fortune', 'paw-print',          4, 15, 'keen_eye',  { petChance: 0.25 }),
  up('bountiful',   'fortune', 'sickle',             3, 12, 'inheritance', { double: 0.02 }),
  up('battle_echo', 'war',     'crossed-swords',     5, 6,  null,        { meleeDmg: 0.05, rangedDmg: 0.05, magicDmg: 0.05 }),
  up('ironbound',   'war',     'checked-shield',     5, 6,  'battle_echo', { defense: 0.05 }),
  up('undying',     'war',     'glass-heart',        4, 10, 'ironbound', { maxHp: 5 }),
  up('forgemaster', 'war',     'anvil-impact',       4, 12, 'battle_echo', { enchantChance: 0.05 }),
  up('warlord',     'war',     'crowned-skull',      3, 18, 'undying',   { meleeAcc: 0.05, rangedAcc: 0.05, magicAcc: 0.05 }),
]
export const UPGRADE_MAP = Object.fromEntries(UPGRADES.map(u => [u.id, u]))
