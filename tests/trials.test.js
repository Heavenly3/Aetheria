import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { TRIALS, TRIAL_SHARDS } from '../src/game/data/trials.js'
import { i18n } from '../src/i18n/index.js'

const readyToAscend = () => { for (const k of Object.keys(state.skills)) setLevel(k, 30) }

describe('trials for the next life', () => {
  it('names every trial, its rule and its reward', () => {
    for (const tr of TRIALS) for (const k of ['name', 'rule']) expect(i18n.global.te(`trials.list.${tr.id}.${k}`, 'en')).toBe(true)
    expect(i18n.global.te('ach.allTrials.name', 'en')).toBe(true)
  })

  it('starts the next life under the chosen rule', () => {
    newHero()
    readyToAscend()
    G.ascend('frail')
    expect(G.trial()).toBe('frail')
    const frail = G.maxHp()
    G.giveUpTrial()
    expect(G.maxHp()).toBeGreaterThan(frail)
  })

  it('enforces each rule', () => {
    newHero()
    G.addItem('shrimp', 5)
    state.hp = 1
    state.ascension.trial = 'fasting'
    expect(G.eat('shrimp')).toBe(false)
    state.ascension.trial = 'selfmade'
    state.gold = 1000
    expect(G.buy('logs', 1, 1)).toBe(false)
    expect(state.gold).toBe(1000)
    state.ascension.trial = 'arcane'
    G.setStyleType('melee')
    expect(G.attackBlocker()?.key).toBe('trials.onlyMagic')
    state.ascension.trial = null
    expect(G.eat('shrimp')).toBe(true)
  })

  it('completes a trial by ascending under it: more shards and a lasting bonus', () => {
    newHero()
    readyToAscend()
    G.ascend('selfmade')
    readyToAscend()
    const plain = Math.floor(G.shardsForAscension() / TRIAL_SHARDS)
    expect(G.shardsForAscension()).toBeGreaterThan(plain)
    const gold = G.mod('gold')
    G.ascend()
    expect(G.trialDone('selfmade')).toBe(true)
    expect(G.trial()).toBe(null)
    expect(G.mod('gold')).toBeCloseTo(gold + TRIALS.find(t => t.id === 'selfmade').reward.gold)
  })
})
