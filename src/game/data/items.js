import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'

// type: resource | food | equip | potion | seed | rune | junk | chest | tool
export const ITEMS = {}
const def = (id, d) => (ITEMS[id] = { id, type: 'resource', value: 1, tint: '#8a8a8a', ...d })

export const SLOTS = {
  head:   { icon: 'light-helm' },
  cape:   { icon: 'cape' },
  amulet: { icon: 'gem-pendant' },
  weapon: { icon: 'broadsword' },
  body:   { icon: 'breastplate' },
  shield: { icon: 'checked-shield' },
  legs:   { icon: 'armored-pants' },
  ammo:   { icon: 'quiver' },
}
Object.keys(SLOTS).forEach(k => named(SLOTS[k], `slots.${k}`))

export const STAT_LABELS = {}
;['atk', 'str', 'def', 'rAtk', 'rStr', 'mAtk', 'mDmg'].forEach(k => Object.defineProperty(STAT_LABELS, k, { get: () => t(`stats.${k}`), enumerable: true }))

/* ---------------- Ores and bars ---------------- */
def('copper_ore',     { icon: 'ore', value: 2,   tint: '#b87333' })
def('tin_ore',        { icon: 'ore', value: 2,   tint: '#a8a9ad' })
def('rune_essence',   { icon: 'crystal-cluster', value: 3, tint: '#b8b5d6' })
def('iron_ore',       { icon: 'ore', value: 8,   tint: '#8b5a4a' })
def('coal',           { icon: 'stone-pile', value: 12, tint: '#3a3a3a' })
def('gold_ore',       { icon: 'gold-nuggets', value: 40, tint: '#e3b23c' })
def('mithril_ore',    { icon: 'ore', value: 30,  tint: '#4c5fd5' })
def('adamantite_ore', { icon: 'ore', value: 60,  tint: '#3e8e5e' })
def('runite_ore',     { icon: 'ore', value: 150, tint: '#3fb6c6' })
def('aetherium_ore',  { icon: 'ore', value: 400, tint: '#c58cff' })
def('gold_bar',       { icon: 'gold-bar', value: 90, tint: '#e3b23c' })

export const METALS = [
  { id: 'bronze',  lvl: 1,  ore: { copper_ore: 1, tin_ore: 1 },  xp: 6,  tint: '#cd7f32', req: 1,  arrowStr: 7 },
  { id: 'iron',    lvl: 15, ore: { iron_ore: 1 },                xp: 12, tint: '#9a9a9a', req: 10, arrowStr: 10 },
  { id: 'steel',   lvl: 30, ore: { iron_ore: 1, coal: 2 },       xp: 18, tint: '#c8ccd2', req: 20, arrowStr: 16 },
  { id: 'mithril', lvl: 50, ore: { mithril_ore: 1, coal: 4 },    xp: 30, tint: '#5b6ee1', req: 30, arrowStr: 22 },
  { id: 'adamant', lvl: 70, ore: { adamantite_ore: 1, coal: 6 }, xp: 38, tint: '#3e9e6a', req: 40, arrowStr: 31 },
  { id: 'rune',    lvl: 85, ore: { runite_ore: 1, coal: 8 },     xp: 50, tint: '#3fb6c6', req: 50, arrowStr: 49 },
  // Endgame metal: forged from ore found beyond the Abyss; its gear hits harder than its tier suggests
  { id: 'aether',  lvl: 90, ore: { aetherium_ore: 1, coal: 10 }, xp: 70, tint: '#c58cff', req: 90, arrowStr: 64, power: 9 },
]

export const PIECES = [
  { id: 'sword',  icon: 'broadsword',      slot: 'weapon', bars: 1, lvlOff: 2, stats: tier => ({ atk: 7 * tier, str: 6 * tier }), reqSkill: 'attack' },
  { id: 'helm',   icon: 'heavy-helm',      slot: 'head',   bars: 1, lvlOff: 3, stats: tier => ({ def: 3 * tier }),               reqSkill: 'defense' },
  { id: 'shield', icon: 'bordered-shield', slot: 'shield', bars: 2, lvlOff: 6, stats: tier => ({ def: 5 * tier }),               reqSkill: 'defense' },
  { id: 'legs',   icon: 'armored-pants',   slot: 'legs',   bars: 2, lvlOff: 7, stats: tier => ({ def: 6 * tier }),               reqSkill: 'defense' },
  { id: 'body',   icon: 'breastplate',     slot: 'body',   bars: 3, lvlOff: 9, stats: tier => ({ def: 9 * tier }),               reqSkill: 'defense' },
]

