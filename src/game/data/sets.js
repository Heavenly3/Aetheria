import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'
import { ITEMS, METALS } from './items.js'

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

export const SETS = [
  ...metalSets,
  set('leather', 'leather-vest', '#a0703a', ['leather_coif', 'leather_body', 'leather_chaps'], [
    { n: 2, mods: { rangedAcc: 0.04 } },
    { n: 3, mods: { rangedDmg: 0.04, ammoSave: 0.05 } },
  ]),
  set('dragonhide', 'leather-armor', '#3aa86a', ['dhide_body', 'dhide_chaps'], [
    { n: 2, mods: { rangedDmg: 0.08, ammoSave: 0.1 } },
  ]),
  set('wizard', 'wizard-face', '#3a5fe0', ['wizard_hat', 'wizard_robe', 'apprentice_staff'], [
    { n: 2, mods: { magicAcc: 0.05 } },
    { n: 3, mods: { magicDmg: 0.04, runeSave: 0.08 } },
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
