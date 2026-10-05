import { ITEMS, METALS, PIECES, WOODS, FISH, POTIONS, RUNES, GEMS } from './items.js'
import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'

/*
  Skill action:
  { id, icon, tint, lvl, xp, time, in: {}, out: {}, group?, mat?, tool?,
    burn?: true                          -> can be burnt (cooking)
    extra?: [{ item, chance, qty }]      -> bonus random loot
    gold?: [min, max]                    -> coins (thieving)
    fail?: { dmg: [a, b] }               -> level-based failure chance (thieving)
    runeMult?: true                      -> extra runes with level (runecrafting) }
  `group` and `mat` hold translation keys used by the filters.
  Names come from `nameKey`/`nameFn`, otherwise from the produced item ("Iron bar ×15").
*/
export const ACTIONS = {}
const add = (skill, a) => (ACTIONS[skill] ||= []).push({ in: {}, out: {}, ...a })

/* ---------- Mining ---------- */
const GEM_DROPS = [
  { item: 'uncut_sapphire', chance: 1 / 250, qty: [1, 1] },
  { item: 'uncut_emerald', chance: 1 / 500, qty: [1, 1] },
  { item: 'uncut_ruby', chance: 1 / 1000, qty: [1, 1] },
  { item: 'uncut_diamond', chance: 1 / 2500, qty: [1, 1] },
]
;[
  ['copper_ore', 1, 17.5, 3, 1], ['tin_ore', 1, 17.5, 3, 1], ['rune_essence', 1, 5, 2.4, 1], ['iron_ore', 15, 35, 3.5, 1],
  ['coal', 30, 50, 4.5, 2], ['gold_ore', 40, 65, 5, 2], ['mithril_ore', 55, 80, 5.5, 3], ['adamantite_ore', 70, 95, 6.5, 4],
  ['runite_ore', 85, 145, 8, 5], ['aetherium_ore', 92, 195, 9, 6],
].forEach(([id, lvl, xp, time, tier]) => add('mining', {
  id, nameKey: `nodes.${id}`, icon: ITEMS[id].icon, tint: ITEMS[id].tint, lvl, xp, time, out: { [id]: 1 }, extra: GEM_DROPS, tool: { type: 'pickaxe', tier },
}))

/* ---------- Woodcutting ---------- */
WOODS.forEach((w, i) => add('woodcutting', {
  id: w.id, nameFn: () => (w.tree === 'normal' ? t('nodes.tree') : t('tpl.wood.tree', { wood: t(`woods.${w.tree}`) })),
  icon: w.id === 'magic_logs' ? 'evil-tree' : w.lvl >= 30 && w.lvl < 45 ? 'willow-tree' : 'pine-tree',
  tint: w.tint, lvl: w.lvl, xp: w.xp, time: w.time, out: { [w.id]: 1 },
  extra: [{ item: 'bird_nest', chance: 1 / 120, qty: [1, 1] }], tool: { type: 'axe', tier: [1, 1, 2, 3, 4, 5][i] },
}))

/* ---------- Fishing ---------- */
FISH.forEach((f, i) => add('fishing', {
  id: 'raw_' + f.id, nameKey: `fish.${f.id}`, icon: f.icon, tint: '#4a8fbf', lvl: f.lvl, xp: f.xp, time: f.time, out: { ['raw_' + f.id]: 1 },
  tool: { type: 'rod', tier: [1, 1, 2, 2, 3, 4, 5][i] },
}))

/* ---------- Farming uses real-time plots (see engine) ---------- */