// "<material> <thing>" names come from a template so word order can differ per language
const made = (thing, mat) => () => t('tpl.made', { thing: t(`things.${thing}`), mat: t(`mats.${mat}`) })

METALS.forEach((m, i) => {
  const tier = i + 1
  const oreValue = Object.entries(m.ore).reduce((s, [k, q]) => s + ITEMS[k].value * q, 0)
  m.tier = tier
  m.barValue = Math.round(oreValue * 1.4) + 2
  named(m, `mats.${m.id}`)
  def(m.id + '_bar', { icon: 'metal-bar', value: m.barValue, tint: m.tint, name: made('bar', m.id) })
  PIECES.forEach(p => def(m.id + '_' + p.id, {
    icon: p.icon, type: 'equip', slot: p.slot, style: 'melee', name: made(p.id, m.id),
    value: Math.round(m.barValue * p.bars * 1.6), tint: m.tint, stats: p.stats(m.power || tier), req: { [p.reqSkill]: m.req },
  }))
  def(m.id + '_pickaxe', { icon: 'war-pick', type: 'tool', toolType: 'pickaxe', tier, value: m.barValue * 2 + 10, tint: m.tint, req: { mining: m.req }, name: made('pickaxe', m.id) })
  def(m.id + '_axe', { icon: 'wood-axe', type: 'tool', toolType: 'axe', tier, value: m.barValue * 2 + 10, tint: m.tint, req: { woodcutting: m.req }, name: made('axe', m.id) })
  def(m.id + '_arrowtips', { icon: 'arrowhead', value: Math.ceil(m.barValue / 12), tint: m.tint, name: made('arrowtips', m.id) })
  def(m.id + '_arrow', {
    icon: 'arrow-flights', type: 'equip', slot: 'ammo', value: Math.ceil(m.barValue / 8) + 1, name: made('arrow', m.id),
    tint: m.tint, stats: { rStr: m.arrowStr }, req: { ranged: m.req }, stackEquip: true,
  })
})

