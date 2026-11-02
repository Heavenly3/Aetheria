import { describe, it, expect } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { AREAS, BOSSES, DUNGEONS, MONSTERS } from '../src/game/data/combat.js'
import { ECHOES } from '../src/game/data/echoes.js'
import { CHAPTERS } from '../src/game/data/journal.js'
import { REGIONS, REGION_OF, STORY_REGION, regionOfActivity, regionPath } from '../src/game/data/world.js'
import { whereToKill } from '../src/ui/tracker.js'
import { regionMarks, regionProgress } from '../src/ui/worldMarks.js'
import { te } from '../src/i18n/index.js'

describe('world map', () => {
  it('places every area, creature, dungeon, world boss and echo in a region', () => {
    expect(Object.keys(REGIONS).sort()).toEqual(AREAS.map(a => a.id).sort())
    for (const id of Object.keys(MONSTERS)) expect(REGION_OF[id], id).toBeTruthy()
    for (const b of [...BOSSES, ...ECHOES]) expect(REGION_OF[b.id], b.id).toBeTruthy()
    for (const dg of DUNGEONS) {
      expect(REGION_OF[dg.id], dg.id).toBeTruthy()
      expect(REGION_OF[dg.boss.id]).toBe(REGION_OF[dg.id])
    }
    // Each dungeon and boss belongs to one region only
    const dungeons = Object.values(REGIONS).map(r => r.dungeon).filter(Boolean)
    expect(new Set(dungeons).size).toBe(DUNGEONS.length)
    expect(Object.values(REGIONS).flatMap(r => r.bosses).sort()).toEqual(BOSSES.map(b => b.id).sort())
  })

  it('names a place for every creature', () => {
    for (const id of Object.keys(MONSTERS)) expect(te(`world.placeNames.${id}`), id).toBe(true)
  })

  it('points every story hint about a fight at a region', () => {
    for (const [hint, region] of Object.entries(STORY_REGION)) expect(REGIONS[region], hint).toBeTruthy()
    // Every other step of the story is done somewhere else than the map
    const elsewhere = ['firstQuest', 'firstOmen', 'abyssGates', 'smithing', 'coldIron', 'guild', 'crownWhole']
    for (const c of CHAPTERS) if (c.hint && c.act !== 'festivals' && !c.ending) expect(STORY_REGION[c.hint] || elsewhere.includes(c.hint), c.id).toBeTruthy()
  })

  it('knows the region of the fight going on', () => {
    newHero()
    expect(regionOfActivity(state.activity)).toBe(null)
    G.startCombat('area', 'chicken')
    expect(regionOfActivity(state.activity)).toBe('meadow')
    expect(regionOfActivity({ type: 'combat', kind: 'tower' })).toBe(null)
  })

  it('sends the tracker to the region page', () => {
    expect(whereToKill('wolf')).toEqual({ to: regionPath('forest'), focus: 'monster:wolf' })
    expect(whereToKill('warren_chief')).toEqual({ to: regionPath('meadow'), focus: 'dungeon:goblin_warren' })
    expect(whereToKill('goblin_king')).toEqual({ to: regionPath('forest'), focus: 'monster:goblin_king' })
  })

  it('marks where the slayer task and the story wait, and counts progress', () => {
    newHero()
    state.slayer.task = { monster: 'wolf', total: 10, left: 10 }
    const marks = regionMarks()
    expect(marks.forest?.slayer).toBe(1)
    expect(regionProgress('meadow')).toMatchObject({ met: 0, total: 3, visited: false })
    state.bestiary.kills.goblin = 1
    expect(regionProgress('meadow')).toMatchObject({ met: 1, visited: true })
  })
})
