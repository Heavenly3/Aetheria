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
} from './data/tavern.js'
import { PRAYERS, PRAYER_DRAIN, PRAYER_BONES, GRACE_COSTS, GRACE_SPEED } from './data/extras.js'
import { AVATARS } from './data/character.js'

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

export const extraState = () => ({
  tavern: { level: 1, board: [], boardAt: 0, workers: [], tokens: 0, orders: [], ordersDay: '', drink: null, uid: 0, reports: [], dice: { played: 0, won: 0, net: 0 }, patrons: [], patronAt: 0, rep: 0 },
  queue: [],
  locked: {},
  loadouts: [null, null, null],
  prayer: null,
  prayerTimer: 0,
  grace: 0,
  event: null,
  history: [],
  // Volumes are 0-100; muteHidden silences the game while its tab is in the background
  settings: {
    sound: true, notify: false, autoChain: true, music: true, ambience: true,
    masterVol: 80, musicVol: 45, ambienceVol: 50, sfxVol: 70, muteHidden: true, reduceMotion: false, compactNumbers: true, quietToasts: false, muted: false,
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
    tv.workers.push({ ...c, uid: (tv.uid = (tv.uid || 0) + 1), task: null, status: 'idle', injured: 0, exp: null, made: 0 })
    tv.board.splice(i, 1)
    this.log(SPECIALTIES[c.spec].icon, 'log.hired', { name: c.name, spec: '@spec:' + c.spec, rarity: '@rarity:' + c.rarity })
    return true
  },
  fire(uid) {
    const tv = this.s.tavern
    const w = tv.workers.find(x => x.uid === uid)
    if (!w) return false
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
      if (w.exp) { w.exp.t -= dt; if (w.exp.t <= 0) this.resolveExpedition(w); continue }
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
    if (this.workerLevel(w) > lvl) this.log(SPECIALTIES[w.spec].icon, 'log.workerLevel', { name: w.name, level: this.workerLevel(w), skill: '@skill:' + skill })
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
  expeditionChance(w, ex) { return clamp(0.55 + (this.workerLevel(w) - ex.power) * 0.02 + this.traitSum(w, 'expSuccess'), 0.05, 0.97) },
  sendExpedition(uid, expId, durIdx) {
    const w = this.s.tavern.workers.find(x => x.uid === uid)
    const ex = EXPEDITIONS.find(x => x.id === expId)
    const dur = EXPEDITION_DURATIONS[durIdx]
    if (!w || !ex || !dur || w.spec !== 'adventurer' || w.exp || w.injured > 0) return false
    if (ex.map) { if (this.qty('treasure_map') <= 0) return false; this.removeItem('treasure_map', 1) }
    w.task = null
    w.exp = { id: expId, hours: dur.hours, mult: dur.mult, t: dur.hours * 3600, total: dur.hours * 3600 }
    w.status = 'expedition'
    return true
  },
  recallExpedition(uid) {
    const w = this.s.tavern.workers.find(x => x.uid === uid)
    if (w && w.exp) { w.exp = null; w.status = 'idle' }
  },
  resolveExpedition(w) {
    const ex = EXPEDITIONS.find(x => x.id === w.exp.id)
    const { mult, hours } = w.exp
    w.exp = null
    w.status = 'idle'
    const ok = Math.random() < this.expeditionChance(w, ex)
    const items = {}
    const rolls = Math.round(hours * 3 * (ok ? 1 : 0.25))
    const lootMult = 1 + this.traitSum(w, 'expLoot')
    for (let i = 0; i < rolls; i++) ex.loot.forEach(l => {
      if (Math.random() < l.chance * lootMult) { const n = rand(l.qty[0], l.qty[1]); items[l.item] = (items[l.item] || 0) + n }
    })
    Object.entries(items).forEach(([k, n]) => this.addItem(k, n))
    const gold = this.addGold(ex.gold * mult * (ok ? 1 : 0.3), true)
    w.xp = Math.min(XP_TABLE[99], w.xp + Math.round(150 * mult * (1 + ex.power / 10) * (ok ? 1 : 0.5) * (1 + this.traitSum(w, 'xp'))))
    if (!ok && !this.traitSum(w, 'noInjury')) { w.injured = INJURY_TIME; w.status = 'injured' }
    this.s.stats.expeditions = (this.s.stats.expeditions || 0) + 1
    const rep = { t: Date.now(), name: w.name, exp: ex.id, icon: ex.icon, ok, gold, items }
    this.s.tavern.reports.unshift(rep)
    this.s.tavern.reports.length = Math.min(this.s.tavern.reports.length, 12)
    this.log(ex.icon, ok ? 'log.expeditionOk' : 'log.expeditionFail', { name: w.name, exp: '@exp:' + ex.id, gold })
    this.emit('expedition', rep)
    this.emit('notify', msg(ok ? 'notify.expeditionOk' : 'notify.expeditionFail', { name: w.name, exp: '@exp:' + ex.id }))
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
    st.loadouts[i] = { name: name || `#${i + 1}`, equipment: { ...st.equipment }, style: st.combatStyle, spell: st.spell, food: st.food, potion: st.potion, prayer: st.prayer }
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
    this.s.combatStyle = lo.style
    this.s.spell = lo.spell
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
    if (st.tavern.drink) { st.tavern.drink.t -= dt; if (st.tavern.drink.t <= 0) st.tavern.drink = null }
    this.updateOmens(dt)
    this.updatePrayer(dt)
  },
  systemsBusy() { return this.workersBusy() || !!this.s.tavern.drink || !!this.s.event },
  dungeon(id) { return DUNGEONS.find(d => d.id === id) },
}
