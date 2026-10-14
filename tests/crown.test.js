import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { SHARDS, SOCKETS, ENDINGS, DEEP_KILLS } from '../src/game/data/crown.js'
import { CHAPTERS } from '../src/game/data/journal.js'
import { ACHIEVEMENTS } from '../src/game/data/progression.js'
import { TITLES } from '../src/game/data/cosmetics.js'
import { i18n } from '../src/i18n/index.js'

const te = k => i18n.global.te(k, 'en')
// Everything the story needs for a whole Crown in this life
function wholeCrown() {
  setLevel('smithing', 40)
  Object.assign(state.killsBy, { naga: 1, kraken: 1, winter_queen: 1, bronze_wyrm: 1, ancient_dragon: 1, hydra: DEEP_KILLS, void_emperor: 1 })
  G.checkJournal(true)
}

describe('the Aether Crown', () => {
  it('has seven shards, each with its texts, a bonus and a power', () => {
    expect(SHARDS).toHaveLength(7)
    expect(SHARDS.filter(s => s.heart)).toHaveLength(1)
    for (const s of SHARDS) {
      expect(Object.keys(s.mods).length).toBeGreaterThan(0)
      for (const k of ['name', 'desc']) expect(te(`crown.shards.${s.id}.${k}`), s.id).toBe(true)
      expect(te(`crown.hints.${s.id}`)).toBe(true)
      expect(te(`crown.powers.${s.power.id}.name`)).toBe(true)
    }
  })

  it('finds shards as the story reaches them and sets them in free sockets', () => {
    newHero()
    expect(G.shardsFound()).toBe(0)
    setLevel('smithing', 40)
    state.killsBy.kraken = 1
    G.checkJournal(true)
    expect(G.shardFound('forge')).toBe(true)
    expect(G.shardFound('sea')).toBe(true)
    expect(state.crown.sockets.filter(Boolean)).toEqual(['forge', 'sea'])
    expect(G.mod('fishLuck')).toBeGreaterThanOrEqual(0.15)
    // A shard taken out stops counting
    G.setSocket(1, null)
    expect(G.shardActive('sea')).toBe(false)
    expect(G.mod('fishLuck')).toBeLessThan(0.15)
    // The Heart needs no socket
    state.killsBy.void_emperor = 1
    G.checkJournal(true)
    expect(G.shardActive('heart')).toBe(true)
    expect(state.crown.sockets).not.toContain('heart')
    expect(state.crown.sockets).toHaveLength(SOCKETS)
  })

  it('calls on a power for a while, then waits for it to be ready again', () => {
    newHero()
    setLevel('smithing', 40)
    G.checkJournal(true)
    const before = G.mod('quality')
    expect(G.usePower('forge')).toBe(true)
    expect(G.mod('quality')).toBeGreaterThan(before + 0.2)
    expect(G.usePower('forge')).toBe(false)
    expect(G.powerReadyIn('forge')).toBeGreaterThan(0)
    // Bloom ripens every growing plot
    state.killsBy.naga = 1
    G.checkJournal(true)
    state.farm.plots = [{ crop: 'potato', t: 500 }, null]
    expect(G.usePower('sap')).toBe(true)
    expect(state.farm.plots[0].t).toBe(0)
  })

  it('opens the choice once whole, and keeps the endings through every life', () => {
    newHero()
    wholeCrown()
    expect(G.crownWhole()).toBe(true)
    expect(G.chapterUnlocked('the_crown_whole')).toBe(true)
    expect(G.canChooseEnding()).toBe(false)
    state.killsBy.aether_sovereign = 1
    expect(G.canChooseEnding()).toBe(true)
    const xp = G.mod('xp')
    expect(G.chooseEnding('sky')).toBe(true)
    expect(G.canChooseEnding()).toBe(false)
    expect(G.chapterUnlocked('ending_sky')).toBe(true)
    expect(ACHIEVEMENTS.find(a => a.id === 'ending_sky').check(G)).toBe(true)
    expect(TITLES.find(x => x.id === 'lightbringer').ach).toBe('ending_sky')
    // A new life: the shards are gone, the ending and its bonus stay
    for (const s of ['attack', 'strength', 'defense', 'mining', 'woodcutting', 'fishing']) setLevel(s, 99)
    expect(G.ascend()).toBeGreaterThan(0)
    expect(G.shardsFound()).toBe(0)
    expect(state.legacy.endings.sky).toBeTruthy()
    expect(G.mod('xp')).toBeGreaterThanOrEqual(ENDINGS.find(e => e.id === 'sky').mods.xp)
    expect(G.chapterUnlocked('ending_sky')).toBe(true)
    expect(xp).toBeGreaterThan(0)
  })

  it('counts the sixth act without its endings, and all three endings apart', () => {
    newHero()
    const act6 = CHAPTERS.filter(c => c.act === 'act6')
    expect(act6.filter(c => c.ending)).toHaveLength(3)
    expect(act6.filter(c => !c.ending)).toHaveLength(6)
    for (const c of act6) expect(te(`journal.chapters.${c.id}.title`), c.id).toBe(true)
    state.legacy.endings = { queen: 1, sky: 1, king: 1 }
    expect(ACHIEVEMENTS.find(a => a.id === 'all_endings').check(G)).toBe(true)
  })
})