/* ---------- Thieving ---------- */
;[
  { id: 'man',     icon: 'hooded-figure',  lvl: 1,  xp: 8,    time: 2.5, gold: [3, 8],     dmg: [1, 1], extra: [] },
  { id: 'farmer',  icon: 'farmer',         lvl: 10, xp: 14.5, time: 2.8, gold: [5, 12],    dmg: [1, 2], extra: [
    { item: 'potato_seed', chance: 0.25, qty: [1, 3] }, { item: 'onion_seed', chance: 0.18, qty: [1, 2] }, { item: 'tomato_seed', chance: 0.12, qty: [1, 2] },
    { item: 'guam_seed', chance: 0.08, qty: [1, 1] }, { item: 'marrentill_seed', chance: 0.05, qty: [1, 1] }] },
  { id: 'warrior', icon: 'barbarian',      lvl: 25, xp: 26,   time: 3,   gold: [15, 30],   dmg: [1, 3], extra: [{ item: 'iron_bar', chance: 0.05, qty: [1, 1] }] },
  { id: 'rogue',   icon: 'hood',           lvl: 32, xp: 36,   time: 3,   gold: [20, 50],   dmg: [2, 4], extra: [{ item: 'coin_pouch', chance: 0.04, qty: [1, 1] }] },
  { id: 'mfarmer', icon: 'farmer',         lvl: 38, xp: 43,   time: 3,   gold: [10, 20],   dmg: [2, 4], extra: [
    { item: 'tarromin_seed', chance: 0.12, qty: [1, 2] }, { item: 'harralander_seed', chance: 0.09, qty: [1, 1] }, { item: 'strawberry_seed', chance: 0.1, qty: [1, 2] },
    { item: 'ranarr_seed', chance: 0.05, qty: [1, 1] }, { item: 'irit_seed', chance: 0.035, qty: [1, 1] }, { item: 'kwuarm_seed', chance: 0.025, qty: [1, 1] },
    { item: 'snapdragon_seed', chance: 0.015, qty: [1, 1] }, { item: 'torstol_seed', chance: 0.006, qty: [1, 1] }] },
  { id: 'guard',   icon: 'guards',         lvl: 40, xp: 46,   time: 3.2, gold: [30, 60],   dmg: [2, 5], extra: [{ item: 'steel_bar', chance: 0.05, qty: [1, 1] }] },
  { id: 'knight',  icon: 'mounted-knight', lvl: 55, xp: 84,   time: 3.5, gold: [50, 100],  dmg: [3, 6], extra: [{ item: 'chaos_rune', chance: 0.1, qty: [2, 6] }] },
  { id: 'paladin', icon: 'holy-symbol',    lvl: 70, xp: 151,  time: 3.8, gold: [80, 160],  dmg: [3, 7], extra: [{ item: 'death_rune', chance: 0.08, qty: [1, 4] }, { item: 'uncut_ruby', chance: 0.01, qty: [1, 1] }] },
  { id: 'hero',    icon: 'laurel-crown',   lvl: 80, xp: 273,  time: 4,   gold: [200, 320], dmg: [4, 9], extra: [{ item: 'blood_rune', chance: 0.06, qty: [1, 3] }, { item: 'uncut_diamond', chance: 0.008, qty: [1, 1] }, { item: 'gem_chest', chance: 0.004, qty: [1, 1] }] },
].forEach(v => add('thieving', {
  id: v.id, nameKey: `marks.${v.id}`, icon: v.icon, tint: '#9d79bc', lvl: v.lvl, xp: v.xp, time: v.time, gold: v.gold, fail: { dmg: v.dmg }, extra: v.extra,
}))

