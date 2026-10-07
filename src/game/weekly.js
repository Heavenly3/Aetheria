/* =========================================================
   WEEKLY BOSS — one boss a week with a health pool that lasts all week.
   Mixed into G (engine.js); `this` is the engine.
   Fights use the normal combat loop (kind 'weekly'); the hooks below add the boss's mechanics.
   ========================================================= */
import { ITEMS } from './data/items.js'
import {
  WEEKLY_MIN_CL, WEEKLY_MAP, RESIST_MULT, ENRAGE_EVERY, ENRAGE_STEP, ATTEMPT_TIME, MILESTONES, MECHANICS,
  weekIndex, bossForWeek, weeklyStats, milestoneReward, WEEKLY_BOSSES,
} from './data/weekly.js'
import { cloneNamed } from '../i18n/bind.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const msg = (key, params = {}) => ({ key, params })

export const weeklyState = () => ({
  // week: week number · cl: combat level fixed on the first attempt · max / hp: the week's health pool
  // dealt: total damage this week · best: best single attempt · claimed: milestone indexes · slain: kills per boss, ever
  weekly: { week: -1, boss: null, cl: 0, max: 0, hp: 0, dealt: 0, best: 0, attempts: 0, claimed: [], killed: false, slain: {} },
})

let monCache = { key: '', m: null }

