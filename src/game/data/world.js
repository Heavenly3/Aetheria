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
// terrain: how its land is drawn on the map
export const REGIONS = {
  meadow: { x: 330, y: 930, terrain: 'fields', dungeon: 'goblin_warren', bosses: [] },
  forest: { x: 610, y: 790, terrain: 'trees', bosses: ['goblin_king'] },
  caves: { x: 420, y: 520, terrain: 'hills', dungeon: 'crypt', bosses: ['troll_lord'] },
  swamp: { x: 800, y: 470, terrain: 'marsh', dungeon: 'serpent_temple', bosses: ['kraken'] },
  ruins: { x: 1040, y: 760, terrain: 'ruins', bosses: ['necromancer'] },
  peaks: { x: 1130, y: 330, terrain: 'mountains', dungeon: 'frost_keep', bosses: [] },
  lair: { x: 1400, y: 560, terrain: 'mountains', dungeon: 'dragon_vault', bosses: ['ancient_dragon'] },
  abyss: { x: 1560, y: 900, terrain: 'hills', bosses: [] },
  void: { x: 1760, y: 560, terrain: 'stars', dungeon: 'void_sanctum', bosses: ['void_emperor'] },
  celestial: { x: 1720, y: 200, terrain: 'stars', bosses: ['aether_sovereign'] },
}
// Places of the realm that are not regions: each one has a screen of its own
export const LANDMARKS = [
  { id: 'town', icon: 'family-house', x: 175, y: 1045, to: '/tavern' },
  { id: 'tower', icon: 'stone-tower', x: 230, y: 700, to: '/tower' },
  { id: 'weekly', icon: 'crowned-skull', x: 860, y: 1030, to: '/weekly' },
]
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