/* ---------- Smithing ---------- */
METALS.forEach(m => add('smithing', {
  id: m.id + '_bar', icon: 'metal-bar', tint: m.tint, group: 'groups.smelting', lvl: m.lvl, xp: m.xp, time: 2.5,
  in: { ...m.ore }, out: { [m.id + '_bar']: 1 },
}))
add('smithing', { id: 'gold_bar', icon: 'gold-bar', tint: '#e3b23c', group: 'groups.smelting', lvl: 40, xp: 22.5, time: 2.5, in: { gold_ore: 1 }, out: { gold_bar: 1 } })
METALS.forEach(m => {
  add('smithing', {
    id: m.id + '_arrowtips', icon: 'arrowhead', tint: m.tint, group: 'groups.forging', lvl: m.lvl + 4, xp: m.xp, time: 2.5,
    in: { [m.id + '_bar']: 1 }, out: { [m.id + '_arrowtips']: 15 },
  })
  ;['pickaxe', 'axe'].forEach(tool => add('smithing', {
    id: m.id + '_' + tool, icon: ITEMS[m.id + '_' + tool].icon, tint: m.tint, group: 'groups.tools',
    lvl: Math.min(99, m.lvl + 1), xp: Math.round(m.xp * 4), time: 3, in: { [m.id + '_bar']: 2 }, out: { [m.id + '_' + tool]: 1 },
  }))
  PIECES.forEach(p => add('smithing', {
    id: m.id + '_' + p.id, icon: p.icon, tint: m.tint, group: 'groups.forging',
    lvl: Math.min(99, m.lvl + p.lvlOff), xp: Math.round(m.xp * p.bars * 2), time: 3,
    in: { [m.id + '_bar']: p.bars }, out: { [m.id + '_' + p.id]: 1 },
  }))
})
{
  const order = { 'groups.smelting': 0, 'groups.tools': 1, 'groups.forging': 2 }
  ACTIONS.smithing.sort((a, b) => order[a.group] - order[b.group] || a.lvl - b.lvl)
}

/* ---------- Cooking ---------- */
FISH.forEach(f => add('cooking', {
  id: f.id, icon: f.icon, tint: '#e08a3a', group: 'groups.fish', lvl: f.cookLvl, xp: f.cookXp, time: 2.4,
  in: { ['raw_' + f.id]: 1 }, out: { [f.id]: 1 }, burn: true,
}))
add('cooking', { id: 'baked_potato', icon: 'potato', tint: '#d9a35b', group: 'groups.dishes', lvl: 7, xp: 45, time: 2.4, in: { potato: 1 }, out: { baked_potato: 1 }, burn: true })
add('cooking', { id: 'stew', icon: 'cooking-pot', tint: '#c76b3a', group: 'groups.dishes', lvl: 25, xp: 117, time: 3, in: { potato: 1, onion: 1, tomato: 1 }, out: { stew: 1 }, burn: true })
add('cooking', { id: 'strawberry_pie', icon: 'bread', tint: '#ff7a8a', group: 'groups.dishes', lvl: 60, xp: 190, time: 3.2, in: { strawberry: 3, potato: 1 }, out: { strawberry_pie: 1 }, burn: true })

/* ---------- Firemaking ---------- */
WOODS.forEach(w => add('firemaking', {
  id: 'burn_' + w.id, nameFn: () => t('tpl.burn', { item: ITEMS[w.id].name }), icon: 'campfire', tint: w.tint, lvl: w.fm, xp: w.burnXp, time: 2,
  in: { [w.id]: 1 }, extra: [{ item: 'ashes', chance: 0.6, qty: [1, 1] }],
}))

/* ---------- Fletching ---------- */
add('fletching', { id: 'arrow_shaft', icon: 'wood-stick', tint: '#a07845', group: 'groups.arrows', lvl: 1, xp: 5, time: 2, in: { logs: 1 }, out: { arrow_shaft: 15 } })
add('fletching', { id: 'headless_arrow', icon: 'arrow-flights', tint: '#d8c7a0', group: 'groups.arrows', lvl: 1, xp: 15, time: 2.4, in: { arrow_shaft: 15, feathers: 15 }, out: { headless_arrow: 15 } })
METALS.forEach((m, i) => add('fletching', {
  id: m.id + '_arrow', icon: 'arrow-flights', tint: m.tint, group: 'groups.arrows',
  lvl: [1, 15, 30, 45, 60, 75, 90][i], xp: [20, 38, 75, 112, 150, 187, 225][i], time: 2.4,
  in: { headless_arrow: 15, [m.id + '_arrowtips']: 15 }, out: { [m.id + '_arrow']: 15 },
}))
WOODS.forEach(w => add('fletching', {
  id: w.id.replace('logs', 'bow'), icon: 'pocket-bow', tint: w.tint, group: 'groups.bows',
  lvl: w.bow.lvl, xp: w.bow.xp, time: 3, in: { [w.id]: 1 }, out: { [w.id.replace('logs', 'bow')]: 1 },
}))
WOODS.forEach((w, i) => add('fletching', {
  id: w.id.replace('logs', 'rod'), icon: 'fishing-pole', tint: w.tint, group: 'groups.rods',
  lvl: [1, 12, 25, 38, 52, 68][i], xp: Math.round(w.bow.xp * 1.5), time: 3, in: { [w.id]: 2 }, out: { [w.id.replace('logs', 'rod')]: 1 },
}))

