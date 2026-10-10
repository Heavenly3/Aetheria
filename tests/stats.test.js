import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import '../src/game/engine.js'
import { ROLES, ATTRIBUTES, TALENTS } from '../src/game/data/character.js'
import { PETS } from '../src/game/data/pets.js'
import { SETS } from '../src/game/data/sets.js'
import { UPGRADES } from '../src/game/data/ascension.js'
import { PRAYERS } from '../src/game/data/extras.js'
import { DRINKS } from '../src/game/data/tavern.js'
import { PAGE_REWARDS, MASTER_MILESTONES } from '../src/game/data/codex.js'

// Every modifier the game reads must have something that raises it, or it is a number the player can never change
describe('modifiers', () => {
  it('can all be raised by something', () => {
    const provided = new Set()
    const add = mods => Object.keys(mods || {}).forEach(k => provided.add(k))
    Object.values(ROLES).forEach(r => add(r.bonus))
    Object.values(ATTRIBUTES).forEach(a => add(a.mods))
    TALENTS.forEach(t => provided.add(t.mod))
    PETS.forEach(p => add(p.mods || p.bonus))
    SETS.forEach(s => s.bonuses.forEach(b => add(b.mods)))
    UPGRADES.forEach(u => add(u.mods))
    PRAYERS.forEach(p => add(p.mods))
    DRINKS.forEach(d => add(d.mods))
    Object.values(PAGE_REWARDS).forEach(add)
    MASTER_MILESTONES.forEach(m => add(m.mods))
    const read = new Set()
    for (const f of readdirSync(new URL('../src/game', import.meta.url))) {
      if (!f.endsWith('.js')) continue
      const src = readFileSync(new URL('../src/game/' + f, import.meta.url), 'utf8')
      for (const m of src.matchAll(/\.mod\('([a-zA-Z]+)'\)/g)) read.add(m[1])
    }
    expect([...read].filter(k => !provided.has(k))).toEqual([])
  })
})
