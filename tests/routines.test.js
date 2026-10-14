import { describe, it, expect, vi, afterEach } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { CONDITIONS, ACTIONS_LIST, TEMPLATES, MAX_RULES, QUICK_WAIT, MANUAL_PAUSE } from '../src/game/data/routines.js'
import { i18n } from '../src/i18n/index.js'

const te = k => i18n.global.te(k, 'en')
afterEach(() => vi.useRealTimers())

describe('routines', () => {
  it('have texts for every condition, action and template', () => {
    for (const k in CONDITIONS) for (const part of ['whenNames', 'when']) expect(te(`routines.${part}.${k}`), k).toBe(true)
    for (const k in ACTIONS_LIST) for (const part of ['thenNames', 'then']) expect(te(`routines.${part}.${k}`), k).toBe(true)
    for (const id of TEMPLATES) expect(te(`routines.templatesList.${id}`), id).toBe(true)
  })

  it('start a skill when the hero is idle, but leave a running activity alone', () => {
    newHero()
    G.addRule({ when: { type: 'idle' }, then: { type: 'skill', skill: 'mining', action: 'copper_ore' } })
    G.runRoutines()
    expect(state.activity).toMatchObject({ type: 'skill', skill: 'mining', action: 'copper_ore' })
    // Picked by hand: a rule that does not interrupt leaves it be
    G.startSkill('woodcutting', 'logs')
    G.addRule({ when: { type: 'always' }, then: { type: 'skill', skill: 'mining', action: 'copper_ore' } })
    G.runRoutines()
    expect(state.activity.skill).toBe('woodcutting')
    expect(state.routines.log[0]).toMatchObject({ then: { type: 'skill', action: 'copper_ore' } })
  })

  it('cook when the food runs low, and never fight over the same activity', () => {
    newHero()
    G.addItem('raw_shrimp', 30)
    G.removeItem('shrimp', G.qty('shrimp'))
    state.food = 'shrimp'
    const r = G.addTemplate('cookWhenLow')
    expect(r.then).toMatchObject({ type: 'skill', skill: 'cooking' })
    G.runRoutines()
    expect(state.activity).toMatchObject({ skill: 'cooking', action: r.then.action })
    // Running it again keeps it going instead of toggling it off
    G.runRoutines()
    expect(state.activity).toMatchObject({ skill: 'cooking' })
  })

  it('let interrupting rules wait after a change made by hand', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 12))
    newHero()
    G.addRule({ when: { type: 'always' }, then: { type: 'skill', skill: 'mining', action: 'copper_ore' }, interrupt: true })
    G.startSkill('woodcutting', 'logs')
    G.runRoutines()
    expect(state.activity.skill).toBe('woodcutting')
    vi.setSystemTime(Date.now() + MANUAL_PAUSE + 1000)
    G.runRoutines()
    expect(state.activity.skill).toBe('mining')
  })

  it('run quick actions with a wait between them', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 12))
    newHero()
    G.addItem('bones', 10)
    state.gold = 0
    G.addRule({ when: { type: 'itemAtLeast', item: 'bones', n: 5 }, then: { type: 'sell', item: 'bones', n: 2 } })
    G.runRoutines()
    expect(G.qty('bones')).toBe(2)
    expect(state.gold).toBeGreaterThan(0)
    G.addItem('bones', 10)
    G.runRoutines()
    expect(G.qty('bones')).toBe(12)
    vi.setSystemTime(Date.now() + QUICK_WAIT + 1)
    G.runRoutines()
    expect(G.qty('bones')).toBe(2)
  })

  it('stay off when switched off, and keep at most twelve rules', () => {
    newHero()
    state.routines.on = false
    G.addRule({ when: { type: 'idle' }, then: { type: 'skill', skill: 'mining', action: 'copper_ore' } })
    G.runRoutines()
    expect(state.activity).toBe(null)
    for (let i = 0; i < 20; i++) G.addRule({ when: { type: 'idle' }, then: { type: 'stop' } })
    expect(state.routines.rules).toHaveLength(MAX_RULES)
  })

  it('travel through ascension with the player', () => {
    newHero()
    G.addTemplate('servePatrons')
    for (const s of ['attack', 'strength', 'defense', 'mining', 'woodcutting', 'fishing']) setLevel(s, 99)
    G.ascend()
    expect(state.routines.rules).toHaveLength(1)
  })
})
