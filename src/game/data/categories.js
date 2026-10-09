import { ITEMS, CROPS } from './items.js'
import { ACTIONS } from './actions.js'

/*
  Inventory categories, grouped in four families. Every item belongs to exactly one category,
  worked out from its type, its equipment slot or (for resources) what kind of material it is.
*/
export const CATEGORY_GROUPS = [
  { id: 'gear', icon: 'crossed-swords', cats: ['weapons', 'armour', 'accessories', 'ammo', 'tools'] },
  { id: 'supplies', icon: 'round-potion', cats: ['food', 'potions', 'runes', 'seeds'] },
  { id: 'resources', icon: 'ore', cats: ['ores', 'wood', 'fish', 'crops', 'herbs', 'gems', 'remains', 'hides', 'parts', 'special'] },
  { id: 'other', icon: 'locked-chest', cats: ['chests', 'junk'] },
]
export const CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.cats)
export const CATEGORY_ICON = {
  weapons: 'broadsword', armour: 'breastplate', accessories: 'gem-pendant', ammo: 'quiver', tools: 'war-pick',
  food: 'meat', potions: 'round-potion', runes: 'rune-stone', seeds: 'plant-seed',
  ores: 'ore', wood: 'log', fish: 'fishing', crops: 'potato', herbs: 'herbs-bundle', gems: 'cut-diamond', remains: 'crossed-bones',
  hides: 'animal-hide', parts: 'arrowhead', special: 'sparkles', chests: 'locked-chest', junk: 'fishbone',
}

const SLOT_CAT = { weapon: 'weapons', head: 'armour', body: 'armour', legs: 'armour', shield: 'armour', amulet: 'accessories', cape: 'accessories', ammo: 'ammo' }
const TYPE_CAT = { tool: 'tools', food: 'food', potion: 'potions', rune: 'runes', seed: 'seeds', chest: 'chests', junk: 'junk' }
const HERBS = new Set(CROPS.filter(c => c.herb).map(c => c.id))
const CROP_IDS = new Set(CROPS.map(c => c.id))
const GEMS = new Set(['sapphire', 'emerald', 'ruby', 'diamond'])
const REMAINS = new Set(['bones', 'big_bones', 'dragon_bones', 'demon_ashes', 'ashes'])
const HIDES = new Set(['cowhide', 'leather', 'green_dhide', 'green_dleather', 'wolf_pelt', 'feathers', 'snake_skin', 'wyvern_scale', 'wolf_leather', 'snake_leather', 'wyvern_leather'])
const SPECIAL = new Set(['mark_of_grace', 'void_essence', 'starlight_shard', 'stardust', 'ectoplasm', 'ice_shard', 'venom_sac', 'troll_tusk', 'slayer_sigil'])

function categoryOf(it) {
  if (it.type === 'equip') return SLOT_CAT[it.slot] || 'armour'
  if (TYPE_CAT[it.type]) return TYPE_CAT[it.type]
  const id = it.id
  if (id.endsWith('_ore') || id.endsWith('_bar') || id === 'coal' || id === 'rune_essence') return 'ores'
  if (id.endsWith('logs')) return 'wood'
  if (id.startsWith('raw_')) return 'fish'
  if (HERBS.has(id)) return 'herbs'
  if (CROP_IDS.has(id)) return 'crops'
  if (id.startsWith('uncut_') || GEMS.has(id)) return 'gems'
  if (REMAINS.has(id)) return 'remains'
  if (HIDES.has(id)) return 'hides'
  if (SPECIAL.has(id)) return 'special'
  return 'parts'
}

const cache = new Map()
export function itemCategory(id) {
  if (!cache.has(id)) cache.set(id, ITEMS[id] ? categoryOf(ITEMS[id]) : 'parts')
  return cache.get(id)
}
export const groupOf = cat => CATEGORY_GROUPS.find(g => g.cats.includes(cat))

// Where a material is used: the actions that take it as an ingredient
const usesCache = new Map()
export function usesOf(id) {
  if (!usesCache.has(id)) {
    const out = []
    for (const [skill, list] of Object.entries(ACTIONS)) for (const a of list) if (a.in[id]) out.push({ skill, action: a })
    usesCache.set(id, out)
  }
  return usesCache.get(id)
}
