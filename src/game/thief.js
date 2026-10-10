/* =========================================================
   THIEF — the guard's heat, jail, stolen goods and the fence, and heists.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import {
  HEAT_MAX, HEAT_DECAY, heatGain, HEAT_FAIL, jailChance, jailTime, bribeCost, informantCost, HEAT_ON_FAIL,
  STOLEN, STOLEN_CHANCE, fenceMult, HEISTS, HEIST_MAP, HEIST_STAGES, GEAR_CHANCE,
} from './data/thieving.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const msg = (key, params = {}) => ({ key, params })

export const thiefState = () => ({
  // heat / heatAt: heat at a moment (it cools from there) · jailUntil: when the hero walks free · heists: id -> last attempt
  thief: { heat: 0, heatAt: 0, jailUntil: 0, heists: {}, done: {} },
})

export const thief = {
  ensureThief() {
    const t = (this.s.thief ||= thiefState().thief)
    t.heists ||= {}
    t.done ||= {}
    return t
  },
  heat(now = Date.now()) {
    const t = this.s.thief
    if (!t) return 0
    return Math.max(0, t.heat - (now - t.heatAt) / HEAT_DECAY)
  },
  setHeat(v, now = Date.now()) {
    const t = this.ensureThief()
    t.heat = Math.max(0, Math.min(HEAT_MAX, v))
    t.heatAt = now
  },
  addHeat(n) { this.setHeat(this.heat() + n * (1 - Math.min(0.6, this.mod('heat')))) },
  heatFail() { return this.heat() * HEAT_FAIL },
  jailLeft(now = Date.now()) { return Math.max(0, (this.s.thief?.jailUntil || 0) - now) },
  jailed() { return this.jailLeft() > 0 },

  /* ---------- hooks from the thieving actions ---------- */
  thiefSucceeded(a) {
    this.addHeat(heatGain(a))
    const lvl = this.level('thieving')
    if (Math.random() < STOLEN_CHANCE * (1 + lvl / 60) * (1 + this.mod('loot'))) {
      const pool = STOLEN.filter(s => s.lvl <= lvl)
      let r = Math.random() * pool.reduce((s, x) => s + x.weight, 0)
      const s = pool.find(x => (r -= x.weight) < 0) || pool[0]
      this.addItem(s.id, 1)
      return s.id
    }
    return null
  },
  // Caught in the act: the guard grows warier, and on alert they may throw the hero in jail
  thiefCaught() {
    const heat = this.heat()
    this.addHeat(HEAT_ON_FAIL)
    if (Math.random() < jailChance(heat)) {
      this.ensureThief().jailUntil = Date.now() + jailTime(this.level('thieving'))
      this.s.stats.jailed = (this.s.stats.jailed || 0) + 1
      this.log('padlock', 'log.jailed', {})
      if (this.s.activity?.skill === 'thieving') this.stop(msg('thief.jailedStop'))
      this.emit('jailed', { ms: this.jailLeft() })
      return true
    }
    return false
  },

  /* ---------- getting out of trouble ---------- */
  bribeCost() { return bribeCost(this.level('thieving')) },
  bribe() {
    if (!this.jailed() || this.s.gold < this.bribeCost()) return false
    this.s.gold -= this.bribeCost()
    this.s.thief.jailUntil = 0
    return true
  },
  informantCost() { return informantCost(this.level('thieving')) },
  // An informant spreads false rumours: the heat halves
  payInformant() {
    if (this.heat() < 5 || this.s.gold < this.informantCost()) return false
    this.s.gold -= this.informantCost()
    this.setHeat(this.heat() / 2)
    return true
  },

  /* ---------- the fence ---------- */
  fencePrice(id) {
    const s = STOLEN.find(x => x.id === id)
    return s ? Math.round(s.value * fenceMult(this.heat())) : 0
  },
  fence(id, n = this.qty(id)) {
    n = Math.min(n, this.qty(id))
    if (!n || !STOLEN.some(x => x.id === id)) return 0
    const gold = this.fencePrice(id) * n
    this.removeItem(id, n)
    this.addGold(gold)
    this.s.stats.fenced = (this.s.stats.fenced || 0) + gold
    return gold
  },
  stolenGoods() { return STOLEN.filter(s => this.qty(s.id) > 0) },

  /* ---------- heists ---------- */
  heistCooldown(id, now = Date.now()) {
    const h = HEIST_MAP[id], last = this.s.thief?.heists?.[id] || 0
    return Math.max(0, last + h.cd - now)
  },
  heistReqs(h) {
    return [
      ...Object.entries(h.req).map(([skill, n]) => ({ kind: 'skill', skill, n, ok: this.level(skill) >= n })),
      { kind: 'lockpick', n: h.lockpick, ok: this.toolTier('lockpick') >= h.lockpick },
    ]
  },
  canHeist(id) {
    const h = HEIST_MAP[id]
    return !!h && !this.jailed() && this.heistCooldown(id) <= 0 && this.heistReqs(h).every(r => r.ok)
  },
  // Chance of getting through each stage: skill above the requirement helps, heat hurts
  heistChances(id) {
    const h = HEIST_MAP[id]
    const over = this.level('thieving') - h.req.thieving, agi = this.level('agility') - h.req.agility
    const heat = this.heat() * 0.004, gear = Math.min(0.1, this.mod('thieving'))
    const c = x => Math.max(0.3, Math.min(0.97, x - heat + gear))
    return {
      plan: c(0.9 + over * 0.005),
      slip: c(0.82 + over * 0.006 + agi * 0.004),
      crack: c(0.8 + over * 0.004 + (this.toolTier('lockpick') - h.lockpick) * 0.05),
      escape: c(0.82 + agi * 0.008),
    }
  },
  // Plays the whole heist at once; the screen reveals the stages one by one
  runHeist(id) {
    if (!this.canHeist(id)) return null
    const h = HEIST_MAP[id], t = this.ensureThief(), ch = this.heistChances(id)
    t.heists[id] = Date.now()
    const stages = []
    let failed = null
    for (const st of HEIST_STAGES) {
      const ok = Math.random() < ch[st]
      stages.push({ id: st, ok, chance: ch[st] })
      if (!ok) { failed = st; break }
    }
    const result = { id, stages, ok: !failed, gold: 0, items: {}, caught: false }
    const pay = share => {
      result.gold = this.addGold(Math.round(rand(...h.gold) * share))
      for (const [k, [a, z]] of Object.entries(h.loot)) { const n = Math.max(0, Math.round(rand(a, z) * share)); if (n) { this.addItem(k, n); result.items[k] = n } }
    }
    if (!failed) {
      pay(1)
      // The heist's outfit piece, until the hero has it
      if (h.gear && !this.qty(h.gear) && !Object.values(this.s.equipment).includes(h.gear) && Math.random() < GEAR_CHANCE) { this.addItem(h.gear, 1); result.items[h.gear] = 1 }
      t.done[id] = (t.done[id] || 0) + 1
      this.addXp('thieving', h.req.thieving * 120)
      this.addHeat(h.heat)
      this.log(h.icon, 'log.heist', { heist: '@heist:' + id, gold: result.gold })
    } else if (failed === 'crack') {
      // Got in but not the vault: a few pickings on the way out
      pay(0.25)
      this.addHeat(h.heat / 2)
    } else if (failed === 'escape') {
      // Caught on the way out: the loot is dropped and the hero lands in jail
      result.caught = true
      this.setHeat(Math.max(this.heat(), 80))
      t.jailUntil = Date.now() + jailTime(this.level('thieving')) * 2
      this.s.stats.jailed = (this.s.stats.jailed || 0) + 1
      if (this.s.activity?.skill === 'thieving') this.stop()
    } else this.addHeat(h.heat / 4)
    this.s.stats.heists = (this.s.stats.heists || 0) + 1
    return result
  },
  heistsReady() { return HEISTS.filter(h => this.canHeist(h.id)).length },
}

