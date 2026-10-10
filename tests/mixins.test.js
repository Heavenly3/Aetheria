import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { systems } from '../src/game/systems.js'
import { meta } from '../src/game/meta.js'
import { ascension } from '../src/game/ascension.js'
import { collection } from '../src/game/collection.js'
import { omens } from '../src/game/omens.js'
import { companions } from '../src/game/companions.js'
import { weekly } from '../src/game/weekly.js'
import { relicForge } from '../src/game/relicforge.js'
import { journal } from '../src/game/journal.js'
import { fighting } from '../src/game/fighting.js'
import { guilds } from '../src/game/guilds.js'
import { codex } from '../src/game/codex.js'
import { slayer } from '../src/game/slayer.js'
import { church } from '../src/game/church.js'
import { bar } from '../src/game/bar.js'
import { farm } from '../src/game/farm.js'

// Every system is mixed into one engine object: two methods with the same name would silently replace each other
describe('engine mixins', () => {
  it('never share a method name', () => {
    const mixins = { systems, meta, ascension, collection, omens, companions, weekly, relicForge, journal, fighting, guilds, codex, slayer, church, bar, farm }
    // The engine's own methods, read from its source
    const src = readFileSync(new URL('../src/game/engine.js', import.meta.url), 'utf8')
    const body = src.slice(src.indexOf('export const G = {'))
    const owner = {}
    for (const m of body.matchAll(/^ {2}([a-zA-Z]\w*)\(/gm)) owner[m[1]] = 'engine'
    const clashes = []
    for (const [name, mix] of Object.entries(mixins)) {
      for (const key of Object.keys(mix)) {
        if (owner[key]) clashes.push(`${key}: ${owner[key]} and ${name}`)
        else owner[key] = name
      }
    }
    expect(clashes).toEqual([])
  })
})
