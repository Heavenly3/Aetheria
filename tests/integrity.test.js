import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ITEMS, CROPS } from '../src/game/data/items.js'
import { AREAS, MONSTERS, BOSSES, DUNGEONS } from '../src/game/data/combat.js'
import { WEEKLY_BOSSES } from '../src/game/data/weekly.js'
import { OMENS } from '../src/game/data/omens.js'

// Every data module, walked as plain data: a typo in an item id or an icon name shows up here
const MODULES = import.meta.glob('../src/game/data/*.js', { eager: true })
const ICONS = JSON.parse(readFileSync(new URL('../src/game/icons.json', import.meta.url), 'utf8'))
const ITEM_MAPS = ['in', 'out', 'items', 'makes', 'catch', 'fish', 'cost', 'price']
const NOT_ITEMS = new Set(['gold', 'tokens', 'marks', 'points', 'favour', 'xp'])

function scan() {
  const missingItems = [], missingIcons = [], inputs = new Map(), sources = new Set(CROPS.map(c => c.id))
  const seen = new WeakSet()
  const walk = (v, path, asInput) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`, asInput))
    for (const [k, x] of Object.entries(v)) {
      const p = `${path}.${k}`
      if (k === 'icon' && typeof x === 'string' && !ICONS[x]) missingIcons.push(`${x} (${p})`)
      if (k === 'item' && typeof x === 'string') {
        if (!ITEMS[x]) missingItems.push(`${x} (${p})`)
        else if (!asInput) sources.add(x)
      }
      if (ITEM_MAPS.includes(k) && x && typeof x === 'object' && !Array.isArray(x)) {
        for (const id of Object.keys(x)) {
          // Modifier keys ('speed.fishing') and currencies are not items
          if (NOT_ITEMS.has(id) || id.includes('.')) continue
          if (!ITEMS[id]) missingItems.push(`${id} (${p})`)
          else if (k === 'in' || k === 'cost' || k === 'price') inputs.set(id, p)
          else sources.add(id)
        }
      }
      walk(x, p, asInput || k === 'in' || k === 'obj')
    }
  }
  for (const [file, mod] of Object.entries(MODULES))
    for (const [name, value] of Object.entries(mod)) if (name !== 'ITEMS') walk(value, `${file.split('/').pop()}:${name}`, false)
  for (const it of Object.values(ITEMS)) if (it.icon && !ICONS[it.icon]) missingIcons.push(`${it.icon} (item ${it.id})`)
  return { missingItems, missingIcons, unobtainable: [...inputs].filter(([id]) => !sources.has(id)).map(([id, p]) => `${id} (${p})`) }
}

describe('game data integrity', () => {
  const r = scan()
  it('only names items that exist', () => expect(r.missingItems).toEqual([]))
  it('only uses icons that exist', () => expect(r.missingIcons).toEqual([]))
  it('can get hold of every ingredient somewhere', () => expect(r.unobtainable).toEqual([]))

  it('only asks the story and the crown for creatures and regions that exist', () => {
    const creatures = new Set([...Object.keys(MONSTERS), ...BOSSES.map(b => b.id), ...DUNGEONS.flatMap(d => [d.boss?.id, ...(d.monsters || []).map(m => m.id)]),
      ...WEEKLY_BOSSES.map(b => b.id), ...OMENS.map(o => o.monster?.id || o.id)])
    const areas = new Set(AREAS.map(a => a.id))
    const missing = []
    for (const f of ['journal', 'crown']) {
      const src = readFileSync(new URL(`../src/game/data/${f}.js`, import.meta.url), 'utf8')
      for (const [, id] of src.matchAll(/\b(?:beat|life)\((?:g, )?'([a-z_]+)'/g)) if (!creatures.has(id)) missing.push(`${f}: ${id}`)
      for (const [, id] of src.matchAll(/\b(?:beatArea|lifeArea)\((?:g, )?'([a-z_]+)'/g)) if (!areas.has(id)) missing.push(`${f}: area ${id}`)
    }
    expect(missing).toEqual([])
  })

  it('gives every entry of a list its own id', () => {
    const repeated = []
    for (const [file, mod] of Object.entries(MODULES)) {
      for (const [name, list] of Object.entries(mod)) {
        if (!Array.isArray(list)) continue
        const seen = new Set()
        for (const e of list) {
          if (!e || typeof e.id !== 'string') continue
          if (seen.has(e.id)) repeated.push(`${file.replace(/.*\//, '')} ${name}: ${e.id}`)
          seen.add(e.id)
        }
      }
    }
    expect(repeated).toEqual([])
  })
})
