import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { DART_THROWS } from '../src/game/data/tavern.js'
import { handValue } from '../src/game/tavernGames.js'

function table() {
  newHero()
  state.gold = 10000
}

const card = (r, s = '♠') => ({ r, s })

describe('blackjack', () => {
  it('counts faces as ten and aces as one or eleven', () => {
    expect(handValue([card('K'), card('A')])).toBe(21)
    expect(handValue([card('A'), card('A'), card('9')])).toBe(21)
    expect(handValue([card('10'), card('5'), card('A')])).toBe(16)
    expect(handValue([card('Q'), card('J'), card('2')])).toBe(22)
  })

  it('takes the bet, deals two cards each and lets the keeper draw to 17', () => {
    table()
    expect(G.cardsStart(5)).toBe(null)
    const r = G.cardsStart(100)
    expect(state.gold).toBe(9900)
    expect(r.you).toHaveLength(2)
    expect(G.cardsStart(100)).toBe(null) // one hand at a time
    if (!r.result) G.cardsStand()
    expect(['natural', 'keeperNatural', 'win', 'keeperBust', 'push', 'lose']).toContain(r.result.kind)
    if (!['natural', 'keeperNatural'].includes(r.result.kind)) expect(handValue(r.keeper)).toBeGreaterThanOrEqual(17)
    expect(state.gold).toBe(10000 + r.result.net)
  })

  it('pays a natural three to two and loses a hand that goes over', () => {
    table()
    let r = G.cardsStart(100)
    r.result = null
    r.you = [card('A'), card('K')]; r.keeper = [card('9'), card('7')]
    G.cardsSettle()
    expect(r.result.kind).toBe('natural')
    expect(r.result.net).toBe(150)
    G.cardsClear()
    r = G.cardsStart(100)
    r.result = null
    r.you = [card('10'), card('9')]; r.keeper = [card('10'), card('7')]
    r.deck.push(card('5'))
    G.cardsHit()
    expect(r.result.kind).toBe('bust')
  })

  it('doubles the bet for exactly one more card', () => {
    table()
    const r = G.cardsStart(100)
    r.result = null
    r.you = [card('5'), card('6')]; r.keeper = [card('10'), card('8')]
    r.deck.push(card('10'))
    G.cardsDouble()
    expect(r.you).toHaveLength(3)
    expect(r.bet).toBe(200)
    expect(r.result.kind).toBe('win')
    expect(state.gold).toBe(10000 + 200)
  })

  it('carries over the record of Seven Crowns and gives back a hand left open', () => {
    table()
    state.tavern.games = { crowns: { played: 4, won: 2, net: 50, round: { bet: 300, result: null } }, darts: { played: 0, best: 0, net: 0, round: null } }
    const g = G.tavernGames()
    expect(g.crowns).toBeUndefined()
    expect(g.cards).toMatchObject({ played: 4, won: 2, net: 50, round: null })
    expect(state.gold).toBe(10300)
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