/* ---------- Crafting ---------- */
add('crafting', { id: 'leather', nameKey: 'recipes.tanLeather', icon: 'animal-hide', tint: '#a0703a', group: 'groups.leather', lvl: 1, xp: 10, time: 2, in: { cowhide: 1 }, out: { leather: 1 } })
add('crafting', { id: 'leather_coif', icon: 'hood', tint: '#a0703a', group: 'groups.leather', lvl: 9, xp: 37, time: 3, in: { leather: 1 }, out: { leather_coif: 1 } })
add('crafting', { id: 'leather_chaps', icon: 'armored-pants', tint: '#a0703a', group: 'groups.leather', lvl: 18, xp: 54, time: 3, in: { leather: 2 }, out: { leather_chaps: 1 } })
add('crafting', { id: 'leather_body', icon: 'leather-vest', tint: '#a0703a', group: 'groups.leather', lvl: 14, xp: 50, time: 3, in: { leather: 2 }, out: { leather_body: 1 } })
add('crafting', { id: 'green_dleather', nameKey: 'recipes.tanDragonhide', icon: 'animal-hide', tint: '#3aa86a', group: 'groups.leather', lvl: 55, xp: 40, time: 2.4, in: { green_dhide: 1 }, out: { green_dleather: 1 } })
add('crafting', { id: 'dhide_chaps', icon: 'armored-pants', tint: '#3aa86a', group: 'groups.leather', lvl: 60, xp: 124, time: 3.5, in: { green_dleather: 2 }, out: { dhide_chaps: 1 } })
add('crafting', { id: 'dhide_body', icon: 'leather-armor', tint: '#3aa86a', group: 'groups.leather', lvl: 63, xp: 186, time: 3.5, in: { green_dleather: 3 }, out: { dhide_body: 1 } })
add('crafting', { id: 'gold_amulet', icon: 'necklace', tint: '#e3b23c', group: 'groups.jewellery', lvl: 8, xp: 30, time: 3, in: { gold_bar: 1 }, out: { gold_amulet: 1 } })
GEMS.forEach(g => {
  add('crafting', { id: 'cut_' + g.id, nameFn: () => t('tpl.cut', { gem: t(`gems.${g.id}`) }), icon: 'cut-diamond', tint: g.tint, group: 'groups.jewellery', lvl: g.cutLvl, xp: g.cutXp, time: 2.4, in: { ['uncut_' + g.id]: 1 }, out: { [g.id]: 1 } })
  add('crafting', { id: g.id + '_amulet', icon: 'gem-pendant', tint: g.tint, group: 'groups.jewellery', lvl: g.amLvl, xp: g.amXp, time: 3, in: { gold_bar: 1, [g.id]: 1 }, out: { [g.id + '_amulet']: 1 } })
})
WOODS.filter(w => w.staff).forEach(w => add('crafting', {
  id: w.id.replace('logs', 'staff'), icon: 'wizard-staff', tint: w.tint, group: 'groups.staves',
  lvl: w.staff.lvl, xp: w.staff.xp, time: 3.5, in: { [w.id]: 2, air_rune: 10 }, out: { [w.id.replace('logs', 'staff')]: 1 },
}))
{
  const order = { 'groups.leather': 0, 'groups.jewellery': 1, 'groups.staves': 2 }
  ACTIONS.crafting.sort((a, b) => order[a.group] - order[b.group] || a.lvl - b.lvl)
}

