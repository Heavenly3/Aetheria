import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'
import { ITEMS, METALS, CLOTHS, ROBES, HIDES, HIDE_PIECES } from './items.js'

/*
  Equipment sets: wearing several pieces of the same set adds its bonuses (`mods`, the same keys as
  pets and talents). Each bonus needs `n` pieces equipped; the bonuses stack as more pieces are worn.
*/
const set = (id, icon, tint, pieces, bonuses, name) => named({ id, icon, tint, pieces, bonuses }, name || `sets.${id}`)

// Metal armour: helm, body, legs, shield and sword of one metal; stronger metals give bigger bonuses
const metalSets = METALS.map((m, i) => {
  const k = i + 1
  return set(m.id, 'breastplate', m.tint, ['helm', 'body', 'legs', 'shield', 'sword'].map(p => `${m.id}_${p}`), [
    { n: 2, mods: { defense: 0.01 + 0.01 * k } },
    { n: 4, mods: { meleeAcc: 0.02 + 0.01 * k, meleeDmg: 0.02 + 0.01 * k } },
    { n: 5, mods: { maxHp: 2 + 2 * k } },
  ], () => t('sets.metal', { mat: t(`mats.${m.id}`) }))
})

// Robes of one cloth and hides of one beast; finer materials give bigger bonuses
const clothSets = CLOTHS.map((c, i) => set(c.id, 'cloak', c.tint, ROBES.map(r => `${c.id}_${r.id}`), [
  { n: 2, mods: { magicAcc: 0.02 + 0.015 * i } },
  { n: 3, mods: { magicDmg: 0.02 + 0.02 * i, runeSave: 0.05 + 0.03 * i } },
], () => t('sets.cloth', { mat: t(`mats.${c.id}`) })))
const hideSets = HIDES.map((h, i) => set(h.id, 'leather-vest', h.tint, HIDE_PIECES.map(p => `${h.id}_${p.id}`), [
  { n: 2, mods: { rangedAcc: 0.03 + 0.02 * i } },
  { n: 3, mods: { rangedDmg: 0.03 + 0.025 * i, ammoSave: 0.05 + 0.03 * i } },
], () => t('sets.hide', { mat: t(`mats.${h.id}`) })))

export const SETS = [
  ...metalSets,
  ...clothSets,
  ...hideSets,
  set('leather', 'leather-vest', '#a0703a', ['leather_coif', 'leather_body', 'leather_chaps'], [
    { n: 2, mods: { rangedAcc: 0.04 } },
    { n: 3, mods: { rangedDmg: 0.04, ammoSave: 0.05 } },
  ]),
  set('dragonhide', 'leather-armor', '#3aa86a', ['dhide_coif', 'dhide_body', 'dhide_chaps'], [
    { n: 2, mods: { rangedDmg: 0.08, ammoSave: 0.1 } },
    { n: 3, mods: { rangedAcc: 0.06 } },
  ]),
  set('wizard', 'wizard-face', '#3a5fe0', ['wizard_hat', 'wizard_robe', 'apprentice_staff'], [
    { n: 2, mods: { magicAcc: 0.05 } },
    { n: 3, mods: { magicDmg: 0.04, runeSave: 0.08 } },
  ]),
  set('graceful', 'sprint', '#4ecdc4', ['graceful_hood', 'graceful_cape', 'graceful_legs', 'graceful_top'], [
    { n: 2, mods: { 'speed.gathering': 0.04 } },
    { n: 3, mods: { 'xp.agility': 0.1, thieving: 0.05 } },
    { n: 4, mods: { speed: 0.04, offline: 1 } },
  ]),
  set('shadow', 'hooded-assassin', '#5a4a7a', ['shadow_mask', 'shadow_cloak', 'shadow_garb'], [
    { n: 2, mods: { thieving: 0.06, gold: 0.05 } },
    { n: 3, mods: { heat: 0.35, 'double.gathering': 0.03 } },
  ]),
  set('slayer', 'black-knight-helm', '#b5179e', ['slayer_helm', 'slayer_cape'], [
    { n: 2, mods: { meleeDmg: 0.04, rangedDmg: 0.04, magicDmg: 0.04, loot: 0.05 } },
  ]),
  set('dragonbane', 'dragon-shield', '#e0402a', ['dragon_blade', 'dragon_shield'], [
    { n: 2, mods: { meleeDmg: 0.08, defense: 0.05 } },
  ]),
  set('regalia', 'crown-of-thorns', '#f0c040', ['crown_of_ages', 'celestial_aegis', 'sovereign_cape', 'eternity_amulet'], [
    { n: 2, mods: { defense: 0.05, maxHp: 10 } },
    { n: 4, mods: { xp: 0.05, gold: 0.05, meleeDmg: 0.05, rangedDmg: 0.05, magicDmg: 0.05 } },
  ]),
]

export const SET_MAP = Object.fromEntries(SETS.map(s => [s.id, s]))
// Item id -> the set it belongs to
export const SET_OF = {}
SETS.forEach(s => s.pieces.forEach(id => {
  if (!ITEMS[id]) throw new Error(`Set ${s.id}: unknown item ${id}`)
  SET_OF[id] = s
}))
