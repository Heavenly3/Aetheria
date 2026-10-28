import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, run } from './helpers.js'
import { repairNumbers, keepStorage, storage } from '../src/game/saveGuard.js'
import { sessionErrors, clearErrors, buildReport } from '../src/game/feedback.js'

describe('bad numbers in a save', () => {
  beforeEach(() => { newHero(); clearErrors() })

  it('never writes NaN or Infinity: they go back to their default and are noted', () => {
    state.gold = NaN
    state.skills.mining.xp = Infinity
    state.inventory.iron_ore = -Infinity
    G.save()
    expect(state.gold).toBe(G.freshState().gold)
    expect(state.skills.mining.xp).toBe(0)
    expect(state.inventory.iron_ore).toBe(0)
    expect(sessionErrors()[0].msg).toMatch(/Repaired 3 bad number.*gold/)
    expect(G.loadSlot(0)).toBe(true)
    expect(state.gold).toBe(G.freshState().gold)
  })

  it('repairs nulls left by older saves where a number belongs, and the game keeps running', () => {
    state.gold = 500
    G.save()
    const raw = JSON.parse(localStorage.getItem('aetheria-slot-0'))
    raw.gold = null
    raw.skills.hitpoints.xp = null
    localStorage.setItem('aetheria-slot-0', JSON.stringify(raw))
    expect(G.loadSlot(0)).toBe(true)
    expect(state.gold).toBe(G.freshState().gold)
    expect(state.skills.hitpoints.xp).toBe(G.freshState().skills.hitpoints.xp)
    G.startSkill('mining', 'copper_ore')
    run(30)
    expect(state.skills.mining.xp).toBeGreaterThan(0)
  })

  it('leaves real numbers and nulls that are meant to be there alone', () => {
    const save = { a: 1, b: null, c: { d: 2.5, e: [1, NaN] }, f: 'x' }
    expect(repairNumbers(save, { a: 0, b: null, c: { d: 0 } }, true)).toEqual(['c.e.1'])
    expect(save).toEqual({ a: 1, b: null, c: { d: 2.5, e: [1, 0] }, f: 'x' })
    expect(sessionErrors()).toEqual([])
  })
})

describe('keeping the storage', () => {
  const nav = (kept, grant, userAgent = 'Chrome') => {
    const calls = []
    return { calls, userAgent, storage: { persisted: async () => kept, persist: async () => (calls.push('persist'), grant) } }
  }

  it('asks once when not kept yet, and reports the outcome', async () => {
    const n = nav(false, true)
    expect(await keepStorage(n)).toBe('persistent')
    expect(n.calls).toEqual(['persist'])
    expect(await keepStorage(nav(false, false))).toBe('best-effort')
    expect(buildReport({ version: '1.0.0', locale: 'en' })).toContain('Storage: best-effort')
  })

  it('does not ask again once kept, nor in Firefox where asking shows a prompt', async () => {
    const kept = nav(true, true)
    expect(await keepStorage(kept)).toBe('persistent')
    const fx = nav(false, true, 'Mozilla/5.0 Firefox/140.0')
    expect(await keepStorage(fx)).toBe('best-effort')
    expect([...kept.calls, ...fx.calls]).toEqual([])
  })

  it('does nothing where the browser has no storage manager', async () => {
    storage.mode = 'unknown'
    expect(await keepStorage({})).toBe('unknown')
  })
})
