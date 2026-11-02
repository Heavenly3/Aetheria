/* =========================================================
   TAVERN GAMES — blackjack against the keeper and darts (aim at a moving board), both
   played for gold up to the tavern's betting limit. Rounds in play are kept in the save.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { CARD_RANKS, CARD_SUITS, BLACKJACK, KEEPER_STANDS, NATURAL_PAYS, DART_RINGS, DART_THROWS, DART_PAYS } from './data/tavern.js'

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const sum = a => a.reduce((s, v) => s + v, 0)
const freshDeck = () => shuffle(CARD_SUITS.flatMap(s => CARD_RANKS.map(r => ({ r, s }))))
// A hand's value: aces count 11 unless that would go over 21
export function handValue(cards) {
  let v = 0, aces = 0
  for (const c of cards) {
    if (c.r === 'A') { v += 11; aces++ } else v += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r
  }
  while (v > BLACKJACK && aces--) v -= 10
  return v
}
const natural = cards => cards.length === 2 && handValue(cards) === BLACKJACK

export const tavernGames = {
  tavernGames() {
    const tv = this.s.tavern
    const g = (tv.games ||= { cards: { played: 0, won: 0, net: 0, round: null }, darts: { played: 0, best: 0, net: 0, round: null } })
    // Saves from when the card game was Seven Crowns: its record carries over, and a hand left open gives its bet back
    if (g.crowns) {
      if (g.crowns.round && !g.crowns.round.result) this.s.gold += g.crowns.round.bet
      g.cards = { played: g.crowns.played, won: g.crowns.won, net: g.crowns.net, round: null }
      delete g.crowns
    }
    return g
  },
  // A bet the table takes: at least 10 gold, at most the tavern's limit and the hero's purse
  takeBet(bet) {
    bet = Math.floor(bet)
    if (!(bet >= 10) || bet > this.maxBet()) return 0
    this.s.gold -= bet
    return bet
  },
  payOut(game, bet, back) {
    if (back > 0) this.s.gold += back
    const net = back - bet
    if (net > 0) this.s.stats.goldEarned += net
    game.net += net
    game.played++
    if (net > 0) game.won = (game.won || 0) + 1
    this.rollPet(src => src.dice)
    return net
  },

  /* ---------- blackjack ---------- */
  // Two cards each, the keeper's second face down; a natural blackjack settles at once
  cardsStart(bet) {
    const g = this.tavernGames().cards
    if (g.round) return null
    const b = this.takeBet(bet)
    if (!b) return null
    const deck = freshDeck()
    g.round = { id: Date.now(), bet: b, deck, you: [deck.pop(), deck.pop()], keeper: [deck.pop(), deck.pop()], doubled: false, result: null }
    if (natural(g.round.you) || natural(g.round.keeper)) this.cardsSettle()
    return g.round
  },
  cardsHit() {
    const r = this.tavernGames().cards.round
    if (!r || r.result) return null
    r.you.push(r.deck.pop())
    if (handValue(r.you) >= BLACKJACK) return this.cardsStand()
    return r
  },
  cardsStand() {
    const r = this.tavernGames().cards.round
    if (!r || r.result) return null
    if (handValue(r.you) <= BLACKJACK) while (handValue(r.keeper) < KEEPER_STANDS) r.keeper.push(r.deck.pop())
    return this.cardsSettle()
  },
  // Double the bet for exactly one more card, then stand
  canDouble() { const r = this.tavernGames().cards.round; return !!r && !r.result && r.you.length === 2 && this.s.gold >= r.bet },
  cardsDouble() {
    const r = this.tavernGames().cards.round
    if (!this.canDouble()) return null
    this.s.gold -= r.bet
    r.bet *= 2
    r.doubled = true
    r.you.push(r.deck.pop())
    return this.cardsStand()
  },
  cardsSettle() {
    const g = this.tavernGames().cards, r = g.round
    const you = handValue(r.you), keeper = handValue(r.keeper)
    let kind
    if (natural(r.you) && natural(r.keeper)) kind = 'push'
    else if (natural(r.you)) kind = 'natural'
    else if (natural(r.keeper)) kind = 'keeperNatural'
    else if (you > BLACKJACK) kind = 'bust'
    else if (keeper > BLACKJACK) kind = 'keeperBust'
    else kind = you > keeper ? 'win' : you === keeper ? 'push' : 'lose'
    const back = kind === 'natural' ? Math.floor(r.bet * (1 + NATURAL_PAYS)) : ['win', 'keeperBust'].includes(kind) ? r.bet * 2 : kind === 'push' ? r.bet : 0
    r.result = { kind, net: this.payOut(g, r.bet, back) }
    return r
  },
  cardsClear() { const g = this.tavernGames().cards; if (g.round?.result) g.round = null },

  /* ---------- darts ---------- */
  // How steady the hero's hand is, from 0 to 1: ranged training calms the aim
  dartsSteady() { return Math.min(1, this.level('ranged') / 99) },
  dartsStart(bet) {
    const g = this.tavernGames().darts
    if (g.round) return null
    const b = this.takeBet(bet)
    if (!b) return null
    g.round = { bet: b, throws: [], result: null }
    return g.round
  },
  // dist: how far from the centre the dart landed, as a share of the board's radius
  dartsThrow(dist) {
    const g = this.tavernGames().darts, r = g.round
    if (!r || r.result || r.throws.length >= DART_THROWS) return null
    const ring = DART_RINGS.find(x => dist <= x.r)
    r.throws.push(ring ? ring.pts : 0)
    if (r.throws.length >= DART_THROWS) {
      const total = sum(r.throws)
      g.best = Math.max(g.best, total)
      const pay = DART_PAYS.find(p => total >= p.min)
      r.result = { total, mult: pay?.mult || 0, net: this.payOut(g, r.bet, Math.floor(r.bet * (pay?.mult || 0))) }
    }
    return r
  },
  dartsClear() { const g = this.tavernGames().darts; if (g.round?.result) g.round = null },
}