/* ---------------- Wood, bows, staves and rods ---------------- */
export const WOODS = [
  { id: 'logs',        tree: 'normal', lvl: 1,  xp: 25,   time: 3,   value: 2,   tint: '#8b6b4a', burnXp: 40,    fm: 1,  bow: { lvl: 1,  xp: 10, rAtk: 8,  req: 1 },  staff: null },
  { id: 'oak_logs',    tree: 'oak',    lvl: 15, xp: 37.5, time: 4,   value: 6,   tint: '#a07845', burnXp: 60,    fm: 15, bow: { lvl: 20, xp: 25, rAtk: 14, req: 10 }, staff: { lvl: 10, xp: 30, mAtk: 10, mDmg: 0.05, req: 10 } },
  { id: 'willow_logs', tree: 'willow', lvl: 30, xp: 67.5, time: 4.5, value: 12,  tint: '#8f9a55', burnXp: 90,    fm: 30, bow: { lvl: 35, xp: 41, rAtk: 20, req: 20 }, staff: { lvl: 25, xp: 55, mAtk: 16, mDmg: 0.08, req: 20 } },
  { id: 'maple_logs',  tree: 'maple',  lvl: 45, xp: 100,  time: 5,   value: 25,  tint: '#c0632f', burnXp: 135,   fm: 45, bow: { lvl: 50, xp: 58, rAtk: 29, req: 30 }, staff: { lvl: 40, xp: 85, mAtk: 22, mDmg: 0.11, req: 30 } },
  { id: 'yew_logs',    tree: 'yew',    lvl: 60, xp: 175,  time: 6.5, value: 60,  tint: '#7a4b35', burnXp: 202.5, fm: 60, bow: { lvl: 65, xp: 75, rAtk: 47, req: 40 }, staff: { lvl: 55, xp: 120, mAtk: 30, mDmg: 0.15, req: 40 } },
  { id: 'magic_logs',  tree: 'magic',  lvl: 75, xp: 250,  time: 8,   value: 150, tint: '#8a6fe0', burnXp: 303.8, fm: 75, bow: { lvl: 80, xp: 91, rAtk: 69, req: 50 }, staff: { lvl: 70, xp: 160, mAtk: 42, mDmg: 0.2, req: 50 } },
]
WOODS.forEach((w, i) => {
  named(w, `woods.${w.tree}`)
  const woodName = thing => () => t(`tpl.wood.${thing}`, { wood: t(`woods.${w.tree}`) })
  const plain = w.tree === 'normal'
  def(w.id, { icon: 'log', value: w.value, tint: w.tint, name: plain ? 'items.logs' : woodName('logs') })
  def(w.id.replace('logs', 'rod'), {
    icon: 'fishing-pole', type: 'tool', toolType: 'rod', tier: i + 1, value: w.value * 3 + 8, tint: w.tint,
    req: { fishing: [1, 10, 20, 30, 40, 50][i] }, name: plain ? 'items.rod' : woodName('rod'),
  })
  def(w.id.replace('logs', 'bow'), {
    icon: 'pocket-bow', type: 'equip', slot: 'weapon', style: 'ranged', twoHanded: true, name: plain ? 'items.bow' : woodName('bow'),
    value: w.value * 3 + 10, tint: w.tint, stats: { rAtk: w.bow.rAtk }, req: { ranged: w.bow.req },
  })
  if (w.staff) def(w.id.replace('logs', 'staff'), {
    icon: 'wizard-staff', type: 'equip', slot: 'weapon', style: 'magic', twoHanded: true, name: woodName('staff'),
    value: w.value * 4 + 20, tint: w.tint, stats: { mAtk: w.staff.mAtk, mDmg: w.staff.mDmg }, req: { magic: w.staff.req },
  })
})
def('ashes',          { icon: 'powder-bag', value: 2, tint: '#7a7470' })
def('compost',        { icon: 'fertilizer-bag', value: 15, tint: '#6b8a3a', hasDesc: true })
def('arrow_shaft',    { icon: 'wood-stick', value: 1, tint: '#a07845' })
def('headless_arrow', { icon: 'arrow-flights', value: 1, tint: '#d8c7a0' })
def('bird_nest',      { icon: 'nest-eggs', value: 30, tint: '#9c7b4f', type: 'chest' })

/* ---------------- Fish and food ---------------- */
export const FISH = [
  { id: 'shrimp',    icon: 'shrimp',        lvl: 1,  xp: 10,  time: 3,   value: 2,   heal: 3,  cookLvl: 1,  cookXp: 30 },
  { id: 'sardine',   icon: 'flatfish',      lvl: 5,  xp: 20,  time: 3.2, value: 4,   heal: 4,  cookLvl: 5,  cookXp: 40 },
  { id: 'trout',     icon: 'circling-fish', lvl: 20, xp: 50,  time: 4,   value: 10,  heal: 7,  cookLvl: 15, cookXp: 70 },
  { id: 'salmon',    icon: 'double-fish',   lvl: 30, xp: 70,  time: 4.5, value: 16,  heal: 9,  cookLvl: 25, cookXp: 90 },
  { id: 'lobster',   icon: 'crab-claw',     lvl: 40, xp: 90,  time: 5,   value: 30,  heal: 12, cookLvl: 40, cookXp: 120 },
  { id: 'swordfish', icon: 'angler-fish',   lvl: 50, xp: 125, time: 6,   value: 50,  heal: 14, cookLvl: 45, cookXp: 140 },
  { id: 'shark',     icon: 'shark-fin',     lvl: 76, xp: 175, time: 7,   value: 100, heal: 20, cookLvl: 80, cookXp: 210 },
]
FISH.forEach(f => {
  named(f, `fish.${f.id}`)
  def('raw_' + f.id, { icon: f.icon, value: f.value, tint: '#4a8fbf', name: () => t('tpl.raw', { fish: t(`fish.${f.id}`) }) })
  def(f.id, { icon: f.icon, value: Math.round(f.value * 1.6), tint: '#e08a3a', type: 'food', heal: f.heal, name: () => t('tpl.cooked', { fish: t(`fish.${f.id}`) }) })
})
def('burnt_food', { icon: 'fishbone', value: 0, tint: '#4a3a30', type: 'junk' })

