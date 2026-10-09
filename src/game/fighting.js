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
} from './data/fighting.js'

const eliteCache = new Map()

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
    if (act.kind === 'area' && Math.random() < ELITE_CHANCE + this.mod('eliteChance')) act.elite = ELITE_IDS[Math.floor(Math.random() * ELITE_IDS.length)]
    act.fx = { player: act.fx?.player || {}, monster: {} }
    act.mHp = this.getMonster(act).hp
    act.pTimer = 0
    act.mTimer = 0
    if (act.elite) this.emit('elite', { kind: act.elite, monster: this.getMonster(act) })
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
    const avgTaken = (ref.maxHit / 2) * (1 - this.blockChance() / 2)
    const takenPerSec = (hitTaken * avgTaken) / ref.speed
    const maxHp = this.maxHp()
    const killTime = dps > 0 ? ref.hp / dps : Infinity
    // How long the hero lasts against the reference opponent, and how fast it falls
    const lasts = takenPerSec > 0 ? maxHp / takenPerSec : 600
    const power = Math.round(Math.sqrt(dps * Math.min(lasts, 600)) * 10)
    return {
      maxHit: ps.maxHit, avgHit, accuracy, speed, dps, crit, critMult, accRoll: ps.accRoll, defRoll: ps.defRoll,
      hitTaken, takenPerSec, dodge: this.dodgeChance(), block: this.blockChance(), maxHp, killTime,
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
              this.dotXp(dealt)
              this.emit('hit', { who: 'player', dmg: dealt, fx: id })
              if (act.mHp <= 0) return 'monster'
            } else {
              this.s.hp -= dmg
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
