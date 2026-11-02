import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { CROWNS, DART_THROWS } from '../src/game/data/tavern.js'

function table() {
  newHero()
  state.gold = 10000
}

describe('Seven Crowns', () => {
  it('takes the bet, deals one card each and pays by the rules', () => {
    table()
    expect(G.crownsStart(5)).toBe(null)
    const r = G.crownsStart(100)
    expect(state.gold).toBe(9900)
    expect(r.you).toHaveLength(1)
    expect(r.keeper).toHaveLength(1)
    expect(G.crownsStart(100)).toBe(null) // one hand at a time
    G.crownsStand()
    const { kind, net } = r.result
    expect(['seven', 'win', 'tie', 'lose']).toContain(kind)
    expect(state.gold).toBe(10000 + net)
    expect(G.crownsSum(r.keeper)).toBeGreaterThanOrEqual(6)
  })

  it('busts a hand that goes over seven', () => {
    table()
    const r = G.crownsStart(100)
    r.deck.push(4, 4)
    G.crownsDraw(); G.crownsDraw()
    expect(G.crownsSum(r.you)).toBeGreaterThan(CROWNS)
    expect(r.result.kind).toBe('bust')
    expect(state.gold).toBe(9900)
    G.crownsClear()
    expect(G.tavernGames().crowns.round).toBe(null)
  })
})

describe('darts', () => {
  it('scores three darts by their rings and pays by the total', () => {
    table()
    G.dartsStart(100)
    for (let i = 0; i < DART_THROWS; i++) G.dartsThrow(0.01)
    const r = G.tavernGames().darts.round
    expect(r.throws).toEqual([50, 50, 50])
    expect(r.result.mult).toBe(3)
    expect(state.gold).toBe(10000 + 200)
    expect(G.tavernGames().darts.best).toBe(150)
    G.dartsClear()
    G.dartsStart(100)
    for (let i = 0; i < DART_THROWS; i++) G.dartsThrow(2)
    expect(G.tavernGames().darts.round.result.net).toBe(-100)
  })

  it('steadies the hand with ranged training', () => {
    table()
    const low = G.dartsSteady()
    setLevel('ranged', 80)
    expect(G.dartsSteady()).toBeGreaterThan(low)
  })
})
