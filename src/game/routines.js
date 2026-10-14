/* =========================================================
   ROUTINES — "when this happens, do that" rules the hero follows while the game is open.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { CONDITIONS, ACTIONS_LIST, MAX_RULES, QUICK_WAIT, MANUAL_PAUSE, LOG_SIZE, SLAYER_KINDS } from './data/routines.js'
import { ACTIONS, findAction } from './data/actions.js'
import { MONSTERS, AREAS } from './data/combat.js'
import { ITEMS } from './data/items.js'
import { weatherAt } from './data/weather.js'

// on: the master switch · rules: in priority order · log: what they did lately · manualAt/lastKey:
// noticing when the player changes the activity by hand
export const routinesState = () => ({ routines: { on: true, rules: [], log: [], manualAt: 0, lastKey: '' } })
const activityKey = a => (!a ? '' : a.type === 'skill' ? `skill:${a.skill}:${a.action}` : a.type === 'combat' ? `combat:${a.kind}:${a.target}` : a.type)
let uid = 0
const newId = () => `r${Date.now().toString(36)}${(uid++).toString(36)}`

export const routines = {
  ensureRoutines() {
    const r = (this.s.routines ||= routinesState().routines)
    if (!Array.isArray(r.rules)) r.rules = []
    if (!Array.isArray(r.log)) r.log = []
    return r
  },
  /* ---------------- editing ---------------- */
  addRule(rule) {
    const r = this.ensureRoutines()
    if (r.rules.length >= MAX_RULES || !CONDITIONS[rule?.when?.type] || !ACTIONS_LIST[rule?.then?.type]) return null
    const made = { id: newId(), on: true, interrupt: false, last: 0, ...rule, when: { ...rule.when }, then: { ...rule.then } }
    r.rules.push(made)
    return made
  },
  removeRule(id) { const r = this.ensureRoutines(); r.rules = r.rules.filter(x => x.id !== id) },
  moveRule(id, dir) {
    const list = this.ensureRoutines().rules, i = list.findIndex(x => x.id === id), j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
  },
  // A ready-made rule, filled in with what suits the hero right now
  ruleTemplate(id) {
    const bestOf = skill => [...(ACTIONS[skill] || [])].reverse().find(a => this.level(skill) >= a.lvl && this.hasTool(a) && this.festivalOpen(a))
    if (id === 'cookWhenLow') {
      const food = this.s.food || 'shrimp'
      const cook = (ACTIONS.cooking || []).find(a => a.out[food])
      return cook && { when: { type: 'itemBelow', item: food, n: 20 }, then: { type: 'skill', skill: 'cooking', action: cook.id } }
    }
    if (id === 'fishInRain') { const w = bestOf('fishing'); return w && { when: { type: 'weather', weather: 'rain' }, then: { type: 'skill', skill: 'fishing', action: w.id }, interrupt: true } }
    if (id === 'mineWhenIdle') { const a = bestOf('mining'); return a && { when: { type: 'idle' }, then: { type: 'skill', skill: 'mining', action: a.id } } }
    if (id === 'servePatrons') return { when: { type: 'patrons', n: 1 }, then: { type: 'serve' } }
    if (id === 'huntOmens') return { when: { type: 'omen' }, then: { type: 'huntOmen' }, interrupt: true }
    if (id === 'slayerTask') return { when: { type: 'noSlayerTask' }, then: { type: 'slayerTask', kind: 'standard' } }
    if (id === 'collectYard') return { when: { type: 'always' }, then: { type: 'collectYard' } }
    if (id === 'sellJunk') return { when: { type: 'always' }, then: { type: 'sellJunk' } }
    return null
  },
  addTemplate(id) { const t = this.ruleTemplate(id); return t ? this.addRule(t) : null },

  /* ---------------- conditions ---------------- */
  ruleHolds(when, now = Date.now()) {
    const p = when
    switch (p.type) {
      case 'always': return true
      case 'idle': return !this.s.activity
      case 'itemBelow': return !!ITEMS[p.item] && this.qty(p.item) < (p.n ?? 1)
      case 'itemAtLeast': return !!ITEMS[p.item] && this.qty(p.item) >= (p.n ?? 1)
      case 'weather': return weatherAt(now).weather.id === p.weather
      case 'night': return weatherAt(now).night
      case 'day': return !weatherAt(now).night
      case 'omen': return this.canHunt()
      case 'patrons': return this.patronsReady() >= (p.n ?? 1)
      case 'farmReady': return this.s.farm.plots.some(pl => pl && pl.t <= 0)
      case 'noSlayerTask': return !this.s.slayer?.task
      case 'festival': return !!this.activeFestival()
      default: return false
    }
  },

  /* ---------------- actions ---------------- */
  // What a rule's action would make the hero do, as an activity key ('' to stop), or null if it can't
  ruleTarget(then) {
    const t = then
    if (t.type === 'stop') return ''
    if (t.type === 'skill') {
      const a = findAction(t.skill, t.action)
      if (!a || !this.canStart(t.skill, a) || !this.festivalOpen(a) || (t.skill === 'thieving' && this.jailed())) return null
      return `skill:${t.skill}:${t.action}`
    }
    if (t.type === 'fight') {
      const m = MONSTERS[t.monster], area = AREAS.find(ar => ar.monsters.some(x => x.id === t.monster))
      if (!m || !area || !this.areaUnlocked(area) || (m.slayer && this.level('slayer') < m.slayer) || this.attackBlocker()) return null
      return `combat:area:${t.monster}`
    }
    if (t.type === 'huntOmen') return this.canHunt() ? `combat:omen:${this.activeOmen().hunt}` : null
    return null
  },
  startTarget(then) {
    const t = then
    if (t.type === 'stop') return this.stop()
    if (t.type === 'skill') return this.startSkill(t.skill, t.action)
    if (t.type === 'fight') return this.startCombat('area', t.monster)
    if (t.type === 'huntOmen') return this.startCombat('omen', this.activeOmen().hunt)
  },
  // Quick actions: true when something was done
  quickAction(then) {
    const t = then
    if (t.type === 'serve') return this.serveAll().n > 0
    if (t.type === 'harvest') return this.harvestAll() > 0
    if (t.type === 'collectYard') return ['coop', 'hive'].some(id => this.farmReady(id) && this.collectFarm(id))
    if (t.type === 'sell') { const n = this.qty(t.item) - (t.n ?? 0); return n > 0 && this.sell(t.item, n) > 0 }
    if (t.type === 'sellJunk') return this.sellJunk() > 0
    if (t.type === 'slayerTask') {
      if (this.s.slayer?.task) return false
      const offers = this.slayerOffers(), i = offers.findIndex(o => o.kind === (t.kind || SLAYER_KINDS[1]))
      return this.takeOffer(i >= 0 ? i : 0)
    }
    return false
  },
  logRule(rule) {
    const r = this.ensureRoutines()
    r.log.unshift({ at: Date.now(), id: rule.id, when: { ...rule.when }, then: { ...rule.then } })
    if (r.log.length > LOG_SIZE) r.log.length = LOG_SIZE
  },

  /* ---------------- running ---------------- */
  runRoutines(now = Date.now()) {
    const r = this.ensureRoutines()
    if (!r.on || !r.rules.length) return
    // The player changed the activity by hand since the last look: interrupting rules hold back a while
    const key = activityKey(this.s.activity)
    if (key !== r.lastKey && key) r.manualAt = now
    r.lastKey = key
    const handsOff = now - (r.manualAt || 0) < MANUAL_PAUSE
    let activityDecided = false
    for (const rule of r.rules) {
      if (!rule.on) continue
      const def = ACTIONS_LIST[rule.then.type]
      if (!def || !CONDITIONS[rule.when.type]) continue
      if (def.activity && activityDecided) continue
      let holds = false
      try { holds = this.ruleHolds(rule.when, now) } catch { holds = false }
      if (!holds) continue
      if (!def.activity) {
        if (now - (rule.last || 0) < QUICK_WAIT) continue
        let done = false
        try { done = this.quickAction(rule.then) } catch { done = false }
        if (done) { rule.last = now; this.logRule(rule) }
        continue
      }
      // A rule whose activity is already running keeps the lower ones from changing it
      const target = this.ruleTarget(rule.then)
      if (target === null) continue
      if (target === key) { activityDecided = true; continue }
      if (this.s.activity && (!rule.interrupt || handsOff)) continue
      if (!this.s.activity && target === '') continue
      this.startTarget(rule.then)
      rule.last = now
      r.lastKey = activityKey(this.s.activity)
      this.logRule(rule)
      activityDecided = true
    }
  },
}