/* ---------- Herblore ---------- */
POTIONS.forEach(p => add('herblore', {
  id: p.id, icon: 'round-potion', tint: p.tint, lvl: p.lvl, xp: p.xp, time: 2.4,
  in: { [p.herb]: 1, vial_water: 1 }, out: { [p.id]: 1 },
}))
add('herblore', { id: 'compost', icon: 'fertilizer-bag', tint: '#6b8a3a', lvl: 5, xp: 20, time: 2.4, in: { ashes: 2, potato: 1 }, out: { compost: 1 } })
ACTIONS.herblore.sort((a, b) => a.lvl - b.lvl)

/* ---------- Runecrafting ---------- */
RUNES.forEach(r => add('runecrafting', {
  id: r.id, icon: r.icon, tint: r.tint, lvl: r.lvl, xp: r.xp, time: 1.8, in: { rune_essence: 1 }, out: { [r.id]: 1 }, runeMult: true,
}))

/* ---------- Prayer ---------- */
;[['bones', 4.5], ['big_bones', 15], ['dragon_bones', 72], ['demon_ashes', 110]].forEach(([id, xp], i) => add('prayer', {
  id: 'bury_' + id, nameFn: () => t(id === 'demon_ashes' ? 'tpl.scatter' : 'tpl.bury', { item: ITEMS[id].name }),
  icon: ITEMS[id].icon, tint: ITEMS[id].tint, lvl: [1, 1, 1, 30][i], xp, time: 1.5, in: { [id]: 1 },
}))

/* ---------- Agility ---------- */
;[[1, 100, 30], [15, 180, 34], [30, 310, 38], [45, 500, 42], [60, 740, 48], [75, 1080, 54], [90, 1450, 58]].forEach(([lvl, xp, time], i) => add('agility', {
  id: 'course_' + i, nameKey: `courses.${i}`, icon: i < 2 ? 'run' : 'sprint', tint: '#4ecdc4', lvl, xp, time,
  extra: [{ item: 'mark_of_grace', chance: 0.04 + i * 0.01, qty: [1, 1] }],
}))

/* ---------- Material tag for each recipe (used by the skill filters) ---------- */
;['smithing', 'fletching', 'crafting', 'firemaking'].forEach(sk => ACTIONS[sk].forEach(a => {
  const id = a.id.replace(/^(burn_|cut_)/, '')
  const metal = METALS.find(m => id.startsWith(m.id + '_'))
  const wood = WOODS.find(w => w.id !== 'logs' && (id === w.id || id.startsWith(w.id.replace('_logs', '') + '_')))
  const gem = GEMS.find(g => id === g.id || id.startsWith(g.id + '_'))
  if (metal) a.mat = `mats.${metal.id}`
  else if (id.startsWith('gold')) a.mat = 'mats.gold'
  else if (wood) a.mat = `woods.${wood.tree}`
  else if (['logs', 'bow', 'rod', 'arrow_shaft'].includes(id)) a.mat = 'woods.normal'
  else if (gem) a.mat = `gems.${gem.id}`
  else if (/leather|dhide|coif|chaps/.test(id)) a.mat = 'mats.leather'
}))

/* ---------- Localized names ---------- */
Object.values(ACTIONS).flat().forEach(a => {
  const { nameKey, nameFn } = a
  delete a.nameKey
  delete a.nameFn
  named(a, nameFn || nameKey || (() => {
    const [item, qty] = Object.entries(a.out)[0]
    return qty > 1 ? `${ITEMS[item].name} ×${qty}` : ITEMS[item].name
  }))
})

export const findAction = (skill, id) => (ACTIONS[skill] || []).find(a => a.id === id)
