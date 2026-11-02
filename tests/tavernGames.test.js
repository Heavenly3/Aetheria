import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { DART_THROWS, TABA_FACES, ARM_RIVALS, RUNE_PAYS } from '../src/game/data/tavern.js'
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
    // As if the deal had just taken the bet (a natural on the first deal would have settled it already)
    state.gold = 9900
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

describe('the other tables', () => {
  it('throws the knucklebone and pays by its face', () => {
    table()
    const r = G.tabaThrow(100)
    expect(['luck', 'flesh', 'belly', 'hollow']).toContain(r.face)
    expect(state.gold).toBe(10000 + r.result.net)
    expect(TABA_FACES.reduce((s, f) => s + f.p, 0)).toBeCloseTo(1)
  })

  it('climbs the arm-wrestling ladder one rival at a time and pays by the rival beaten', () => {
    table()
    expect(G.armStart(100, 'nobody')).toBe(null)
    expect(G.armTop()).toBe(0)
    expect(G.armStart(100, 'ogre')).toBe(null) // not reached yet
    G.armStart(100, 'farmhand')
    G.armEnd(true)
    expect(state.gold).toBe(10000 + 100 * (ARM_RIVALS[0].mult - 1))
    expect(G.armTop()).toBe(1)
    expect(G.armStart(100, ARM_RIVALS[1].id)).toBeTruthy()
    G.armEnd(false)
    expect(G.armTop()).toBe(1) // a loss keeps the rungs already opened
    expect(G.table('arm').recent[0]).toBe(-100)
    const low = G.armPush()
    setLevel('strength', 90)
    expect(G.armPush()).toBeGreaterThan(low)
  })

  it('ends the drinking contest on a spill, a stagger of the rival or the last tankard', () => {
    table()
    G.beerStart(100)
    expect(G.beerDrink(false).result.kind).toBe('spill')
    G.tableClear('beer')
    G.beerStart(100)
    let r
    do r = G.beerDrink(true)
    while (!r.result)
    expect(['win', 'tie']).toContain(r.result.kind)
    expect(G.beerZone(5)).toBeLessThan(G.beerZone(0))
  })

  it('plays three men’s morris: no centre first, the keeper blocks, a line wins', () => {
    table()
    G.morrisStart(100)
    expect(G.morrisTargets(null)).not.toContain(4)
    const r = G.table('morris').round
    G.morrisPlay(null, 0)
    expect(r.board.filter(v => v === 'keeper')).toHaveLength(1)
    // Two in a row for the hero: the keeper takes the third spot (its mind not wandering this time)
    r.board = ['you', 'you', null, null, 'keeper', null, null, null, null]
    r.placed = { you: 2, keeper: 1 }
    const real = Math.random
    Math.random = () => 0.5
    G.morrisPlay(null, 8)
    Math.random = real
    expect(r.board[2]).toBe('keeper')
    // A line of three wins
    G.tableClear('morris'); G.table('morris').round = null
    G.morrisStart(100)
    const q = G.table('morris').round
    q.board = ['you', 'you', null, 'keeper', 'keeper', null, null, null, null]
    q.placed = { you: 2, keeper: 2 }
    G.morrisPlay(null, 2)
    expect(q.result.kind).toBe('win')
  })

  it('follows the marked rune through the swaps', () => {
    table()
    const r = G.runesStart(100)
    const end = G.runesEnd(r)
    G.runesPick(end)
    expect(r.result.kind).toBe('win')
    expect(state.gold).toBe(10000 + 100 * (RUNE_PAYS - 1))
  })
})