/* ---------------- Farming ---------------- */
export const CROPS = [
  { id: 'potato',      icon: 'potato',       lvl: 1,  xp: 32,  yield: [3, 6], value: 3,   tint: '#c9a66b', seedValue: 4 },
  { id: 'onion',       icon: 'carrot',       lvl: 5,  xp: 42,  yield: [3, 6], value: 5,   tint: '#e0b46a', seedValue: 8 },
  { id: 'guam',        icon: 'herbs-bundle', lvl: 9,  xp: 55,  yield: [2, 5], value: 12,  tint: '#6fbf4a', seedValue: 25, herb: true },
  { id: 'tomato',      icon: 'tomato',       lvl: 12, xp: 60,  yield: [3, 7], value: 8,   tint: '#e24a3b', seedValue: 15 },
  { id: 'marrentill',  icon: 'herbs-bundle', lvl: 14, xp: 72,  yield: [2, 5], value: 18,  tint: '#4aa86f', seedValue: 40, herb: true },
  { id: 'tarromin',    icon: 'herbs-bundle', lvl: 19, xp: 90,  yield: [2, 5], value: 26,  tint: '#3f9e8a', seedValue: 70, herb: true },
  { id: 'harralander', icon: 'herbs-bundle', lvl: 26, xp: 120, yield: [2, 5], value: 40,  tint: '#8bbf3a', seedValue: 110, herb: true },
  { id: 'strawberry',  icon: 'strawberry',   lvl: 31, xp: 140, yield: [4, 8], value: 14,  tint: '#ff4d6d', seedValue: 60, food: 5 },
  { id: 'ranarr',      icon: 'herbs-bundle', lvl: 32, xp: 160, yield: [2, 4], value: 70,  tint: '#2f9e5a', seedValue: 200, herb: true },
  { id: 'irit',        icon: 'herbs-bundle', lvl: 44, xp: 230, yield: [2, 4], value: 95,  tint: '#c4b13a', seedValue: 300, herb: true },
  { id: 'kwuarm',      icon: 'herbs-bundle', lvl: 56, xp: 320, yield: [2, 4], value: 130, tint: '#7a9e3a', seedValue: 420, herb: true },
  { id: 'snapdragon',  icon: 'herbs-bundle', lvl: 62, xp: 420, yield: [2, 4], value: 180, tint: '#e0703a', seedValue: 600, herb: true },
  { id: 'torstol',     icon: 'herbs-bundle', lvl: 85, xp: 700, yield: [2, 4], value: 350, tint: '#b04ae0', seedValue: 1200, herb: true },
]
// Real-time growth per plot (seconds)
const GROW = { potato: 180, onion: 240, guam: 300, tomato: 360, marrentill: 420, tarromin: 540, harralander: 720, strawberry: 600, ranarr: 900, irit: 1200, kwuarm: 1500, snapdragon: 1800, torstol: 2700 }
CROPS.forEach(c => {
  c.grow = GROW[c.id]
  // Higher crops grow slowly, so their harvest pays more per point of base XP
  c.harvestXp = Math.round(c.xp * (3 + c.lvl / 10))
  named(c, `crops.${c.id}`)
  def(c.id + '_seed', { icon: 'plant-seed', value: c.seedValue, tint: c.tint, type: 'seed', name: () => t('tpl.seed', { crop: t(`crops.${c.id}`) }) })
  def(c.id, { icon: c.icon, value: c.value, tint: c.tint, name: `crops.${c.id}`, ...(c.food ? { type: 'food', heal: c.food } : {}) })
})
def('baked_potato',   { icon: 'potato',      value: 12,  tint: '#d9a35b', type: 'food', heal: 6 })
def('stew',           { icon: 'cooking-pot', value: 40,  tint: '#c76b3a', type: 'food', heal: 11 })
def('strawberry_pie', { icon: 'bread',       value: 110, tint: '#ff7a8a', type: 'food', heal: 16 })

