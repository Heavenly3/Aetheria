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
import { CROPS, ITEMS } from './data/items.js'
import { ACTIONS } from './data/actions.js'
import { CHARACTERS } from './data/journal.js'
import { seeded, dayKey } from './systems.js'
import { named } from '../i18n/bind.js'
import {
  BLOOM_CROP, BLOOM_SCORE, FREE_SEEDS, LOG_VALUE, BONFIRE_LEVELS, BONFIRE_TOKENS, SUNFISH, STAND_REQUESTS, STAND_REWARD, GIANT,
  WRAITH, wraithStats, GIFTS, GIFT_POINTS,
} from './data/festivalActs.js'

const DAY = 86400e3
let wraithCache = { key: '', m: null }
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
  festivalAction(time) { if (this.activeFestival() && Math.random() < TOKENS.actionChance * this.festTokenMult() * time / 3) this.addFestivalTokens(1) },
  festivalKill(m) {
    if (!this.activeFestival()) return
    if (m.boss) this.addFestivalTokens(TOKENS.boss)
    else if (Math.random() < TOKENS.killChance * this.festTokenMult()) this.addFestivalTokens(1)
  },
  // The summer bonfire raises everyone's token income
  festTokenMult() { return 1 + (this.activeFestival()?.id === 'summer' ? this.bonfireLevel() * BONFIRE_TOKENS : 0) },
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

  /* ================= the festival activities ================= */
  festAct() { return this.festivalState().act },
  festOn(id) { return this.activeFestival()?.id === id },

  /* ---------- spring: blooms ---------- */
  freeSeedsReady() { return this.festOn('spring') && this.festAct().seedsDay !== dayKey() },
  claimFreeSeeds() {
    if (!this.freeSeedsReady()) return 0
    this.festAct().seedsDay = dayKey()
    this.addItem(BLOOM_CROP + '_seed', FREE_SEEDS)
    return FREE_SEEDS
  },
  // How a bloom is judged: soil, a bountiful plot and the season all count
  bloomScore(p) {
    return BLOOM_SCORE.base + BLOOM_SCORE.soil[p.soil || 0] + (this.inSeason(p.crop) ? BLOOM_SCORE.season : 0)
  },
  // Called when a festival crop is harvested
  festivalHarvest(p, n) {
    if (!this.festOn('spring') || p.crop !== BLOOM_CROP) return 0
    const each = this.bloomScore(p) * (p.event === 'bountiful' ? BLOOM_SCORE.bountiful : 1)
    const a = this.festAct()
    a.blooms = (a.blooms || 0) + n
    a.bestBloom = Math.max(a.bestBloom || 0, each)
    this.addFestivalPoints(each * n)
    this.addFestivalTokens(n)
    return each * n
  },

  /* ---------- summer: the bonfire and the regatta ---------- */
  bonfireFed() { return this.festAct().fed || 0 },
  bonfireLevel() { const fed = this.s.festival?.act?.fed || 0; return BONFIRE_LEVELS.filter(x => fed >= x).length - 1 },
  feedBonfire(item, n = this.qty(item)) {
    n = Math.min(n, this.qty(item))
    if (!this.festOn('summer') || !LOG_VALUE[item] || n <= 0) return 0
    this.removeItem(item, n)
    const v = LOG_VALUE[item] * n, a = this.festAct()
    const before = this.bonfireLevel()
    a.fed = (a.fed || 0) + v
    this.addFestivalPoints(v)
    if (this.bonfireLevel() > before) this.emit('bonfire', { level: this.bonfireLevel() })
    return v
  },
  festivalCatch(fish) {
    if (!this.festOn('summer') || fish !== SUNFISH.item) return
    this.festAct().sunfish = (this.festAct().sunfish || 0) + 1
    this.addFestivalPoints(SUNFISH.points)
    this.addFestivalTokens(SUNFISH.tokens)
  },
  // Festival actions (the regatta water) only open while their festival runs
  festivalOpen(a) { return !a.festival || this.festOn(a.festival) },

  /* ---------- harvest: the fair stand and giant vegetables ---------- */
  standRequests() {
    if (!this.festOn('harvest')) return []
    const a = this.festAct(), day = dayKey()
    if (a.standDay !== day) {
      const rng = seeded('stand' + day + this.s.created)
      const crops = CROPS.filter(c => !c.hybrid && !c.festival && c.lvl <= this.level('farming') + 5).map(c => ({ item: c.id, qty: 10 + Math.floor(rng() * 16) }))
      const dishes = (ACTIONS.cooking || []).filter(x => x.lvl <= this.level('cooking') && Object.keys(x.out).length === 1 && !ITEMS[Object.keys(x.out)[0]]?.festival)
        .map(x => ({ item: Object.keys(x.out)[0], qty: 5 + Math.floor(rng() * 8) }))
      const pool = [...crops, ...dishes]
      const reqs = []
      while (reqs.length < STAND_REQUESTS && pool.length) reqs.push({ ...pool.splice(Math.floor(rng() * pool.length), 1)[0], done: false })
      Object.assign(a, { standDay: day, stand: reqs })
    }
    return a.stand
  },
  deliverStand(i) {
    const r = this.standRequests()[i]
    if (!r || r.done || this.qty(r.item) < r.qty) return null
    this.removeItem(r.item, r.qty)
    r.done = true
    const pts = STAND_REWARD.points[i] || STAND_REWARD.points[0]
    this.addFestivalPoints(pts)
    this.addFestivalTokens(STAND_REWARD.tokens)
    return pts
  },
  // A harvest during the harvest festival can turn up a giant vegetable
  festivalGiant() {
    if (this.festOn('harvest') && Math.random() < GIANT.chance) { this.addItem(GIANT.item, 1); return true }
    return false
  },
  deliverGiants() {
    const n = this.qty(GIANT.item)
    if (!this.festOn('harvest') || !n) return 0
    this.removeItem(GIANT.item, n)
    this.festAct().giants = (this.festAct().giants || 0) + n
    this.addFestivalPoints(GIANT.points * n)
    this.addFestivalTokens(GIANT.tokens * n)
    return n
  },

  /* ---------- winter: the Frost Wraith and gifts ---------- */
  // A creature that grows with the hero, met only during the winter festival
  festivalCreature() {
    const cl = this.combatLevel(), f = this.monsterMult()
    const key = cl + '|' + f
    if (wraithCache.key !== key) {
      const st = wraithStats(cl)
      wraithCache = { key, m: named({
        id: WRAITH.id, icon: WRAITH.icon, traits: ['chills'], weak: 'magic', festival: true, speed: st.speed, gold: st.gold,
        hp: Math.round(st.hp * f), att: Math.round(st.att * f), def: Math.round(st.def * f), maxHit: Math.max(1, Math.round(st.maxHit * f)),
        drops: [{ item: 'ice_shard', chance: 0.25, qty: [1, 2] }],
      }, 'festival.wraith') }
    }
    return wraithCache.m
  },
  canFightWraith() { return this.festOn('winter') },
  festivalCreatureKilled() {
    if (!this.festOn('winter')) return
    this.festAct().wraiths = (this.festAct().wraiths || 0) + 1
    this.addFestivalPoints(WRAITH.points)
    this.addFestivalTokens(WRAITH.tokens)
  },
  // The people of the journal the hero has met, and whether they had their gift today
  giftPeople() { return CHARACTERS.filter(c => GIFTS[c.id] && this.chapterUnlocked(c.met)) },
  giftGiven(id) { return this.festAct().gifts?.[id] === dayKey() },
  canGift(id, item) { return this.festOn('winter') && !!GIFTS[id]?.likes.includes(item) && this.qty(item) > 0 && !this.giftGiven(id) },
  giveGift(id, item) {
    if (!this.canGift(id, item)) return null
    this.removeItem(item, 1)
    const a = this.festAct()
    a.gifts = { ...(a.gifts || {}), [id]: dayKey() }
    this.addFestivalPoints(GIFT_POINTS)
    Object.entries(GIFTS[id].gives).forEach(([k, n]) => this.addItem(k, n))
    return GIFTS[id].gives
  },

  festivalReady() {
    return this.trackClaimable() + this.fairClaimable() + (this.freeSeedsReady() ? 1 : 0)
  },
}
