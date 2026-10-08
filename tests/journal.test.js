import { describe, it, expect, vi } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { CHAPTERS, ACTS, CHARACTERS, RUMORS, rumorsFor, rollNames, NAMED } from '../src/game/data/journal.js'
import { seeded } from '../src/game/systems.js'
import { i18n } from '../src/i18n/index.js'
import { OMENS } from '../src/game/data/omens.js'

describe('journal', () => {
  it('rolls new names for every save and keeps them', () => {
    newHero()
    const names = { ...state.journal.names }
    expect(Object.keys(names).sort()).toEqual(Object.keys(NAMED).sort())
    expect(new Set(Object.values(names)).size).toBe(Object.keys(NAMED).length)
    G.checkJournal()
    expect(state.journal.names).toEqual(names)
    // Different seeds give different casts
    const a = rollNames(seeded('a')), b = rollNames(seeded('b'))
    expect(a).not.toEqual(b)
    Object.values(a).forEach(n => expect(n).toMatch(/^[A-Z][a-z]{3,8}$/))
  })

  it('opens with the first page and unlocks chapters as the hero explores', () => {
    newHero()
    expect(G.chapterUnlocked('awakening')).toBe(true)
    expect(G.journalUnread()).toBe(1)
    expect(G.chapterUnlocked('kings_road')).toBe(false)
    const seen = vi.fn()
    const off = G.on('chapter', seen)
    state.bestiary.kills.wolf = 1
    setLevel('smithing', 40)
    G.checkJournal()
    off()
    expect(G.chapterUnlocked('kings_road')).toBe(true)
    expect(G.chapterUnlocked('brins_secret')).toBe(true)
    expect(seen).toHaveBeenCalledTimes(2)
    G.readJournal('kings_road')
    expect(G.journalUnread()).toBe(2)
  })

  it('is kept when the hero ascends, and each ascension brings back a memory', () => {
    newHero()
    state.bestiary.kills.wolf = 1
    G.checkJournal()
    vi.spyOn(G, 'canAscend').mockReturnValue(true)
    G.ascend()
    vi.restoreAllMocks()
    expect(G.chapterUnlocked('kings_road')).toBe(true)
    expect(G.memoryUnlocked({ n: 1 })).toBe(true)
    expect(G.memoryUnlocked({ n: 2 })).toBe(false)
  })

  it('unlocks quietly what an older save already earned', () => {
    newHero()
    state.journal = { names: null, chapters: {}, read: {} }
    state.bestiary.kills.snake = 3
    const seen = vi.fn()
    const off = G.on('chapter', seen)
    G.migrateState()
    off()
    expect(state.journal.names).toBeTruthy()
    expect(G.chapterUnlocked('living_mire')).toBe(true)
    expect(seen).not.toHaveBeenCalled()
  })

  it('has every text it needs', () => {
    const { te } = i18n.global
    for (const c of CHAPTERS) {
      expect(te(`journal.chapters.${c.id}.title`, 'en')).toBe(true)
      expect(te(`journal.chapters.${c.id}.text`, 'en')).toBe(true)
      if (c.hint) expect(te(`journal.hints.${c.hint}`, 'en')).toBe(true)
      expect(ACTS.some(a => a.id === c.act)).toBe(true)
    }
    for (const p of CHARACTERS) expect(CHAPTERS.some(c => c.id === p.met)).toBe(true)
    for (const o of OMENS) expect(te(`journal.omenNotes.${o.id}`, 'en')).toBe(true)
  })
})

describe('tavern keeper', () => {
  it('talks about what the hero has lived so far', () => {
    newHero()
    let ids = rumorsFor(G).map(r => r.id)
    expect(ids).toContain('oldRoad')
    expect(ids).not.toContain('sliver')
    state.bestiary.kills.wolf = 1
    state.bestiary.kills.warren_chief = 1
    G.checkJournal()
    ids = rumorsFor(G).map(r => r.id)
    expect(ids).not.toContain('oldRoad')
    expect(ids).toContain('sliver')
    for (const r of RUMORS) expect(i18n.global.te(`journal.rumors.${r.id}`, 'en')).toBe(true)
  })
})