/* ---------------- Herblore ---------------- */
def('vial_water', { icon: 'vial', value: 4, tint: '#7fb7e6' })
export const POTIONS = [
  { id: 'attack_potion',   herb: 'guam',        lvl: 1,  xp: 25,  buff: { attack: [3, 0.10] },   tint: '#4a7fe0' },
  { id: 'defense_potion',  herb: 'marrentill',  lvl: 8,  xp: 45,  buff: { defense: [3, 0.10] },  tint: '#5ac0c0' },
  { id: 'strength_potion', herb: 'tarromin',    lvl: 12, xp: 50,  buff: { strength: [3, 0.10] }, tint: '#e0a03a' },
  { id: 'ranging_potion',  herb: 'harralander', lvl: 22, xp: 70,  buff: { ranged: [4, 0.10] },   tint: '#6fbf4a' },
  { id: 'magic_potion',    herb: 'ranarr',      lvl: 30, xp: 90,  buff: { magic: [4, 0.10] },    tint: '#a06fe0' },
  { id: 'super_attack',    herb: 'irit',        lvl: 45, xp: 100, buff: { attack: [5, 0.15] },   tint: '#3a5fe0' },
  { id: 'super_strength',  herb: 'kwuarm',      lvl: 55, xp: 125, buff: { strength: [5, 0.15] }, tint: '#e0703a' },
  { id: 'super_defense',   herb: 'snapdragon',  lvl: 66, xp: 150, buff: { defense: [5, 0.15] },  tint: '#3ab0b0' },
  { id: 'overload',        herb: 'torstol',     lvl: 80, xp: 250, buff: { attack: [5, 0.15], strength: [5, 0.15], defense: [5, 0.15], ranged: [5, 0.15], magic: [5, 0.15] }, tint: '#e03a5f' },
]
export const POTION_DURATION = 300
POTIONS.forEach(p => def(p.id, { icon: 'round-potion', value: Math.round(ITEMS[p.herb].value * 1.8 + 6), tint: p.tint, type: 'potion', buff: p.buff }))

/* ---------------- Runes ---------------- */
export const RUNES = [
  { id: 'air_rune',    lvl: 1,  xp: 5,    value: 4,   tint: '#cfe3f0', icon: 'tornado' },
  { id: 'mind_rune',   lvl: 2,  xp: 5.5,  value: 4,   tint: '#e0a050', icon: 'all-seeing-eye' },
  { id: 'water_rune',  lvl: 5,  xp: 6,    value: 5,   tint: '#4a90e2', icon: 'water-drop' },
  { id: 'earth_rune',  lvl: 9,  xp: 6.5,  value: 5,   tint: '#8b6b3a', icon: 'earth-crack' },
  { id: 'fire_rune',   lvl: 14, xp: 7,    value: 6,   tint: '#e8572a', icon: 'fire' },
  { id: 'chaos_rune',  lvl: 35, xp: 12,  value: 40,  tint: '#e0a030', icon: 'magic-swirl' },
  { id: 'nature_rune', lvl: 44, xp: 16,   value: 90,  tint: '#3aa05a', icon: 'sprout' },
  { id: 'death_rune',  lvl: 65, xp: 27,   value: 180, tint: '#d0d0d0', icon: 'death-skull' },
  { id: 'blood_rune',  lvl: 77, xp: 42,   value: 300, tint: '#c0102a', icon: 'blood' },
]
RUNES.forEach(r => def(r.id, { icon: r.icon, value: r.value, tint: r.tint, type: 'rune' }))

