/* =========================================================
   FIGHTING — weapon pace, critical hits, dodging and blocking, statuses,
   creature traits and elites. The combat loop in engine.js calls into these.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { toRaw } from 'vue'
import { cloneNamed } from '../i18n/bind.js'
import { ITEMS } from './data/items.js'
import { COMBAT_STYLES } from './data/combat.js'
import {
  weaponProfile, SPELL_FX, AIR_SPEED, STATUSES, TRAITS, traitsOf, ELITES, ELITE_IDS, ELITE_CHANCE,
  ABILITIES, ABILITY_MAP, ABILITY_SKILL, BUFFS, ENERGY, ENERGY_MAX, BAR_SIZE, defaultBar,
  BOSS_PHASES, STREAK_STEP, STREAK_BONUS, STREAK_MAX, COMBAT_SKILLS, ARMOUR_K, ARMOUR_CAP,
} from './data/fighting.js'

const eliteCache = new Map()
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

// bar: the abilities chosen for each style, in priority order; auto: whether they fire on their own
// hunt: kills in a row without dying, and the best run ever
export const fightingState = () => ({ abilities: { bar: defaultBar(), auto: true }, hunt: { streak: 0, best: 0 } })

export const fighting = {
  /* ================= the hero ================= */
  weapon() { return weaponProfile(this.s.equipment.weapon) },
  // Seconds between the hero's attacks: the weapon's pace, quicker with air spells and speed bonuses
  attackSpeed() {
    let s = this.weapon().speed
    if (this.styleType() === 'magic' && this.currentSpell().el === 'air') s *= AIR_SPEED
    return s / (1 + this.mod('atkSpeed'))
  },
  critChance() { return Math.min(0.75, this.weapon().crit + this.mod('crit')) },
  critMult() { return this.weapon().critDmg + this.mod('critDmg') },
  // Agility makes the hero harder to hit; a shield can block half a blow
  dodgeChance() { return Math.min(0.25, this.level('agility') * 0.0015 + this.mod('dodge')) },
  blockChance() { return this.s.equipment.shield ? Math.min(0.4, 0.12 + this.mod('block')) : 0 },
  // Share of every blow the hero's armour soaks up, from the defence on their gear
  damageReduction() {
    const d = Math.max(0, this.bonuses().def)
    return Math.min(ARMOUR_CAP, d / (d + ARMOUR_K) + this.mod('reduction'))
  },
  // Statuses the hero's hits can leave: the weapon's, plus the spell element's
  heroEffects() {
    const out = []
    const w = this.weapon()
    if (w.fx) out.push(w.fx)
    if (this.styleType() === 'magic') { const f = SPELL_FX[this.currentSpell().el]; if (f) out.push(f) }
    return out
  },

  /* ================= creatures ================= */
  monsterTraits(m, act = this.s.activity) {
    const list = [...traitsOf(m.id)]
    const e = act?.elite && ELITES[act.elite]
    if (e?.trait && !list.includes(e.trait)) list.push(e.trait)
    return list
  },
  // The value of one trait property summed over the creature's traits (armour, regen, drain…)
  traitValue(m, key, act) { return this.monsterTraits(m, act).reduce((v, id) => v + (TRAITS[id][key] || 0), 0) },
  // An elite version of a creature, cached per creature and kind of elite
  eliteMonster(m, kind) {
    const e = ELITES[kind]
    const key = m.id + '|' + kind + '|' + m.hp
    let s = eliteCache.get(key)
    if (!s) {
      s = cloneNamed(m, {
        hp: Math.round(m.hp * e.hp), att: Math.round(m.att * e.att), def: Math.round(m.def * e.def),
        maxHit: Math.max(1, Math.round(m.maxHit * e.maxHit)), speed: m.speed * e.speed, elite: kind,
      })
      eliteCache.set(key, s)
    }
    return s
  },
  // A new creature steps up: only open-field fights can bring an elite
  spawn(act) {
    act.elite = null
    if (this.rollSuperior(act)) act.elite = 'superior'
    else if (act.kind === 'area' && Math.random() < ELITE_CHANCE + this.mod('eliteChance')) act.elite = ELITE_IDS[Math.floor(Math.random() * ELITE_IDS.length)]
    act.fx = { player: act.fx?.player || {}, monster: {} }
    act.phase = 0
    act.mHp = this.getMonster(act).hp
    act.pTimer = 0
    act.mTimer = 0
    if (act.elite) {
      this.note(act, 'elite', { id: act.elite })
      this.emit('elite', { kind: act.elite, monster: this.getMonster(act) })
    }
  },

  /* ================= what the hero is worth in a fight ================= */
  // A plain opponent at the hero's own combat level, for numbers outside of a fight
  referenceMonster() {
    const cl = this.combatLevel()
    return { id: '_reference', hp: 10 + cl * 4, att: cl, def: cl, maxHit: Math.max(1, Math.round(cl / 3)), speed: 2.4, gold: [0, 0], drops: [] }
  },
  // Expected numbers against a creature (or the reference one): damage per second, time to kill,
  // how often it hits back and how much it hurts, plus a single "power" score that sums it all up
  combatProfile(m = null) {
    const ref = m || this.referenceMonster()
    const ps = this.playerStats(ref), mr = this.monsterRolls(ref)
    const accuracy = this.hitChance(ps.accRoll, mr.defRoll) * (1 - this.traitValue(ref, 'evade', {}))
    const crit = this.critChance(), critMult = this.critMult()
    const avgHit = ((1 + ps.maxHit) / 2) * (1 + crit * (critMult - 1)) * (1 - this.traitValue(ref, 'armour', {}))
    // Statuses the weapon leaves add damage over time on top of each landed hit
    let dot = 0
    for (const f of this.heroEffects()) { const d = STATUSES[f.id]; if (d.dot) dot += f.chance * d.dot * d.time }
    const speed = this.attackSpeed()
    const dps = (accuracy * avgHit * (1 + dot)) / speed
    const hitTaken = this.hitChance(mr.accRoll, ps.defRoll) * (1 - this.dodgeChance())
    const reduction = this.damageReduction()
    const avgTaken = (ref.maxHit / 2) * (1 - this.blockChance() / 2) * (1 - reduction)
    const takenPerSec = (hitTaken * avgTaken) / ref.speed
    const maxHp = this.maxHp()
    const killTime = dps > 0 ? ref.hp / dps : Infinity
    // How long the hero lasts against the reference opponent, and how fast it falls
    const lasts = takenPerSec > 0 ? maxHp / takenPerSec : 600
    const power = Math.round(Math.sqrt(dps * Math.min(lasts, 600)) * 10)
    return {
      maxHit: ps.maxHit, avgHit, accuracy, speed, dps, crit, critMult, accRoll: ps.accRoll, defRoll: ps.defRoll,
      hitTaken, takenPerSec, dodge: this.dodgeChance(), block: this.blockChance(), reduction, maxHp, killTime,
      // Share of the hero's health lost per kill: under 0.3 is safe, over 1 means trouble
      risk: killTime === Infinity ? Infinity : (takenPerSec * killTime) / maxHp, power,
    }
  },
  // Works out something as if an item were worn, then puts everything back as it was
  withGear(id, fn) {
    const it = ITEMS[id]
    const eq = toRaw(this.s.equipment), raw = toRaw(this.s)
    const saved = { ...eq }, style = raw.combatStyle
    eq[it.slot] = id
    if (it.twoHanded) eq.shield = null
    if (it.slot === 'shield' && eq.weapon && ITEMS[eq.weapon].twoHanded) eq.weapon = null
    // A weapon of another style is judged with its own style
    if (it.slot === 'weapon') {
      const type = it.style || 'melee'
      if (type !== this.styleType()) raw.combatStyle = type === 'melee' ? 'attack' : type
    }
    try { return fn() } finally { Object.assign(eq, saved); raw.combatStyle = style }
  },

  /* ================= abilities ================= */
  abilityUnlocked(a, type = this.styleType()) { return this.level(ABILITY_SKILL[type]) >= a.lvl },
  abilitiesFor(type = this.styleType()) { return ABILITIES[type] },
  abilityBar(type = this.styleType()) {
    const ab = this.s.abilities
    ab.bar ||= defaultBar()
    return (ab.bar[type] ||= [])
  },
  // Put an ability on the bar, or take it off if it is already there
  toggleAbility(id) {
    const a = ABILITY_MAP[id], type = this.styleType()
    if (!a || !ABILITIES[type].includes(a) || !this.abilityUnlocked(a, type)) return false
    const bar = this.abilityBar(type), i = bar.indexOf(id)
    if (i >= 0) bar.splice(i, 1)
    else if (bar.length < BAR_SIZE) bar.push(id)
    else return false
    return true
  },
  moveAbility(id, dir) {
    const bar = this.abilityBar(), i = bar.indexOf(id), j = i + dir
    if (i < 0 || j < 0 || j >= bar.length) return
    ;[bar[i], bar[j]] = [bar[j], bar[i]]
  },
  buffValue(act, key) {
    let v = 0
    for (const id in act?.hb || {}) v += BUFFS[id][key] || 0
    return v
  },
  // The first ability on the bar that is ready and worth using now. The bar is a priority list:
  // while an earlier ability is off cooldown but still charging, later ones keep its energy aside
  readyAbility(act) {
    if (this.s.abilities?.auto === false) return null
    const type = this.styleType(), energy = act.energy || 0
    let reserve = 0
    for (const id of this.abilityBar(type)) {
      const a = ABILITY_MAP[id]
      if (!a || !this.abilityUnlocked(a, type) || (act.cd?.[id] || 0) > 0) continue
      if (a.heal && this.s.hp > this.maxHp() * 0.7) continue // healing waits until it is needed
      if (a.buff && act.hb?.[a.buff]) continue
      if (energy - a.cost >= reserve) return a
      reserve = Math.max(reserve, a.cost)
    }
    return null
  },
  // Cooldowns and the hero's boons run down with time
  tickAbilities(act, dt) {
    for (const id in act.cd || {}) if ((act.cd[id] -= dt) <= 0) delete act.cd[id]
    for (const id in act.hb || {}) if ((act.hb[id].t -= dt) <= 0) delete act.hb[id]
  },
  gainEnergy(act, n) { act.energy = Math.min(ENERGY_MAX, (act.energy || 0) + n) },
  // One blow from the hero: a normal attack, or one hit of an ability.
  // Returns 'kill' or 'end' (the weekly attempt is over) when the fight must stop, else whether it crit
  heroHit(act, m, ps, mr, ab = null, first = true) {
    const type = this.styleType()
    const evaded = Math.random() < this.traitValue(m, 'evade')
    const hit = !evaded && Math.random() < Math.min(1, this.hitChance(ps.accRoll, mr.defRoll) + (ab?.acc || 0))
    let dmg = hit ? rand(1, ps.maxHit) : 0 // a landed blow always does at least 1
    const crit = hit && Math.random() < this.critChance() + (ab?.crit || 0) + this.buffValue(act, 'crit')
    if (crit) dmg = Math.floor(dmg * this.critMult())
    if (hit) dmg = Math.max(1, Math.round(dmg * (ab ? ab.mult : 1) * (1 + this.buffValue(act, 'dmg')) * (1 - this.traitValue(m, 'armour') - this.phaseOf(act).armour) * (1 - this.weakenOf(act, 'player'))))
    const dealt = Math.min(act.kind === 'weekly' ? this.weeklyIncoming(act, dmg, type) : dmg, act.mHp)
    act.mHp -= dealt
    this.track(act, 'dealt', dealt)
    if (type === 'magic') this.addXp('magic', (first ? this.currentSpell().xp : 0) + dealt * 2)
    else if (dealt > 0) this.addXp(COMBAT_STYLES[this.s.combatStyle].skill, dealt * 4)
    if (dealt > 0) this.addXp('hitpoints', dealt * 1.33)
    this.emit('hit', { who: 'player', dmg, crit, evaded, ability: ab?.id })
    if (crit && dmg >= ps.maxHit) this.note(act, 'bigCrit', { dmg })
    // Weapons, spells and abilities can leave statuses; the weekly boss keeps its own rules
    if (dealt > 0 && act.kind !== 'weekly') {
      for (const f of this.heroEffects()) if (Math.random() < f.chance) this.addStatus(act, 'monster', f.id, dealt)
      for (const id of ab?.fx || []) this.addStatus(act, 'monster', id, dealt)
    }
    if (act.kind === 'weekly' && this.weeklyDealt(act, dealt)) return 'end'
    if (act.mHp <= 0) return 'kill'
    return crit
  },
  // The hero's turn: an ability if one is ready, else a normal attack that builds energy
  heroTurn(act, m, ps, mr) {
    const ab = this.readyAbility(act)
    if (ab) {
      act.energy -= ab.cost
      ;(act.cd ||= {})[ab.id] = ab.cd
      if (ab.heal) this.heal(Math.round(this.maxHp() * ab.heal))
      if (ab.buff) (act.hb ||= {})[ab.buff] = { t: BUFFS[ab.buff].time }
      this.emit('ability', { id: ab.id })
      this.note(act, 'ability', { id: ab.id })
      for (let i = 0; i < (ab.mult > 0 ? ab.hits : 0); i++) {
        const r = this.heroHit(act, m, ps, mr, ab, i === 0)
        if (r === 'kill' || r === 'end') return r
      }
      return null
    }
    const r = this.heroHit(act, m, ps, mr)
    if (r === 'kill' || r === 'end') return r
    this.gainEnergy(act, ENERGY.attack + (r ? ENERGY.crit : 0))
    return null
  },

  /* ================= boss phases ================= */
  phaseOf(act) { return (act?.phase && BOSS_PHASES[act.phase - 1]) || { speed: 1, maxHit: 1, armour: 0 } },
  // Bosses (not the weekly one, which has its own mechanics) grow fiercer as their health drops
  checkPhase(act, m) {
    if (!m.boss || act.kind === 'weekly') return
    while (act.phase < BOSS_PHASES.length && act.mHp <= m.hp * BOSS_PHASES[act.phase].at) {
      const ph = BOSS_PHASES[act.phase]
      act.phase++
      if (ph.weaken) this.addStatus(act, 'player', 'weaken', m.maxHit)
      this.note(act, 'phase', { id: ph.id })
      this.emit('bossPhase', { id: ph.id, monster: m })
    }
  },

  /* ================= hunting streaks ================= */
  streakBonus() { return Math.min(STREAK_MAX, Math.floor((this.s.hunt?.streak || 0) / STREAK_STEP) * STREAK_BONUS) },
  // The streak adds to loot and to the XP of combat skills
  streakMods(key) {
    if (!this.s.hunt?.streak) return 0
    if (key === 'loot') return this.streakBonus()
    if (key.startsWith('xp.') && COMBAT_SKILLS.includes(key.slice(3))) return this.streakBonus()
    return 0
  },
  addStreak() {
    const h = (this.s.hunt ||= { streak: 0, best: 0 })
    h.streak++
    h.best = Math.max(h.best, h.streak)
    if (h.streak % STREAK_STEP === 0 && this.streakBonus() <= STREAK_MAX) this.emit('huntStreak', { n: h.streak, bonus: this.streakBonus() })
  },
  loseStreak() {
    const h = this.s.hunt
    if (!h?.streak) return
    if (h.streak >= STREAK_STEP) this.log('broken-skull', 'log.streakLost', { n: h.streak })
    h.streak = 0
  },

  /* ================= live numbers ================= */
  // Each fight keeps its own running totals: time, damage dealt and taken, and what it has earned
  startTracking(act) {
    act.live = { t: 0, dealt: 0, taken: 0, xp: this.combatXp(), gold: this.s.stats.goldEarned || 0 }
    act.notes = []
  },
  combatXp() { return COMBAT_SKILLS.reduce((sum, k) => sum + (this.s.skills[k]?.xp || 0), 0) },
  track(act, key, n) { if (act.live) act.live[key] += n },
  liveStats(act = this.s.activity) {
    const l = act?.live
    if (!l || l.t < 1) return null
    const h = l.t / 3600
    return {
      t: l.t, dps: l.dealt / l.t, taken: l.taken / l.t, killsH: act.runKills / h,
      xpH: (this.combatXp() - l.xp) / h, goldH: ((this.s.stats.goldEarned || 0) - l.gold) / h,
    }
  },
  // A short list of the fight's notable moments, newest first
  note(act, kind, params = {}) {
    if (!act.notes) act.notes = []
    act.notes.unshift({ kind, ...params, at: Math.round(act.live?.t || 0) })
    if (act.notes.length > 6) act.notes.length = 6
  },

  /* ================= statuses ================= */
  // side: 'player' (on the hero) or 'monster'; power: the hit that caused it, for damage over time
  addStatus(act, side, id, power) {
    const def = STATUSES[id]
    act.fx ||= { player: {}, monster: {} }
    const cur = act.fx[side][id]
    if (cur && def.stacks) Object.assign(cur, { t: def.time, n: Math.min(def.stacks, cur.n + 1), power: Math.max(cur.power, power) })
    else act.fx[side][id] = { t: def.time, n: 1, power, tick: 0 }
    this.emit('status', { side, id })
  },
  hasStatus(act, side, id) { return !!act.fx?.[side]?.[id] },
  // Slow stretches the time between attacks; weaken lowers damage
  slowOf(act, side) { return this.hasStatus(act, side, 'slow') ? STATUSES.slow.slow : 0 },
  weakenOf(act, side) { return this.hasStatus(act, side, 'weaken') ? STATUSES.weaken.weaken : 0 },
  // Ticks every status; returns 'monster' or 'player' if someone fell to damage over time
  tickStatuses(act, dt) {
    if (!act.fx) return null
    for (const side of ['monster', 'player']) {
      const fx = act.fx[side]
      for (const id in fx) {
        const s = fx[id], def = STATUSES[id]
        if (def.dot) {
          s.tick += Math.min(dt, s.t) // no ticks past the end of the status
          while (s.tick >= 1) {
            s.tick -= 1
            const dmg = Math.max(1, Math.round(s.power * def.dot * s.n))
            if (side === 'monster') {
              const dealt = Math.min(dmg, act.mHp)
              act.mHp -= dealt
              this.track(act, 'dealt', dealt)
              this.dotXp(dealt)
              this.emit('hit', { who: 'player', dmg: dealt, fx: id })
              if (act.mHp <= 0) return 'monster'
            } else {
              this.s.hp -= dmg
              this.track(act, 'taken', dmg)
              this.emit('hit', { who: 'monster', dmg, fx: id })
              this.autoEat()
              if (this.s.hp <= 0) return 'player'
            }
          }
        }
        s.t -= dt
        if (s.t <= 0) delete fx[id]
      }
    }
    return null
  },
  // Damage over time trains the style that caused it, like a normal hit
  dotXp(dealt) {
    if (dealt <= 0) return
    const type = this.styleType()
    if (type === 'magic') this.addXp('magic', dealt * 2)
    else this.addXp(COMBAT_STYLES[this.s.combatStyle].skill, dealt * 4)
    this.addXp('hitpoints', dealt * 1.33)
  },
}
