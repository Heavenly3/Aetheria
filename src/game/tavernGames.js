/* =========================================================
   TAVERN GAMES — Seven Crowns (cards against the keeper) and darts (aim at a moving board), both
   played for gold up to the tavern's betting limit. Rounds in play are kept in the save.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { CROWN_DECK, CROWNS, KEEPER_STANDS, CROWNS_BONUS, DART_RINGS, DART_THROWS, DART_PAYS } from './data/tavern.js'

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const sum = a => a.reduce((s, v) => s + v, 0)

export const tavernGames = {
  tavernGames() {
    const tv = this.s.tavern
    return (tv.games ||= { crowns: { played: 0, won: 0, net: 0, round: null }, darts: { played: 0, best: 0, net: 0, round: null } })
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

  /* ---------- Seven Crowns ---------- */
  // Each side starts with one card; the hero draws or stands, then the keeper draws to KEEPER_STANDS
  crownsStart(bet) {
    const g = this.tavernGames().crowns
    if (g.round) return null
    const b = this.takeBet(bet)
    if (!b) return null
    const deck = shuffle([...CROWN_DECK])
    g.round = { bet: b, deck, you: [deck.pop()], keeper: [deck.pop()], result: null }
    return g.round
  },
  crownsDraw() {
    const r = this.tavernGames().crowns.round
    if (!r || r.result) return null
    r.you.push(r.deck.pop())
    if (sum(r.you) > CROWNS) this.crownsSettle()
    return r
  },
  crownsStand() {
    const r = this.tavernGames().crowns.round
    if (!r || r.result) return null
    while (sum(r.keeper) < KEEPER_STANDS && r.deck.length) r.keeper.push(r.deck.pop())
    return this.crownsSettle()
  },
  crownsSettle() {
    const g = this.tavernGames().crowns, r = g.round
    const you = sum(r.you), keeper = sum(r.keeper)
    let kind
    if (you > CROWNS) kind = 'bust'
    else if (keeper > CROWNS || you > keeper) kind = you === CROWNS ? 'seven' : 'win'
    else if (you === keeper) kind = 'tie'
    else kind = 'lose'
    const back = kind === 'seven' ? Math.floor(r.bet * (2 + CROWNS_BONUS)) : kind === 'win' ? r.bet * 2 : kind === 'tie' ? r.bet : 0
    r.result = { kind, net: this.payOut(g, r.bet, back) }
    return r
  },
  // Clears a finished hand from the table
  crownsClear() { const g = this.tavernGames().crowns; if (g.round?.result) g.round = null },
  crownsSum: cards => sum(cards),

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