/* ---------------- Crafting ---------------- */
def('cowhide',        { icon: 'animal-hide', value: 5,   tint: '#7a5230' })
def('leather',        { icon: 'animal-hide', value: 12,  tint: '#a0703a' })
def('green_dhide',    { icon: 'animal-hide', value: 220, tint: '#2e8b57' })
def('green_dleather', { icon: 'animal-hide', value: 300, tint: '#3aa86a' })
def('leather_coif',   { icon: 'hood',          type: 'equip', slot: 'head', style: 'ranged', value: 30,   tint: '#a0703a', stats: { def: 3, rAtk: 2 },   req: {} })
def('leather_body',   { icon: 'leather-vest',  type: 'equip', slot: 'body', style: 'ranged', value: 45,   tint: '#a0703a', stats: { def: 8, rAtk: 6 },   req: {} })
def('leather_chaps',  { icon: 'armored-pants', type: 'equip', slot: 'legs', style: 'ranged', value: 38,   tint: '#a0703a', stats: { def: 5, rAtk: 4 },   req: {} })
def('dhide_body',     { icon: 'leather-armor', type: 'equip', slot: 'body', style: 'ranged', value: 1200, tint: '#3aa86a', stats: { def: 40, rAtk: 15 }, req: { ranged: 40 } })
def('dhide_chaps',    { icon: 'armored-pants', type: 'equip', slot: 'legs', style: 'ranged', value: 900,  tint: '#3aa86a', stats: { def: 25, rAtk: 11 }, req: { ranged: 40 } })

export const GEMS = [
  { id: 'sapphire', tint: '#2f6fdf', cutLvl: 20, cutXp: 50,  amLvl: 24, amXp: 65,  value: 120,  amulet: { mAtk: 10, def: 2 } },
  { id: 'emerald',  tint: '#1f9e5a', cutLvl: 27, cutXp: 67,  amLvl: 31, amXp: 70,  value: 250,  amulet: { rAtk: 10, def: 3 } },
  { id: 'ruby',     tint: '#d0233a', cutLvl: 34, cutXp: 85,  amLvl: 50, amXp: 85,  value: 500,  amulet: { str: 8, def: 4 } },
  { id: 'diamond',  tint: '#bfe9ff', cutLvl: 43, cutXp: 107, amLvl: 70, amXp: 100, value: 1200, amulet: { atk: 10, str: 10, def: 10, rAtk: 10, mAtk: 10 } },
]
GEMS.forEach(g => {
  named(g, `gems.${g.id}`)
  def('uncut_' + g.id, { icon: 'crystal-growth', value: Math.round(g.value * 0.6), tint: g.tint, name: () => t('tpl.uncut', { gem: t(`gems.${g.id}`) }) })
  def(g.id, { icon: 'cut-diamond', value: g.value, tint: g.tint, name: `gems.${g.id}` })
  def(g.id + '_amulet', { icon: 'gem-pendant', type: 'equip', slot: 'amulet', value: g.value + 150, tint: g.tint, stats: g.amulet, req: {}, name: () => t('tpl.amulet', { gem: t(`gems.${g.id}`) }) })
})
def('gold_amulet', { icon: 'necklace', type: 'equip', slot: 'amulet', value: 140, tint: '#e3b23c', stats: { def: 2, atk: 2 }, req: {} })

/* ---------------- Monster loot ---------------- */
def('bones',         { icon: 'crossed-bones',   value: 3,   tint: '#d8d0c0' })
def('big_bones',     { icon: 'crossed-bones',   value: 15,  tint: '#e8dcb8' })
def('dragon_bones',  { icon: 'dinosaur-bones',  value: 120, tint: '#9fd8b0' })
def('demon_ashes',   { icon: 'burning-meteor',  value: 160, tint: '#c03a2a' })
def('feathers',      { icon: 'feather',         value: 2,   tint: '#e8e8e8' })
def('wolf_pelt',     { icon: 'wolf-head',       value: 18,  tint: '#7c7c8a' })
def('troll_tusk',    { icon: 'troll',           value: 45,  tint: '#cfc6a8' })
def('ectoplasm',     { icon: 'droplets',        value: 70,  tint: '#7be0b0' })
def('venom_sac',     { icon: 'death-juice',     value: 55,  tint: '#8be04a' })
def('ice_shard',     { icon: 'crystal-cluster', value: 90,  tint: '#9fd8ff' })
def('mark_of_grace', { icon: 'star-swirl',      value: 250, tint: '#f0c040' })
def('coin_pouch',    { icon: 'two-coins',       value: 60,  tint: '#e3b23c', type: 'chest' })
def('gem_chest',     { icon: 'open-treasure-chest', value: 400, tint: '#7b5fd1', type: 'chest' })