export const weekly = {
  /* ================= the week ================= */
  ensureWeekly(now = new Date()) {
    const s = this.s.weekly
    const w = weekIndex(now)
    if (s.week === w) return s
    const act = this.s.activity
    if (act?.type === 'combat' && act.kind === 'weekly') this.stop(msg('weekly.newWeek'))
    Object.assign(s, { week: w, boss: bossForWeek(w).id, cl: 0, max: 0, hp: 0, dealt: 0, best: 0, attempts: 0, claimed: [], killed: false })
    if (!Array.isArray(s.claimed)) s.claimed = []
    s.slain ||= {}
    return s
  },
  weeklyBoss() { return WEEKLY_MAP[this.ensureWeekly().boss] },
  weeklyUnlocked() { return this.combatLevel() >= WEEKLY_MIN_CL },
  // Before the first attempt the boss previews at the hero's current level
  weeklyCl() { return this.s.weekly.cl || Math.max(WEEKLY_MIN_CL, this.combatLevel()) },
  weeklyMaxHp() { return this.s.weekly.max || Math.round(weeklyStats(this.weeklyCl()).hp * this.diff().monster) },
  weeklyHpLeft() { return this.s.weekly.cl ? this.s.weekly.hp : this.weeklyMaxHp() },
  weeklySlainCount() { return WEEKLY_BOSSES.filter(b => this.s.weekly.slain?.[b.id]).length },
  canWeekly() { return this.weeklyUnlocked() && !this.ensureWeekly().killed },
  // The boss as a combat monster; its hits grow with each enrage step of the attempt
  weeklyMonster(act) {
    const b = this.weeklyBoss(), cl = this.weeklyCl(), f = this.diff().monster
    const step = act ? Math.floor((act.t || 0) / ENRAGE_EVERY) : 0
    const key = `${b.id}|${cl}|${f}|${step}`
    if (monCache.key !== key) {
      const st = weeklyStats(cl)
      monCache = { key, m: cloneNamed(b, {
        weekly: true, hp: this.weeklyMaxHp(), att: Math.round(st.att * f), def: Math.round(st.def * f),
        maxHit: Math.max(1, Math.round(st.maxHit * f * ENRAGE_STEP ** step)), speed: st.speed, gold: [0, 0], drops: [], enrage: step,
      }) }
    }
    return monCache.m
  },

  /* ================= an attempt ================= */
  beginWeeklyAttempt(act) {
    const s = this.ensureWeekly()
    if (!s.cl) {
      s.cl = Math.max(WEEKLY_MIN_CL, this.combatLevel())
      s.max = Math.round(weeklyStats(s.cl).hp * this.diff().monster)
      s.hp = s.max
    }
    s.attempts++
    Object.assign(act, { t: 0, mt: 0, tt: 0, hard: 0, slowT: 0, thrall: 0, recent: 0, dealt: 0 })
    act.mHp = s.hp
  },
  // Attack pace of the hero (frost slows it)
  weeklyPace(act) { return act.slowT > 0 ? MECHANICS.frost.slow : 1 },
  // What reaches the boss from one of the hero's blows
  weeklyIncoming(act, dmg, type) {
    if (dmg <= 0) return 0
    if (act.thrall > 0) {
      act.thrall = Math.max(0, act.thrall - dmg)
      if (!act.thrall) this.emit('weeklyMech', { kind: 'thrallDown' })
      return 0
    }
    const b = this.weeklyBoss()
    let mult = b.resist === type ? RESIST_MULT : 1
    if (act.hard > 0) mult *= MECHANICS.harden.mult
    return Math.max(1, Math.round(dmg * mult))
  },
  // Book the damage into the week; returns true if the hero fell to a reflected blow
  weeklyDealt(act, dealt) {
    const s = this.s.weekly
    s.hp = act.mHp
    s.dealt += dealt
    act.dealt += dealt
    act.recent += dealt
    s.best = Math.max(s.best, act.dealt)
    if (this.weeklyBoss().mechanic === 'reflect' && dealt > 0) {
      const back = Math.round(dealt * MECHANICS.reflect.share)
      if (back > 0) return this.weeklyHurt(back, this.weeklyMonster(act))
    }
    return false
  },
  weeklyHurt(dmg, m) {
    this.s.hp -= dmg
    this.emit('hit', { who: 'monster', dmg })
    this.autoEat()
    if (this.s.hp <= 0) { this.die(m); return true }
    return false
  },
  // Per-step mechanics; returns true if the attempt ended
  weeklyTick(act, dt, m) {
    this.ensureWeekly()
    if (this.s.activity !== act) return true
    act.t += dt
    if (act.t >= ATTEMPT_TIME) { this.stop(msg('weekly.timeUp', { boss: '@weekly:' + m.id, dmg: Math.round(act.dealt) })); return true }
    if (act.hard > 0) act.hard -= dt
    if (act.slowT > 0) act.slowT -= dt
    const mech = this.weeklyBoss().mechanic, cfg = MECHANICS[mech]
    act.mt += dt
    if (mech === 'harden' && act.mt >= cfg.every) { act.mt -= cfg.every; act.hard = cfg.lasts; this.emit('weeklyMech', { kind: 'harden' }) }
    if (mech === 'frost' && act.mt >= cfg.every) { act.mt -= cfg.every; act.slowT = cfg.lasts; this.emit('weeklyMech', { kind: 'frost' }) }
    if (mech === 'regen' && act.mt >= cfg.every) {
      act.mt -= cfg.every
      const heal = Math.min(this.s.weekly.max - act.mHp, Math.floor(act.recent * cfg.share))
      act.recent = 0
      if (heal > 0) { act.mHp += heal; this.s.weekly.hp = act.mHp; this.emit('weeklyMech', { kind: 'regen', n: heal }) }
    }
    if (mech === 'breath' && act.mt >= cfg.every) {
      act.mt -= cfg.every
      this.emit('weeklyMech', { kind: 'breath' })
      if (this.weeklyHurt(rand(m.maxHit, m.maxHit * 2), m)) return true
    }
    if (mech === 'summon') {
      if (!act.thrall && act.mt >= cfg.every) { act.mt = 0; act.tt = 0; act.thrall = weeklyStats(this.weeklyCl()).thrallHp; this.emit('weeklyMech', { kind: 'summon' }) }
      if (act.thrall > 0) {
        act.tt += dt
        if (act.tt >= m.speed) {
          act.tt -= m.speed
          if (Math.random() < 0.6 && this.weeklyHurt(rand(0, weeklyStats(this.weeklyCl()).thrallHit), m)) return true
        }
      }
    }
    return false
  },
  weeklyKilled(m) {
    const s = this.s.weekly, b = this.weeklyBoss()
    s.hp = 0
    s.killed = true
    this.s.stats.kills++
    const first = !s.slain[b.id]
    s.slain[b.id] = (s.slain[b.id] || 0) + 1
    if (first) { this.addItem(b.trophy, 1); this.emit('rare', { item: b.trophy, n: 1 }) }
    this.log(b.icon, 'log.weeklySlain', { boss: '@weekly:' + b.id })
    this.stop()
    this.emit('weeklyKill', { boss: b, trophy: first ? b.trophy : null })
    this.emit('kill', { monster: m, gold: 0, loot: [] })
  },

  /* ================= milestones ================= */
  milestoneReached(i) { const s = this.s.weekly; return !!s.max && (s.dealt >= MILESTONES[i] * s.max - 0.5 || s.killed) },
  milestoneClaimed(i) { return this.s.weekly.claimed.includes(i) },
  claimableMilestones() { return MILESTONES.filter((_, i) => this.milestoneReached(i) && !this.milestoneClaimed(i)).length },
  claimMilestone(i) {
    const s = this.ensureWeekly()
    if (!this.milestoneReached(i) || this.milestoneClaimed(i)) return null
    s.claimed.push(i)
    const r = milestoneReward(i, s.cl)
    const got = { gold: this.addGold(r.gold, true), items: { ...r.items }, relic: null }
    for (const [id, n] of Object.entries(r.items)) if (ITEMS[id]) this.addItem(id, n)
    if (r.relic) got.relic = this.gainRelic(r.relic)
    return got
  },
}
