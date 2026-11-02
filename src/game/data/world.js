/* =========================================================
   WORLD — the realm as places. Every region on the map holds its creatures (each one in a place of
   its own), its dungeon and its world bosses, and fights happen on the page of their region.
   Coordinates are on a 1000 × 560 board.
   ========================================================= */
import { AREAS, BOSSES, DUNGEONS } from './combat.js'
import { ECHOES } from './echoes.js'

export const MAP_W = 2000
export const MAP_H = 1200

// x, y: where the region sits on the board · dungeon: the one in this region · bosses: the world bosses that live here
// tint: the colour of its land · decor: what grows or stands around it, drawn on the map
// dungeonAt, spots: where its dungeon and its places sit around it, when the usual spots are taken
export const REGIONS = {
  meadow: { x: 330, y: 930, tint: '#8fb85a', dungeon: 'goblin_warren', bosses: [], dungeonAt: [-110, -110], spots: [[-200, -30], [215, 95], [60, 170]], decor: ['wheat', 'wheat', 'sprout', 'family-house', 'house', 'wheat'] },
  forest: { x: 610, y: 790, tint: '#2f7a4a', bosses: ['goblin_king'], decor: ['pine-tree', 'pine-tree', 'oak', 'forest', 'pine-tree', 'wood-cabin', 'oak', 'campfire'] },
  caves: { x: 420, y: 520, tint: '#8a7a6a', dungeon: 'crypt', bosses: ['troll_lord'], decor: ['stone-pile', 'stone-block', 'crystal-growth', 'stone-pile', 'peaks'] },
  swamp: { x: 800, y: 470, tint: '#6b7a2a', dungeon: 'serpent_temple', bosses: ['kraken'], decor: ['swamp', 'mushroom', 'willow-tree', 'water-drop', 'mushroom', 'willow-tree'] },
  ruins: { x: 1040, y: 760, tint: '#7a6a9a', bosses: ['necromancer'], decor: ['castle-ruins', 'church', 'crossed-bones', 'rune-stone', 'castle-ruins'] },
  peaks: { x: 1130, y: 330, tint: '#8fd0f2', dungeon: 'frost_keep', bosses: [], decor: ['peaks', 'peaks', 'crystal-cluster', 'peaks', 'stone-pile', 'peaks'] },
  lair: { x: 1400, y: 560, tint: '#c0402a', dungeon: 'dragon_vault', bosses: ['ancient_dragon'], decor: ['fire', 'dinosaur-bones', 'peaks', 'fire', 'crossed-bones'] },
  abyss: { x: 1560, y: 900, tint: '#6a3ab0', bosses: [], decor: ['magic-portal', 'crossed-bones', 'fire', 'evil-tree', 'daemon-skull'] },
  void: { x: 1760, y: 560, tint: '#3a1a6a', dungeon: 'void_sanctum', bosses: ['void_emperor'], decor: ['vortex', 'floating-crystal', 'falling-star', 'vortex'] },
  celestial: { x: 1720, y: 200, tint: '#f0c040', bosses: ['aether_sovereign'], decor: ['sun', 'falling-star', 'floating-crystal', 'angel-wings'] },
}
// Places of the realm that are not regions: each one has a screen of its own
export const LANDMARKS = [
  { id: 'town', icon: 'family-house', x: 175, y: 1045, to: '/tavern' },
  { id: 'tower', icon: 'stone-tower', x: 230, y: 700, to: '/tower' },
  { id: 'weekly', icon: 'crowned-skull', x: 860, y: 1030, to: '/weekly' },
]
export const DUNGEON_AT = [-150, -80]
export const SPOTS = [[-215, 95], [215, 95], [0, 175]]
export const REGION_IDS = AREAS.map(a => a.id)
export const AREA_MAP = Object.fromEntries(AREAS.map(a => [a.id, a]))

// Which region anything that can be fought belongs to: creatures, dungeons, their bosses, world bosses and echoes
export const REGION_OF = {}
for (const a of AREAS) for (const m of a.monsters) REGION_OF[m.id] = a.id
for (const [id, r] of Object.entries(REGIONS)) {
  if (r.dungeon) {
    REGION_OF[r.dungeon] = id
    REGION_OF[DUNGEONS.find(d => d.id === r.dungeon).boss.id] = id
  }
  for (const b of r.bosses) REGION_OF[b] = id
}
for (const e of ECHOES) REGION_OF[e.id] = REGION_OF[e.echoOf]

export const regionDungeon = id => DUNGEONS.find(d => d.id === REGIONS[id]?.dungeon) || null
export const regionBosses = id => (REGIONS[id]?.bosses || []).map(b => BOSSES.find(x => x.id === b))
export const regionEchoes = id => ECHOES.filter(e => REGIONS[id]?.bosses.includes(e.echoOf))
export const regionPath = id => '/combat/' + id

// The region a fight is taking place in, or null for fights that have their own screen (tower, omens…)
export function regionOfActivity(act) {
  if (act?.type !== 'combat' || !['area', 'boss', 'dungeon'].includes(act.kind)) return null
  return REGION_OF[act.target] || null
}

// Where each step of the story is followed up, for the journal's hints that point at the map
export const STORY_REGION = {
  forest: 'forest', warrenChief: 'meadow', caves: 'caves', swamp: 'swamp', naga: 'swamp', ruins: 'ruins', crypt: 'caves',
  necromancer: 'ruins', queen: 'ruins', peaks: 'peaks', stillVillage: 'peaks', winterQueen: 'peaks', lair: 'lair', wyrm: 'lair',
  iceFire: 'lair', abyss: 'abyss', maze: 'abyss', demon: 'abyss', ancient: 'lair', bottom: 'abyss', twoCrowns: 'abyss',
  void: 'void', warden: 'void', emperor: 'void', spire: 'celestial', sovereign: 'celestial',
}