/* ---------------- Shop, boss and special gear ---------------- */
def('apprentice_staff', { icon: 'crescent-staff', type: 'equip', slot: 'weapon', style: 'magic', twoHanded: true, value: 60, tint: '#9d8fd6', stats: { mAtk: 5 }, req: {} })
def('wizard_hat',    { icon: 'wizard-face', type: 'equip', slot: 'head', style: 'magic', value: 120, tint: '#3a5fe0', stats: { mAtk: 4, def: 1 }, req: {} })
def('wizard_robe',   { icon: 'cloak',       type: 'equip', slot: 'body', style: 'magic', value: 240, tint: '#3a5fe0', stats: { mAtk: 7, def: 2 }, req: {} })
def('goblin_crown',  { icon: 'crown', type: 'equip', slot: 'head', value: 2500, tint: '#7fbf3a', stats: { def: 10, atk: 6, str: 6 }, req: { defense: 15 }, rare: true })
def('troll_hammer',  { icon: 'warhammer', type: 'equip', slot: 'weapon', style: 'melee', twoHanded: true, value: 9000, tint: '#9a8a6a', stats: { atk: 50, str: 62 }, req: { attack: 40, strength: 40 }, rare: true })
def('tide_bow',      { icon: 'lightning-bow', type: 'equip', slot: 'weapon', style: 'ranged', twoHanded: true, value: 18000, tint: '#2fa8c6', stats: { rAtk: 85, rStr: 18 }, req: { ranged: 60 }, rare: true })
def('night_staff',   { icon: 'skull-staff', type: 'equip', slot: 'weapon', style: 'magic', twoHanded: true, value: 22000, tint: '#7a3ae0', stats: { mAtk: 70, mDmg: 0.3 }, req: { magic: 65 }, rare: true })
def('dragon_blade',  { icon: 'shining-sword', type: 'equip', slot: 'weapon', style: 'melee', value: 40000, tint: '#e0402a', stats: { atk: 95, str: 90 }, req: { attack: 75 }, rare: true })
def('dragon_shield', { icon: 'dragon-shield', type: 'equip', slot: 'shield', value: 35000, tint: '#e0402a', stats: { def: 70 }, req: { defense: 75 }, rare: true })
def('slayer_helm',   { icon: 'black-knight-helm', type: 'equip', slot: 'head', value: 0, tint: '#b5179e', stats: { def: 12 }, req: { defense: 20 }, hasDesc: true })
def('slayer_cape',   { icon: 'vampire-cape', type: 'equip', slot: 'cape', value: 0, tint: '#b5179e', stats: { atk: 6, str: 6, rAtk: 6, mAtk: 6, def: 6 }, req: { slayer: 50 } })
def('tower_cape',    { icon: 'cape', type: 'equip', slot: 'cape', value: 0, tint: '#f0c040', stats: { atk: 4, str: 4, def: 4, rAtk: 4, mAtk: 4 }, req: {} })
def('tower_cape2',   { icon: 'cape', type: 'equip', slot: 'cape', value: 0, tint: '#ff7ad9', stats: { atk: 10, str: 10, def: 10, rAtk: 10, rStr: 6, mAtk: 10, mDmg: 0.05 }, req: {} })
def('wisdom_elixir', { icon: 'bubbling-flask', type: 'potion', value: 0, tint: '#f0c040', elixir: true })

