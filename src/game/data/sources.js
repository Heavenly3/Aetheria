import { CROPS, GEMS } from './items.js'
import { ACTIONS } from './actions.js'
import { MONSTERS, BOSSES, DUNGEONS, SLAYER_SHOP, TOWER_SHOP } from './combat.js'
import { ECHOES } from './echoes.js'
import { SHOP } from './progression.js'
import { HYBRIDS, BUILDINGS } from './farm.js'
import { GRACEFUL } from './extras.js'
import { WEEKLY_BOSSES } from './weekly.js'
import { EXPEDITIONS } from './tavern.js'
import { HEISTS, STOLEN } from './thieving.js'
import { MYTHIC_DROPS } from './mythics.js'

/*
  Where an item comes from: the skill actions that make or find it, the creatures, bosses and
  dungeons that drop it, the shops that sell it, the chests it turns up in and the rest.
  Each source: { kind, …what it needs to be shown } — the inventory turns them into rows.
  `chance` is per action or kill when the item is not a sure thing.
*/
const NON_HYBRID = CROPS.filter(c => !c.hybrid && !c.festival)
// What the openable items can hold (see engine openChest)
const CHEST_HOLDS = {
  bird_nest: [...CROPS.filter(c => c.lvl <= 60 && !c.hybrid && !c.festival).map(c => c.id + '_seed'), ...GEMS.map(g => 'uncut_' + g.id)],
  seed_pouch: NON_HYBRID.map(c => c.id + '_seed'),
  casket: [...NON_HYBRID.map(c => c.id + '_seed'), ...GEMS.map(g => 'uncut_' + g.id), 'treasure_map'],
  geode: ['copper_ore', 'iron_ore', 'coal', 'gold_ore', 'mithril_ore', 'adamantite_ore', 'runite_ore', 'stardust', ...GEMS.map(g => 'uncut_' + g.id)],
  gem_chest: GEMS.slice(0, 4).map(g => 'uncut_' + g.id),
}

let index = null
function build() {
  const map = new Map()
  const add = (id, src) => { if (!map.has(id)) map.set(id, []); map.get(id).push(src) }

  for (const [skill, list] of Object.entries(ACTIONS)) for (const a of list) {
    if (a.festival) continue
    for (const id of Object.keys(a.out || {})) add(id, { kind: 'action', skill, action: a })
    if (a.catch) {
      const total = Object.values(a.catch).reduce((s, w) => s + w, 0)
      for (const [id, w] of Object.entries(a.catch)) add(id, { kind: 'action', skill, action: a, chance: w / total })
    }
    for (const e of a.extra || []) add(e.item, { kind: 'action', skill, action: a, chance: e.chance })
  }
  for (const s of STOLEN) add(s.id, { kind: 'stolen', lvl: s.lvl })
  for (const h of HEISTS) for (const id of [...Object.keys(h.loot), ...(h.gear ? [h.gear] : [])]) add(id, { kind: 'heist', heist: h })
  for (const g of GRACEFUL) add(g.id, { kind: 'grace', price: g.cost, lvl: g.lvl })
  // Cooking that goes wrong
  add('burnt_food', { kind: 'burnt' })

  for (const c of CROPS) if (!c.festival) add(c.id, { kind: 'crop', crop: c })
  for (const h of HYBRIDS) add(h.id + '_seed', { kind: 'cross', crop: CROPS.find(c => c.id === h.id), parents: h.parents })
  add('seed_pouch', { kind: 'harvest' })
  for (const [id, b] of Object.entries(BUILDINGS)) for (const item of Object.keys(b.makes || {})) add(item, { kind: 'building', building: id })

  const drops = (m, kind, extra = {}) => { for (const d of m.drops || []) add(d.item, { kind, monster: m, chance: d.chance, ...extra }) }
  for (const m of Object.values(MONSTERS)) drops(m, 'monster')
  for (const b of BOSSES) drops(b, 'boss')
  for (const e of ECHOES) drops(e, 'echo')
  for (const b of WEEKLY_BOSSES) add(b.trophy, { kind: 'weekly', boss: b })
  for (const dg of DUNGEONS) {
    drops(dg.boss, 'dungeon', { dungeon: dg })
    for (const d of dg.chest) add(d.item, { kind: 'dungeon', dungeon: dg, chance: d.chance })
  }

  for (const cat of SHOP) for (const [id, price] of cat.items) add(id, { kind: 'shop', price })
  for (const s of SLAYER_SHOP) for (const id of s.item ? [s.item] : Object.keys(s.items || {})) add(id, { kind: 'slayerShop', price: s.cost })
  for (const s of TOWER_SHOP) for (const id of s.item ? [s.item] : Object.keys(s.items || {})) add(id, { kind: 'towerShop', price: s.cost })
  for (const e of EXPEDITIONS) for (const l of e.loot) add(l.item, { kind: 'expedition', expedition: e, chance: l.chance })
  for (const d of MYTHIC_DROPS) add(d.item, { kind: 'mythic', drop: d, chance: d.chance })
  for (const [chest, ids] of Object.entries(CHEST_HOLDS)) for (const id of new Set(ids)) add(id, { kind: 'chest', chest })

  // The same find on many actions of one skill (a gem from any rock) becomes a single row
  for (const [id, list] of map) {
    const groups = new Map()
    for (const s of list) if (s.kind === 'action' && s.chance != null) {
      const k = s.skill + '|' + s.chance
      groups.set(k, [...(groups.get(k) || []), s])
    }
    const merged = [...groups.values()].filter(g => g.length >= 3)
    if (!merged.length) continue
    const gone = new Set(merged.flat())
    map.set(id, [...list.filter(s => !gone.has(s)), ...merged.map(g => ({ kind: 'anyAction', skill: g[0].skill, chance: g[0].chance, lvl: Math.min(...g.map(s => s.action.lvl)) }))])
  }
  // A drop shared by many creatures lists the likeliest first
  for (const list of map.values()) list.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (b.chance ?? 1) - (a.chance ?? 1))
  return map
}
const KIND_ORDER = ['action', 'anyAction', 'burnt', 'crop', 'cross', 'harvest', 'building', 'stolen', 'heist', 'grace', 'shop', 'slayerShop', 'towerShop', 'monster', 'dungeon', 'boss', 'echo', 'weekly', 'expedition', 'chest', 'mythic']

export function sourcesOf(id) {
  index ||= build()
  return index.get(id) || []
}
