/* =========================================================
   SYSTEMS — tavern staff, expeditions, daily orders, the bar,
   action queue, locked items, loadouts, prayers, grace rewards,
   daily market, random events and stat history.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { XP_TABLE } from './data/skills.js'
import { ITEMS, SLOTS } from './data/items.js'
import { ACTIONS, findAction, outputsOf } from './data/actions.js'
import { DUNGEONS } from './data/combat.js'
import {
  SPECIALTIES, RARITIES, TRAITS, WORKER_NAMES, WAGE_BASE, HIRE_FEE_HOURS, BOARD_REFRESH, TAVERN_LEVELS,
  EXPEDITIONS, EXPEDITION_DURATIONS, INJURY_TIME, DRINKS, DRINK_DURATION, MYSTERY_CHEST, ORDERS_PER_DAY, ORDER_SKILLS,
  crewSize as crewSizeAt, CREW_LEVEL_EACH, CREW_HAUL_EACH, TRIP_ROLES, TRIP_EVENTS, tripEventCount, HOME_CHANCE, HOME_LOOT,
  TRUST_TRIP, TRUST_TRIP_FAIL, TRUST_SAVE, REPORTS_KEPT, VETERAN_LEVELS, PROMOTIONS, PROMOTE_HOURS, RARITY_ORDER,
} from './data/tavern.js'
import { UNIQUE_MERCS, TRUST_MAX, HURT_TIME } from './data/company.js'
import { PRAYERS, PRAYER_DRAIN, PRAYER_BONES, GRACE_COSTS, GRACE_SPEED } from './data/extras.js'
import { AVATARS } from './data/character.js'
import { AUDIO_DEFAULTS } from './data/audio.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const msg = (key, params = {}) => ({ key, params })
const HISTORY_MAX = 288 // 24 h with one sample every 5 minutes

// Seeded PRNG used for the daily market and daily orders
export function seeded(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const LOADOUT_SLOTS = 5
export const extraState = () => ({
  tavern: { level: 1, board: [], boardAt: 0, workers: [], trips: [], tokens: 0, orders: [], ordersDay: '', drink: null, uid: 0, reports: [], dice: { played: 0, won: 0, net: 0 }, patrons: [], patronAt: 0, rep: 0 },
  queue: [],
  locked: {},
  loadouts: Array(LOADOUT_SLOTS).fill(null),
  prayer: null,
  prayerTimer: 0,
  grace: 0,
  event: null,
  history: [],
  // Volumes are 0-100; muteHidden silences the game while its tab is in the background
  settings: {
    sound: true, notify: false, autoChain: true, music: true, ambience: true,
    masterVol: 80, musicVol: 45, ambienceVol: 50, sfxVol: 70, voices: true, voiceVol: 60, voiceSpeed: 'normal', muteHidden: true, reduceMotion: false, compactNumbers: true, quietToasts: false, muted: false,
    // Backups: the reminder to keep a copy outside the browser, when the save was last downloaded or shared and when it last reminded
    backupReminder: true, lastExport: 0, remindedAt: 0,
    // Display and guidance: text size, which pop-ups show, the next-step bar and the welcome-back summary
    textSize: 'normal', toasts: 'all', goalBar: true, offlineSummary: true,
    // Sound settings added later: alerts, packs, palettes, music mode and accessibility
    ...AUDIO_DEFAULTS, cues: {},
  },
  dungeonsBy: {},
})

let marketCache = { day: '', table: {} }

export const systems = {
  /* ================= tavern ================= */
  tavernInfo() { return TAVERN_LEVELS[this.s.tavern.level - 1] },
  nextTavern() { return TAVERN_LEVELS[this.s.tavern.level] || null },
  tavernUpgradeBlocker() {
    const n = this.nextTavern()
    if (!n) return 'tavern.maxLevel'
    return this.canAffordCost(n.cost) ? null : 'common.missingMaterials'
  },
  upgradeTavern() {
    if (this.tavernUpgradeBlocker()) return false
    this.payCost(this.nextTavern().cost)
    this.s.tavern.level++
    this.log('beer-horn', 'log.tavernLevel', { tavern: '@tavern:' + this.s.tavern.level })
    return true
  },
  canAffordCost(cost) { return Object.entries(cost).every(([k, q]) => (k === 'gold' ? this.s.gold >= q : k === 'tokens' ? this.s.tavern.tokens >= q : this.qty(k) >= q)) },
  payCost(cost) {
    Object.entries(cost).forEach(([k, q]) => {
      if (k === 'gold') this.s.gold -= q
      else if (k === 'tokens') this.s.tavern.tokens -= q
      else if (q > 0) this.removeItem(k, q)
    })
  },

  /* ---------- staff ---------- */
  traitSum(w, key) { return (w.traits || []).reduce((s, tr) => s + (TRAITS[tr]?.[key] || 0), 0) },
  workerLevel(w) { return this.levelFromXp(w.xp) },
  workerProgress(w) {
    const l = this.workerLevel(w)
    return l >= 99 ? 1 : (w.xp - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l])
  },
  workerWage(w) { return Math.max(1, Math.round(WAGE_BASE * RARITIES[w.rarity].wage * (1 + this.workerLevel(w) / 10) * (1 + this.traitSum(w, 'wage')))) },
  workerEff(w) { return Math.max(0.1, (RARITIES[w.rarity].eff + this.traitSum(w, 'speed')) * (1 + this.workerLevel(w) * 0.004)) },
  hireFee(w) { return this.workerWage(w) * HIRE_FEE_HOURS },
  genCandidate() {
    const lvl = this.s.tavern.level
    const specs = Object.keys(SPECIALTIES).filter(k => SPECIALTIES[k].tavern <= lvl)
    const rars = Object.entries(RARITIES).filter(([, r]) => r.tavern <= lvl)
    let roll = Math.random() * rars.reduce((s, [, r]) => s + r.weight, 0)
    let rarity = rars[0][0]
    for (const [k, r] of rars) { if ((roll -= r.weight) < 0) { rarity = k; break } }
    const R = RARITIES[rarity]
    const traits = []
    const keys = Object.keys(TRAITS)
    while (traits.length < R.traits) { const tr = pick(keys); if (!traits.includes(tr)) traits.push(tr) }
    return {
      name: pick(WORKER_NAMES), avatar: pick(AVATARS), spec: pick(specs), rarity, traits,
      xp: XP_TABLE[rand(R.lvl[0], R.lvl[1])],
    }
  },
  refreshBoard(force = false) {
    const tv = this.s.tavern
    if (!force && Date.now() < tv.boardAt && tv.board.length) return
    tv.board = Array.from({ length: this.tavernInfo().board }, () => this.genCandidate())
    tv.boardAt = Date.now() + BOARD_REFRESH * 1000
  },
  rerollCost() { return 100 * this.s.tavern.level },
  rerollBoard(useToken = false) {
    if (useToken) { if (this.s.tavern.tokens < 1) return false; this.s.tavern.tokens -= 1 }
    else { if (this.s.gold < this.rerollCost()) return false; this.s.gold -= this.rerollCost() }
    this.refreshBoard(true)
    return true
  },
  freeSlots() { return this.tavernInfo().slots - this.s.tavern.workers.length },
  hire(i) {
    const tv = this.s.tavern
    const c = tv.board[i]
    if (!c || this.freeSlots() <= 0 || this.s.gold < this.hireFee(c)) return false
    this.s.gold -= this.hireFee(c)
    tv.workers.push({ ...c, uid: (tv.uid = (tv.uid || 0) + 1), task: null, status: 'idle', injured: 0, exp: null, made: 0, vet: VETERAN_LEVELS.filter(l => this.workerLevel(c) >= l).length })
    tv.board.splice(i, 1)
    this.log(SPECIALTIES[c.spec].icon, 'log.hired', { name: c.name, spec: '@spec:' + c.spec, rarity: '@rarity:' + c.rarity })
    return true
  },
  fire(uid) {
    const tv = this.s.tavern
    const w = tv.workers.find(x => x.uid === uid)
    if (!w) return false
    this.leaveTrip({ k: 'w', uid })
    tv.workers = tv.workers.filter(x => x.uid !== uid)
    this.log('beer-horn', 'log.fired', { name: w.name })
    return true
  },
  workerActions(w) {
    const sk = SPECIALTIES[w.spec].skill
    return sk ? ACTIONS[sk] || [] : []
  },
  assign(uid, actionId) {
    const w = this.s.tavern.workers.find(x => x.uid === uid)
    if (!w || w.exp || w.injured > 0) return false
    const a = findAction(SPECIALTIES[w.spec].skill, actionId)
    if (!a || this.workerLevel(w) < a.lvl) return false
    w.task = { action: actionId, progress: 0 }
    w.status = 'working'
    return true
  },
  unassign(uid) {
    const w = this.s.tavern.workers.find(x => x.uid === uid)
    if (w) { w.task = null; w.status = 'idle' }
  },
  wagesPerHour() { return this.s.tavern.workers.filter(w => w.task && w.status === 'working').reduce((s, w) => s + this.workerWage(w), 0) },
  updateWorkers(dt) {
    for (const w of this.s.tavern.workers) {
      if (w.injured > 0) { w.injured = Math.max(0, w.injured - dt); if (w.injured <= 0 && !w.task && !w.exp) w.status = 'idle'; continue }
      if (w.exp) continue
      if (!w.task) continue
      const skill = SPECIALTIES[w.spec].skill
      const a = findAction(skill, w.task.action)
      if (!a) { w.task = null; w.status = 'idle'; continue }
      if (!this.hasItems(a.in)) { w.status = 'nomat'; continue }
      const cost = (this.workerWage(w) / 3600) * dt
      if (this.s.gold < cost) {
        if (w.status !== 'unpaid') { w.status = 'unpaid'; this.emit('notify', msg('notify.unpaid', { name: w.name })) }
        continue
      }
      this.s.gold -= cost
      this.s.stats.wages = (this.s.stats.wages || 0) + cost
      w.status = 'working'
      w.task.progress += dt
      const dur = a.time / this.workerEff(w)
      while (w.task && w.task.progress >= dur) {
        if (!this.hasItems(a.in)) { w.status = 'nomat'; break }
        w.task.progress -= dur
        this.workerComplete(w, skill, a)
      }
    }
  },
  workerComplete(w, skill, a) {
    if (!(Object.keys(a.in).length && Math.random() < this.traitSum(w, 'preserve'))) Object.entries(a.in).forEach(([k, q]) => this.removeItem(k, q))
    const lvl = this.workerLevel(w)
    w.xp = Math.min(XP_TABLE[99], w.xp + a.xp * (1 + this.traitSum(w, 'xp')) * this.diff().xp)
    this.workerGrew(w, lvl)
    this.s.stats.workerActions = (this.s.stats.workerActions || 0) + 1
    const clumsy = this.traitSum(w, 'clumsy')
    if (a.fail && Math.random() < clamp(0.55 - (lvl - a.lvl) * 0.012 + clumsy, 0.05, 0.6)) return
    if (a.burn && Math.random() < Math.max(0, 0.45 - (lvl - a.lvl) * 0.025) + clumsy) { this.addItem('burnt_food', 1); return }
    const double = Math.random() < this.traitSum(w, 'double') ? 2 : 1
    // Fishers cast into the water like the hero, without bait
    if (a.catch) { this.addItem(this.rollCatch(a, lvl, false), double); w.made = (w.made || 0) + double }
    Object.entries(a.out).forEach(([k, q]) => {
      const n = (a.runeMult ? q * (1 + Math.floor((lvl - a.lvl) / 12)) : q) * double
      this.addItem(k, n)
      w.made = (w.made || 0) + n
    })
    if (a.gold) this.addGold(rand(a.gold[0], a.gold[1]) * double, true)
    ;(a.extra || []).forEach(e => { if (Math.random() < e.chance * 0.5) this.addItem(e.item, rand(e.qty[0], e.qty[1])) })
  },
  workersBusy() { return this.s.tavern.workers.some(w => (w.task && w.status === 'working') || w.exp || w.injured > 0) },

  /* ---------- expeditions ---------- */
  // A crew is a list of hands: { k: 'w', uid } for an adventurer on the staff, { k: 'c', id } for a
  // member of the company. Each trip keeps its crew until it comes home
  ensureTrips() {
    const tv = this.s.tavern
    if (!Array.isArray(tv.trips)) tv.trips = []
    // Saves from before crews: an adventurer out alone becomes a trip of one
    for (const w of tv.workers) {
      if (!w.exp?.id) continue
      const trip = { uid: (tv.uid = (tv.uid || 0) + 1), exp: w.exp.id, hours: w.exp.hours, mult: w.exp.mult, t: w.exp.t, total: w.exp.total, crew: [{ k: 'w', uid: w.uid }], repeat: false }
      tv.trips.push(trip)
      w.exp = { trip: trip.uid }
    }
  },
  crewSize() { return crewSizeAt(this.s.tavern.level) },
  hand(ref) { return ref.k === 'w' ? this.s.tavern.workers.find(w => w.uid === ref.uid) || null : this.companyMember(ref.id) },
  handKey: ref => (ref.k === 'w' ? 'w' + ref.uid : 'c' + ref.id),
  handLevel(ref) { const h = this.hand(ref); return !h ? 0 : ref.k === 'w' ? this.workerLevel(h) : h.lvl },
  handTrade(ref) { return ref.k === 'w' ? 'adventurer' : this.hand(ref)?.role },
  tripOf(ref) { const key = this.handKey(ref); return this.s.tavern.trips?.find(t => t.crew.some(c => this.handKey(c) === key)) || null },
  memberAway(id) { return !!this.tripOf({ k: 'c', id }) },
  // Who could set out now: adventurers on the staff and the company, neither away, hurt nor working a trip
  crewChoices() {
    const out = []
    for (const w of this.s.tavern.workers) if (w.spec === 'adventurer') out.push({ k: 'w', uid: w.uid })
    for (const m of this.s.company?.members || []) out.push({ k: 'c', id: m.id })
    return out
  },
  handFree(ref) {
    const h = this.hand(ref)
    if (!h || this.tripOf(ref)) return false
    return ref.k === 'w' ? !(h.injured > 0) : !this.mercHurt(h)
  },
  // What the crew brings: their level, the bonuses of their trades and the companions on home ground
  crewBonus(crew, ex) {
    const levels = crew.map(r => this.handLevel(r))
    const b = { level: Math.max(0, ...levels) + CREW_LEVEL_EACH * Math.max(0, crew.length - 1), chance: 0, loot: 0, rare: 0, shield: false, home: [] }
    for (const r of crew) {
      const tr = TRIP_ROLES[this.handTrade(r)] || {}
      b.chance += tr.chance || 0
      b.loot += tr.loot || 0
      b.rare += tr.rare || 0
      if (tr.shield) b.shield = true
      const h = this.hand(r)
      if (r.k === 'w') { b.chance += this.traitSum(h, 'expSuccess'); b.loot += this.traitSum(h, 'expLoot') }
      if (r.k === 'c' && UNIQUE_MERCS[h?.unique]?.home === ex.id) { b.chance += HOME_CHANCE; b.loot += HOME_LOOT; b.home.push(h.id) }
    }
    return b
  },
  expeditionChance(crew, ex, extra = 0) {
    if (!Array.isArray(crew)) crew = [{ k: 'w', uid: crew.uid }]
    if (!crew.length) return 0
    const b = this.crewBonus(crew, ex)
    return clamp(0.55 + (b.level - ex.power) * 0.02 + b.chance + extra, 0.05, 0.97)
  },
  // Gold a trip would bring back if it goes well
  tripGold(crew, ex, durIdx) { return Math.round(ex.gold * EXPEDITION_DURATIONS[durIdx].mult * (1 + CREW_HAUL_EACH * Math.max(0, crew.length - 1))) },
  sendExpedition(crew, expId, durIdx, repeat = false) {
    if (!Array.isArray(crew)) crew = [{ k: 'w', uid: crew }]
    const tv = this.s.tavern
    const ex = EXPEDITIONS.find(x => x.id === expId)
    const dur = EXPEDITION_DURATIONS[durIdx]
    const keys = new Set(crew.map(r => this.handKey(r)))
    if (!ex || !dur || !crew.length || crew.length > this.crewSize() || keys.size !== crew.length) return false
    if (!crew.every(r => this.handFree(r) && (r.k === 'c' || this.hand(r).spec === 'adventurer'))) return false
    if (ex.map) { if (this.qty('treasure_map') <= 0) return false; this.removeItem('treasure_map', 1) }
    this.ensureTrips()
    const trip = { uid: (tv.uid = (tv.uid || 0) + 1), exp: expId, hours: dur.hours, mult: dur.mult, durIdx, t: dur.hours * 3600, total: dur.hours * 3600, crew: crew.map(r => ({ ...r })), repeat: !!repeat }
    tv.trips.push(trip)
    for (const r of crew) if (r.k === 'w') { const w = this.hand(r); w.task = null; w.exp = { trip: trip.uid }; w.status = 'expedition' }
    return trip
  },
  // Calling a crew home early: they come back empty-handed
  recallTrip(uid) {
    const tv = this.s.tavern
    const trip = tv.trips?.find(t => t.uid === uid)
    if (!trip) return false
    this.endTrip(trip)
    return true
  },
  // Back compatibility: recall the trip an adventurer is on
  recallExpedition(uid) { const trip = this.tripOf({ k: 'w', uid }); return trip ? this.recallTrip(trip.uid) : false },
  setTripRepeat(uid, on) { const trip = this.s.tavern.trips?.find(t => t.uid === uid); if (trip) trip.repeat = !!on },
  endTrip(trip) {
    const tv = this.s.tavern
    tv.trips = tv.trips.filter(t => t.uid !== trip.uid)
    for (const r of trip.crew) if (r.k === 'w') { const w = this.hand(r); if (w) { w.exp = null; if (w.status === 'expedition') w.status = 'idle' } }
  },
  // A worker leaving or a companion dismissed drops out of their trip; a trip with no one left ends
  leaveTrip(ref) {
    const trip = this.tripOf(ref)
    if (!trip) return
    const key = this.handKey(ref)
    trip.crew = trip.crew.filter(c => this.handKey(c) !== key)
    if (!trip.crew.length) this.endTrip(trip)
  },
  updateTrips(dt) {
    const tv = this.s.tavern
    if (!tv.trips?.length) return
    for (const trip of [...tv.trips]) {
      trip.t -= dt
      if (trip.t <= 0) this.resolveTrip(trip)
    }
  },
  // Events along the way, then the outcome: loot, gold, XP and trust for everyone who went
  rollTripEvents(trip) {
    const trades = trip.crew.map(r => this.handTrade(r))
    const ids = Object.keys(TRIP_EVENTS)
    return Array.from({ length: tripEventCount(trip.hours) }, () => {
      const id = pick(ids)
      const ev = TRIP_EVENTS[id]
      const saver = !ev.good && trip.crew.find((r, i) => ev.by?.includes(trades[i]))
      return saver ? { id, saved: this.handKey(saver) } : { id }
    })
  },
  resolveTrip(trip, events = this.rollTripEvents(trip)) {
    const ex = EXPEDITIONS.find(x => x.id === trip.exp)
    const crew = trip.crew.filter(r => this.hand(r))
    this.endTrip(trip)
    if (!ex || !crew.length) return null
    const b = this.crewBonus(crew, ex)
    const fx = { chance: 0, loot: 0, gold: 0, rare: 0, xp: 0 }
    for (const e of events) if (!e.saved) for (const k of Object.keys(fx)) fx[k] += TRIP_EVENTS[e.id][k] || 0
    const ok = Math.random() < this.expeditionChance(crew, ex, fx.chance)
    const haul = 1 + CREW_HAUL_EACH * (crew.length - 1)
    const items = {}
    const rolls = Math.round(trip.hours * 3 * haul * (ok ? 1 : 0.25))
    const lootMult = Math.max(0.2, 1 + b.loot + fx.loot)
    const rarest = Math.min(...ex.loot.map(l => l.chance))
    const find = l => { const n = rand(l.qty[0], l.qty[1]); items[l.item] = (items[l.item] || 0) + n }
    for (let i = 0; i < rolls; i++) ex.loot.forEach(l => {
      const rare = l.chance <= 0.1 ? 1 + b.rare : 1
      if (Math.random() < l.chance * lootMult * rare) find(l)
    })
    // Old ruins always hold one of the rarest finds of the place
    if (ok) for (let i = 0; i < fx.rare; i++) find(ex.loot.find(l => l.chance === rarest))
    Object.entries(items).forEach(([k, n]) => this.addItem(k, n))
    const gold = this.addGold(ex.gold * trip.mult * haul * (ok ? 1 : 0.3) * Math.max(0.2, 1 + fx.gold), true)
    const xpBase = 150 * trip.mult * (1 + ex.power / 10) * (ok ? 1 : 0.5) * (1 + fx.xp)
    const hurt = !ok && !b.shield
    const saves = {}
    for (const e of events) if (e.saved) saves[e.saved] = (saves[e.saved] || 0) + 1
    for (const r of crew) {
      const h = this.hand(r)
      if (r.k === 'w') {
        const before = this.workerLevel(h)
        h.xp = Math.min(XP_TABLE[99], h.xp + Math.round(xpBase * (1 + this.traitSum(h, 'xp'))))
        this.workerGrew(h, before)
        if (hurt && !this.traitSum(h, 'noInjury')) { h.injured = INJURY_TIME; h.status = 'injured' }
      } else {
        h.trust = Math.min(TRUST_MAX, (h.trust || 0) + (ok ? TRUST_TRIP : TRUST_TRIP_FAIL) + TRUST_SAVE * (saves[this.handKey(r)] || 0))
        this.mercGainXp(h, Math.round((10 + ex.power / 2) * trip.hours * (ok ? 1 : 0.5) * (1 + fx.xp)))
        if (hurt) h.hurtUntil = Date.now() + HURT_TIME
      }
    }
    this.s.stats.expeditions = (this.s.stats.expeditions || 0) + 1
    const names = crew.map(r => this.handName(r))
    const crewParam = '@crew:' + names.join('|')
    const rep = {
      t: Date.now(), name: crewParam, exp: ex.id, icon: ex.icon, ok, gold, items, hours: trip.hours,
      crew: crew.map(r => ({ ...r, name: this.handName(r) })), events, home: b.home, hurt,
    }
    const tv = this.s.tavern
    tv.reports.unshift(rep)
    tv.reports.length = Math.min(tv.reports.length, REPORTS_KEPT)
    this.log(ex.icon, ok ? 'log.expeditionOk' : 'log.expeditionFail', { name: rep.name, exp: '@exp:' + ex.id, gold })
    this.emit('expedition', rep)
    this.emit('notify', msg(ok ? 'notify.expeditionOk' : 'notify.expeditionFail', { name: rep.name, exp: '@exp:' + ex.id }))
    // Sent to keep going: the same crew sets out again if everyone is fit and the trip can be paid for
    if (trip.repeat) {
      const again = this.sendExpedition(crew, ex.id, trip.durIdx ?? EXPEDITION_DURATIONS.findIndex(d => d.hours === trip.hours), true)
      if (!again) this.emit('notify', msg('notify.tripStopped', { exp: '@exp:' + ex.id }))
    }
    return rep
  },
  // A name for the report: a worker's own, a companion met along the way's, or a hired hand's
  handName(ref) {
    const h = this.hand(ref)
    if (!h) return '?'
    return ref.k === 'w' ? h.name : h.unique ? '#' + h.unique : h.name
  },

  /* ---------- staff growth ---------- */
  // Levels crossed since `before`: at each veteran level a worker sheds a bad trait, or learns a good one
  workerGrew(w, before) {
    const lvl = this.workerLevel(w)
    const skill = SPECIALTIES[w.spec].skill
    if (lvl > before && skill) this.log(SPECIALTIES[w.spec].icon, 'log.workerLevel', { name: w.name, level: lvl, skill: '@skill:' + skill })
    const due = VETERAN_LEVELS.filter(l => lvl >= l).length
    while ((w.vet || 0) < due) {
      w.vet = (w.vet || 0) + 1
      const bad = w.traits.find(tr => !TRAITS[tr]?.good)
      if (bad) {
        w.traits = w.traits.filter(tr => tr !== bad)
        this.log('star-medal', 'log.workerShed', { name: w.name, trait: '@trait:' + bad })
        continue
      }
      const learn = Object.keys(TRAITS).filter(tr => TRAITS[tr].good && !w.traits.includes(tr))
      if (!learn.length) continue
      const tr = pick(learn)
      w.traits.push(tr)
      this.log('star-medal', 'log.workerLearned', { name: w.name, trait: '@trait:' + tr })
    }
  },
  // The next rarity up, what it asks and whether the worker can take it now
  promotion(w) {
    const next = RARITY_ORDER[RARITY_ORDER.indexOf(w.rarity) + 1]
    if (!next) return null
    const p = PROMOTIONS[next]
    const gold = Math.round(this.workerWage({ ...w, rarity: next }) * PROMOTE_HOURS)
    const blocker = this.workerLevel(w) < p.lvl ? 'level' : this.s.tavern.level < RARITIES[next].tavern ? 'tavern'
      : this.s.gold < gold ? 'gold' : this.s.tavern.tokens < p.tokens ? 'tokens' : null
    return { rarity: next, lvl: p.lvl, tokens: p.tokens, gold, tavern: RARITIES[next].tavern, blocker }
  },
  // Promoted: better at the work, dearer, and with room for another good trait if the new rarity allows
  promote(uid) {
    const w = this.s.tavern.workers.find(x => x.uid === uid)
    const p = w && this.promotion(w)
    if (!p || p.blocker) return false
    this.s.gold -= p.gold
    this.s.tavern.tokens -= p.tokens
    w.rarity = p.rarity
    if (w.traits.length < RARITIES[p.rarity].traits) {
      const learn = Object.keys(TRAITS).filter(tr => TRAITS[tr].good && !w.traits.includes(tr))
      if (learn.length) w.traits.push(pick(learn))
    }
    this.log('upgrade', 'log.promoted', { name: w.name, rarity: '@rarity:' + p.rarity })
    return true
  },
  // At a glance: how the staff stands
  staffSummary() {
    const out = { working: 0, idle: 0, away: 0, injured: 0, stuck: 0 }
    for (const w of this.s.tavern.workers) {
      if (w.exp) out.away++
      else if (w.injured > 0) out.injured++
      else if (w.status === 'working') out.working++
      else if (w.task) out.stuck++
      else out.idle++
    }
    return out
  },

  /* ---------- daily orders ---------- */
  ensureOrders() {
    const tv = this.s.tavern
    const day = dayKey()
    if (tv.ordersDay === day && tv.orders.length) return
    const rng = seeded(day + (this.s.created || ''))
    tv.orders = []
    for (let i = 0; i < ORDERS_PER_DAY; i++) tv.orders.push(this.makeOrder(rng, tv.orders))
    tv.ordersDay = day
  },
  makeOrder(rng = Math.random, existing = []) {
    const pool = ORDER_SKILLS.flatMap(sk => outputsOf(sk)
      .filter(o => this.level(sk) >= o.lvl && ['resource', 'food', 'potion', 'rune'].includes(ITEMS[o.item].type) && !existing.some(x => x.item === o.item))
      .map(o => ({ sk, o })))
    const { sk, o } = pool[Math.floor(rng() * pool.length)] || { sk: 'mining', o: outputsOf('mining')[0] }
    const a = { lvl: o.lvl, time: o.time, xp: o.xp }
    const item = o.item
    const per = o.per
    const qty = clamp(Math.round((480 / a.time) * per / 5) * 5, 10, 300)
    return {
      item, qty, skill: sk,
      gold: Math.round(ITEMS[item].value * qty * 2.2 + 60 + a.lvl * 10),
      tokens: 2 + Math.floor(a.lvl / 20),
      xp: Math.round((a.xp * qty * 0.3) / per),
      done: false,
    }
  },
  deliverOrder(i) {
    const o = this.s.tavern.orders[i]
    if (!o || o.done || this.qty(o.item) < o.qty) return false
    this.removeItem(o.item, o.qty)
    this.addGold(o.gold)
    this.s.tavern.tokens += o.tokens
    this.addXp(o.skill, o.xp, false)
    o.done = true
    this.s.stats.orders = (this.s.stats.orders || 0) + 1
    this.log('scroll-unfurled', 'log.order', { n: o.qty, item: '@item:' + o.item })
    return true
  },
  rerollOrder(i) {
    const tv = this.s.tavern
    if (tv.tokens < 2 || !tv.orders[i] || tv.orders[i].done) return false
    tv.tokens -= 2
    tv.orders[i] = this.makeOrder(Math.random, tv.orders)
    return true
  },

  /* ---------- bar ---------- */
  buyDrink(id) {
    const d = DRINKS.find(x => x.id === id)
    if (!d || !this.canAffordCost(d.price)) return false
    this.payCost(d.price)
    this.s.tavern.drink = { id, t: DRINK_DURATION }
    return true
  },
  maxBet() { return Math.min(this.tavernInfo().maxBet, Math.floor(this.s.gold)) },
  rollDice(bet) {
    bet = Math.floor(bet)
    if (bet < 10 || bet > this.maxBet()) return null
    const die = () => rand(1, 6)
    const p = [die(), die()], h = [die(), die()]
    const ps = p[0] + p[1], hs = h[0] + h[1]
    let delta = 0, kind = 'tie'
    if (p[0] === 6 && p[1] === 6) { delta = bet * 3; kind = 'jackpot' }
    else if (ps > hs) { delta = bet; kind = 'win' }
    else if (ps < hs) { delta = -bet; kind = 'lose' }
    this.s.gold += delta
    if (delta > 0) this.s.stats.goldEarned += delta
    const dc = this.s.tavern.dice
    dc.played++; if (delta > 0) dc.won++; dc.net += delta
    dc.recent = [delta, ...(dc.recent || [])].slice(0, 10)
    this.rollPet(src => src.dice)
    return { p, h, delta, kind }
  },
  openMystery() {
    if (this.s.tavern.tokens < MYSTERY_CHEST.tokens) return null
    this.s.tavern.tokens -= MYSTERY_CHEST.tokens
    const got = {}
    MYSTERY_CHEST.loot.forEach(l => { if (Math.random() < l.chance) got[l.item] = rand(l.qty[0], l.qty[1]) })
    if (!Object.keys(got).length) got.coin_pouch = 2
    Object.entries(got).forEach(([k, n]) => this.addItem(k, n))
    return got
  },

  /* ================= action queue ================= */
  enqueue(skill, action, count) {
    this.s.queue.push({ skill, action, count: Math.max(1, Math.floor(count)) })
    if (!this.s.activity) this.startNext()
  },
  removeQueued(i) { this.s.queue.splice(i, 1) },
  moveQueued(i, dir) {
    const q = this.s.queue, j = i + dir
    if (j < 0 || j >= q.length) return
    ;[q[i], q[j]] = [q[j], q[i]]
  },
  clearQueue() { this.s.queue.splice(0) },
  // Start the next queued task that can be done right now
  startNext() {
    while (this.s.queue.length) {
      const it = this.s.queue.shift()
      const a = findAction(it.skill, it.action)
      if (a && this.canStart(it.skill, a)) {
        this.s.activity = { type: 'skill', skill: it.skill, action: it.action, progress: 0, limit: it.count, done: 0 }
        this.emit('activity')
        return true
      }
      if (a) this.toast('hourglass', 'msg.queueSkip', { action: `@action:${it.skill}/${a.id}` }, 'warn')
    }
    return false
  },
  queueFinished() {
    this.s.activity = null
    if (!this.startNext()) {
      this.emit('activity')
      this.toast('hourglass', 'msg.queueDone', {}, 'success')
      this.emit('notify', msg('notify.queueDone'))
    }
  },

  /* ================= locked items and bulk selling ================= */
  isLocked(id) { return !!this.s.locked[id] },
  toggleLock(id) { if (this.s.locked[id]) delete this.s.locked[id]; else this.s.locked[id] = true },
  sellMany(ids) {
    let total = 0
    ids.forEach(id => { if (!this.isLocked(id)) total += this.sell(id, this.qty(id)) })
    return total
  },

  /* ================= loadouts ================= */
  saveLoadout(i, name) {
    const st = this.s
    st.loadouts[i] = {
      name: name || `#${i + 1}`, equipment: { ...st.equipment }, style: st.combatStyle, spell: st.spell, food: st.food, potion: st.potion, prayer: st.prayer,
      bar: [...this.abilityBar()],
    }
  },
  applyLoadout(i) {
    const lo = this.s.loadouts[i]
    if (!lo) return null
    const missing = []
    Object.keys(SLOTS).forEach(slot => {
      const id = lo.equipment[slot]
      if (this.s.equipment[slot] === id) return
      if (!id) { this.unequip(slot); return }
      if (this.qty(id) > 0 && this.canEquip(id)) this.equip(id)
      else missing.push(id)
    })
    this.setStance(lo.style)
    this.s.spell = lo.spell
    if (Array.isArray(lo.bar)) this.abilityBar().splice(0, Infinity, ...lo.bar.filter(id => this.abilitiesFor().some(a => a.id === id)))
    if (lo.food && this.qty(lo.food) > 0) this.s.food = lo.food
    if (lo.potion && this.qty(lo.potion) > 0) this.s.potion = lo.potion
    if (lo.prayer === null || this.level('prayer') >= (PRAYERS.find(p => p.id === lo.prayer)?.lvl || 99)) this.s.prayer = lo.prayer ?? null
    return missing
  },

  /* ================= prayers ================= */
  setPrayer(id) {
    if (!id) { this.s.prayer = null; return true }
    const p = PRAYERS.find(x => x.id === id)
    if (!p || this.level('prayer') < p.lvl) return false
    this.s.prayer = id
    return true
  },
  updatePrayer(dt) {
    const st = this.s
    if (!st.prayer || !st.activity || st.activity.type !== 'combat') return
    st.prayerTimer += dt
    if (st.prayerTimer < PRAYER_DRAIN) return
    st.prayerTimer -= PRAYER_DRAIN
    const bone = PRAYER_BONES.find(b => this.qty(b.item) > 0)
    if (!bone) { st.prayer = null; this.toast('prayer', 'msg.prayerFaded', {}, 'warn'); return }
    this.removeItem(bone.item, 1)
    this.addXp('prayer', bone.xp)
  },

  /* ================= grace (Agility) ================= */
  graceCost() { return GRACE_COSTS[this.s.grace] ?? null },
  buyGrace() {
    const c = this.graceCost()
    if (c === null || this.qty('mark_of_grace') < c) return false
    this.removeItem('mark_of_grace', c)
    this.s.grace++
    return true
  },

  /* ================= daily market ================= */
  marketTable() {
    const day = dayKey()
    if (marketCache.day === day) return marketCache.table
    const rng = seeded('market' + day)
    const pool = Object.values(ITEMS).filter(it => it.value >= 3 && ['resource', 'food', 'potion', 'rune', 'seed'].includes(it.type)).map(it => it.id)
    const table = {}
    const take = () => pool.splice(Math.floor(rng() * pool.length), 1)[0]
    for (let i = 0; i < 6; i++) table[take()] = +(1.5 + rng() * 0.8).toFixed(2)
    for (let i = 0; i < 4; i++) table[take()] = +(0.55 + rng() * 0.2).toFixed(2)
    marketCache = { day, table }
    return table
  },
  marketMult(id) { return this.marketTable()[id] || 1 },

  /* ================= history ================= */
  snapshot() {
    const st = this.s
    st.history.push({
      t: Date.now(),
      xp: Math.round(Object.values(st.skills).reduce((s, k) => s + k.xp, 0)),
      gold: Math.round(st.stats.goldEarned), kills: st.stats.kills, actions: st.stats.actions,
    })
    if (st.history.length > HISTORY_MAX) st.history.splice(0, st.history.length - HISTORY_MAX)
  },

  /* ================= engine hooks ================= */
  // Bonuses from the active drink, prayer and grace rewards (omens add theirs in omens.js)
  extraMods(key) {
    const st = this.s
    let v = 0
    const dr = st.tavern?.drink
    if (dr && dr.t > 0) v += DRINKS.find(d => d.id === dr.id)?.mods[key] || 0
    if (st.prayer && st.activity?.type === 'combat') v += PRAYERS.find(p => p.id === st.prayer)?.mods[key] || 0
    if (key === 'speed') v += (st.grace || 0) * GRACE_SPEED
    return v
  },
  updateSystems(dt) {
    const st = this.s
    this.updateWorkers(dt)
    this.updateTrips(dt)
    if (st.tavern.drink) { st.tavern.drink.t -= dt; if (st.tavern.drink.t <= 0) st.tavern.drink = null }
    this.updateOmens(dt)
    this.updatePrayer(dt)
  },
  systemsBusy() { return this.workersBusy() || !!this.s.tavern.drink || !!this.s.event },
  dungeon(id) { return DUNGEONS.find(d => d.id === id) },
}