/* ---------------- Beyond the Abyss ---------------- */
def('void_essence',    { icon: 'black-hole-bolas', value: 800,  tint: '#8a5cff' })
def('starlight_shard', { icon: 'floating-crystal', value: 1500, tint: '#ffe08a', hasDesc: true })
// Falls from the sky during some omens; traded at the Veiled Caravan and offered to the stars
def('stardust',        { icon: 'sparkles', value: 8, tint: '#9db8ff', hasDesc: true })
def('void_blade',      { icon: 'energy-sword',    type: 'equip', slot: 'weapon', style: 'melee', value: 120000, tint: '#9b5cff', stats: { atk: 128, str: 120 }, req: { attack: 90 }, rare: true })
def('astral_bow',      { icon: 'high-shot',       type: 'equip', slot: 'weapon', style: 'ranged', twoHanded: true, value: 130000, tint: '#7ad7ff', stats: { rAtk: 130, rStr: 34 }, req: { ranged: 90 }, rare: true })
def('eclipse_staff',   { icon: 'crystal-wand',    type: 'equip', slot: 'weapon', style: 'magic', twoHanded: true, value: 130000, tint: '#ffb347', stats: { mAtk: 110, mDmg: 0.45 }, req: { magic: 90 }, rare: true })
def('celestial_aegis', { icon: 'shield-reflect',  type: 'equip', slot: 'shield', value: 110000, tint: '#f5e6a8', stats: { def: 105 }, req: { defense: 90 }, rare: true })
def('crown_of_ages',   { icon: 'crown-of-thorns', type: 'equip', slot: 'head', value: 90000, tint: '#f0c040', stats: { def: 40, atk: 10, str: 10, rAtk: 10, mAtk: 10 }, req: { defense: 90 }, rare: true })
def('sovereign_cape',  { icon: 'cape-armor',      type: 'equip', slot: 'cape', value: 150000, tint: '#ffd36e', stats: { atk: 16, str: 16, def: 16, rAtk: 16, rStr: 8, mAtk: 16, mDmg: 0.08 }, req: {}, rare: true })
def('eternity_amulet', { icon: 'eye-of-horus',    type: 'equip', slot: 'amulet', value: 80000, tint: '#5ee6c8', stats: { atk: 14, str: 14, def: 10, rAtk: 14, mAtk: 14 }, req: {}, rare: true })

// Weekly boss trophies: one per boss, dropped the first time it is slain
def('colossus_bulwark', { icon: 'bordered-shield', type: 'equip', slot: 'shield', value: 120000, tint: '#a08a6a', stats: { def: 95, str: 6 }, req: { defense: 80 }, rare: true, hasDesc: true })
def('hydra_heart',      { icon: 'glass-heart',     type: 'equip', slot: 'amulet', value: 100000, tint: '#4fbf6a', stats: { atk: 16, str: 16, def: 8, rAtk: 16, mAtk: 16 }, req: {}, rare: true, hasDesc: true })
def('lich_shroud',      { icon: 'vampire-cape',    type: 'equip', slot: 'cape', value: 140000, tint: '#8a5cff', stats: { def: 10, mAtk: 24, mDmg: 0.1 }, req: { magic: 80 }, rare: true, hasDesc: true })
def('wyrm_crown',       { icon: 'crown',           type: 'equip', slot: 'head', value: 110000, tint: '#e0602a', stats: { def: 38, atk: 12, str: 14 }, req: { defense: 80 }, rare: true, hasDesc: true })
def('abyssal_mantle',   { icon: 'cloak',           type: 'equip', slot: 'cape', value: 140000, tint: '#2fa8c6', stats: { def: 10, rAtk: 24, rStr: 12 }, req: { ranged: 80 }, rare: true, hasDesc: true })
def('rime_locket',      { icon: 'necklace',        type: 'equip', slot: 'amulet', value: 100000, tint: '#8fd0f2', stats: { def: 16, atk: 14, str: 14, rAtk: 10, mAtk: 10 }, req: {}, rare: true, hasDesc: true })

// Attach localized names: an explicit `name` (key or function) or the default "items.<id>" key
Object.values(ITEMS).forEach(it => {
  const n = it.name
  delete it.name
  named(it, n || `items.${it.id}`, it.hasDesc ? `itemDesc.${it.id}` : null)
})
