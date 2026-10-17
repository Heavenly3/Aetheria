import { describe, it, expect, vi } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { UNLOCKS } from '../src/game/data/unlocks.js'
import { i18n } from '../src/i18n/index.js'

describe('screens found one by one', () => {
  it('starts a new hero with a short menu and a hint for every hidden screen', () => {
    newHero()
    state.tutorial = { step: 0, done: false, base: null }
    expect(G.screenOpen('/combat')).toBe(true)
    expect(G.screenOpen('/slayer')).toBe(false)
    expect(G.screenOpen('/ascension')).toBe(false)
    for (const u of UNLOCKS) for (const k of ['hints', 'intro']) expect(i18n.global.te(`unlocks.${k}.${u.key}`, 'en')).toBe(true)
  })

  it('keeps everything open for saves from before', () => {
    newHero()
    state.unlocks = null
    G.migrateState()
    expect(G.closedScreens()).toEqual([])
    expect(G.screenNew('/slayer')).toBe(false)
  })

  it('opens a screen when its time comes, announces it once and marks it new until visited', () => {
    newHero()
    const seen = []
    const off = G.on('unlock', e => seen.push(...e.list.map(u => u.to)))
    expect(G.screenOpen('/slayer')).toBe(false)
    for (const k of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(k, 15)
    G.checkUnlocks()
    G.checkUnlocks()
    expect(seen.filter(to => to === '/slayer')).toHaveLength(1)
    expect(G.screenNew('/slayer')).toBe(true)
    G.markScreenSeen('/slayer')
    expect(G.screenNew('/slayer')).toBe(false)
    off()
  })

  it('keeps found screens open through ascension', () => {
    newHero()
    for (const k of Object.keys(state.skills)) setLevel(k, 30)
    G.checkUnlocks()
    expect(G.canAscend()).toBe(true)
    G.ascend()
    expect(state.ascension.count).toBe(1)
    expect(G.combatLevel()).toBeLessThan(10)
    expect(G.screenOpen('/slayer')).toBe(true)
  })
})

describe('the next step', () => {
  it('points to a quest ready to hand in first, and to the next page of the story otherwise', async () => {
    const { QUESTS } = await import('../src/game/data/progression.js')
    newHero()
    G.checkJournal(true)
    const story = G.nextGoal()
    expect(story.kind).toBe('story')
    expect(story.hint).not.toBe('firstOmen')
    expect(i18n.global.te(`journal.hints.${story.hint}`, 'en')).toBe(true)
    const q = QUESTS[0]
    state.quests[q.id] = { status: 'active', start: {} }
    const spy = vi.spyOn(G, 'questReady').mockImplementation(x => x.id === q.id)
    expect(G.nextGoal()).toMatchObject({ kind: 'quest', to: '/quests' })
    spy.mockRestore()
  })
})

describe('the player chooses how to start', () => {
  it('starts with the tutorial and a short menu by default', () => {
    newHero()
    expect(state.tutorial.done).toBe(false)
    expect(G.closedScreens().length).toBeGreaterThan(0)
  })

  it('can skip the tutorial and open every screen from the start', () => {
    newHero({ tutorial: false, gradual: false })
    expect(state.tutorial.done).toBe(true)
    expect(G.closedScreens()).toEqual([])
    expect(G.screenNew('/tower')).toBe(false)
  })

  it('can open every screen at any time', () => {
    newHero()
    G.openAllScreens()
    expect(G.closedScreens()).toEqual([])
  })
})
