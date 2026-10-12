/* =========================================================
   FESTIVALS — the big seasonal festivals and the weekend fairs.
   Tokens are spent in the festival shop; points (never spent) climb the festival track and its ranking.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import {
  FESTIVAL_MAP, TOKENS, shopFor, festivalAt, TRACK, FAIRS, FAIR_REWARDS, fairAt, MARKET, TOWER_RUSH_MULT, OMEN_NIGHT_MULT, rivalPoints,
} from './data/festivals.js'
import { guildRoster } from './data/guilds.js'
import { PET_MAP } from './data/pets.js'
import { FEATURES } from './features.js'

const DAY = 86400e3
// Which festival or fair is on only changes by date, so it is looked up at most every 30 seconds
let festCache = { at: 0, win: null, fair: null }
const lookup = () => {
  const now = Date.now()
  if (Math.abs(now - festCache.at) > 30000) festCache = { at: now, win: festivalAt(new Date(now)), fair: fairAt(new Date(now)) }
  return festCache
}

export const festivalsState = () => ({
  // key: the festival run ('harvest-2026') · tokens / earned: to spend / earned this run · points: this run's points
  // claimed: track steps paid · bought: shop entries bought this run
  festival: { key: null, tokens: 0, earned: 0, points: 0, claimed: {}, bought: {}, act: {} },
  // The weekend fair: its key, the fair points made in it, rewards paid and what was bought at the market
  fair: { key: null, points: 0, claimed: {}, market: {} },
})

export const festivals = {
  /* ================= the big festivals ================= */
  festivalWindow() { return FEATURES.festivals ? lookup().win : null },
  activeFestival() { return this.festivalWindow()?.festival || null },
  // The festival part of the save, reset when a new festival run begins
  festivalState() {
    const w = this.festivalWindow(), st = this.s.festival
    if (w && st.key !== w.key) Object.assign(st, { key: w.key, tokens: 0, earned: 0, points: 0, claimed: {}, bought: {}, act: {} })
    st.claimed ||= {}
    st.act ||= {}
    return st
  },
  festivalMods(key) { return this.activeFestival()?.mods[key] || 0 },
  addFestivalTokens(n) {
    if (!n || !this.activeFestival()) return
    const st = this.festivalState()
    st.tokens += n
    st.earned += n
    this.addFestivalPoints(n)
  },
  // Points never get spent: they climb the track and the ranking
  addFestivalPoints(n) {
    if (!n || !this.activeFestival()) return
    const st = this.festivalState()
    st.points = (st.points || 0) + Math.round(n * (1 + this.mod('festPoints')))
  },
  festivalAction(time) { if (this.activeFestival() && Math.random() < TOKENS.actionChance * time / 3) this.addFestivalTokens(1) },
  festivalKill(m) {
    if (!this.activeFestival()) return
    if (m.boss) this.addFestivalTokens(TOKENS.boss)
    else if (Math.random() < TOKENS.killChance) this.addFestivalTokens(1)
  },
  festivalTask() { this.addFestivalTokens(TOKENS.task) },

  /* ---------- the track ---------- */
  trackReady(i) { return this.activeFestival() && (this.festivalState().points || 0) >= TRACK[i].pts && !this.festivalState().claimed[i] },
  claimTrack(i) {
    if (!this.trackReady(i)) return null
    const st = this.festivalState(), r = TRACK[i].reward
    st.claimed[i] = true
    if (r.tokens) { st.tokens += r.tokens; st.earned += r.tokens }
    Object.entries(r.items || {}).forEach(([k, n]) => this.addItem(k, n))
    return r
  },
  trackClaimable() { return this.activeFestival() ? TRACK.filter((_, i) => this.trackReady(i)).length : 0 },

  /* ---------- the ranking ---------- */
  festivalDays(now = Date.now()) { const w = this.festivalWindow(); return w ? Math.max(0, (now - w.start) / DAY) : 0 },
  festivalRanking() {
    const days = this.festivalDays(), s = this.s.guilds
    const day = Math.floor(Date.now() / DAY)
    const list = []
    for (const g of this.guildList()) {
      for (const m of guildRoster(g, day, s.founded).slice(0, 2)) list.push({ name: m.name, role: m.role, guild: g.id, points: rivalPoints(m, g.tier, days, g.seed) })
    }
    list.push({ name: this.s.name, role: this.s.role, points: this.festivalState().points || 0, hero: true })
    return list.sort((a, b) => b.points - a.points || (b.hero ? 1 : 0) - (a.hero ? 1 : 0)).map((r, i) => ({ ...r, place: i + 1 }))
  },

  /* ---------- the shop ---------- */
  festivalShop() { const f = this.activeFestival(); return f ? shopFor(f) : [] },
  // One-off entries (pet and cosmetics) can only be bought once, ever
  festivalOwned(e) {
    if (e.kind === 'pet') return this.hasPet(e.ref)
    if (e.kind === 'item') return false
    return !!this.s.cosmetics.owned[`${e.kind}:${e.ref}`]
  },
  canBuyFestival(e) { return !!this.activeFestival() && !this.festivalOwned(e) && this.festivalState().tokens >= e.cost },
  buyFestival(id) {
    const e = this.festivalShop().find(x => x.id === id)
    if (!e || !this.canBuyFestival(e)) return false
    const st = this.festivalState()
    st.tokens -= e.cost
    st.bought[e.id] = (st.bought[e.id] || 0) + 1
    if (e.kind === 'pet') this.awardPet(PET_MAP[e.ref])
    else if (e.kind === 'item') this.addItem(e.ref, e.qty)
    else this.s.cosmetics.owned[`${e.kind}:${e.ref}`] = Date.now()
    return true
  },
  festivalById(id) { return FESTIVAL_MAP[id] },

  /* ================= the weekend fairs ================= */
  fairWindow() { return FEATURES.festivals ? lookup().fair : null },
  activeFair() { return this.fairWindow()?.fair || null },
  fairState() {
    const w = this.fairWindow(), st = (this.s.fair ||= festivalsState().fair)
    if (w && st.key !== w.key) Object.assign(st, { key: w.key, points: 0, claimed: {}, market: {} })
    return st
  },
  addFairPoints(n) {
    if (!n || !this.activeFair()) return
    this.fairState().points += n
  },
  fairReady(i) { return !!this.activeFair() && this.fairState().points >= FAIR_REWARDS[i].pts && !this.fairState().claimed[i] },
  claimFair(i) {
    if (!this.fairReady(i)) return null
    const r = FAIR_REWARDS[i].reward
    this.fairState().claimed[i] = true
    if (r.gold) this.addGold(r.gold)
    Object.entries(r.items || {}).forEach(([k, n]) => this.addItem(k, n))
    return r
  },
  fairClaimable() { return this.activeFair() ? FAIR_REWARDS.filter((_, i) => this.fairReady(i)).length : 0 },
  // Fishing derby: every fish caught scores its level
  fairCatch(fishLvl) { if (this.activeFair() === 'derby') this.addFairPoints(Math.max(1, Math.round(fishLvl / 5))) },
  // Tower rush: tower tokens doubled, and every floor scores
  towerTokenMult() { return this.activeFair() === 'tower_rush' ? TOWER_RUSH_MULT : 1 },
  fairFloor() { if (this.activeFair() === 'tower_rush') this.addFairPoints(2) },
  // Night of omens: omens far likelier, and each one witnessed scores
  omenFairMult() { return this.activeFair() === 'omen_night' ? OMEN_NIGHT_MULT : 1 },
  fairOmen() { if (this.activeFair() === 'omen_night') this.addFairPoints(40) },
  // Market day: a stall with limited stock; every purchase scores
  marketLeft(e) { return e.stock - (this.fairState().market[e.id] || 0) },
  canBuyMarket(e) { return this.activeFair() === 'market' && this.marketLeft(e) > 0 && this.s.gold >= e.gold },
  buyMarket(id) {
    const e = MARKET.find(x => x.id === id)
    if (!e || !this.canBuyMarket(e)) return false
    this.s.gold -= e.gold
    this.fairState().market[e.id] = (this.fairState().market[e.id] || 0) + 1
    this.addItem(e.item, e.qty)
    this.addFairPoints(Math.round(e.gold / 100))
    return true
  },
  fairInfo(id) { return FAIRS[id] },

  festivalReady() { return this.trackClaimable() + this.fairClaimable() },
}
