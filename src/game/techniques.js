/* =========================================================
   TECHNIQUES — each "flat" skill's own twist: rich veins, felled trees, momentum at the forge,
   the fletching bench, the stove and the cauldron, a bonfire that keeps burning, and runes that
   resonate with the sky.
   Mixed into G (engine.js); `this` is the engine. completeAction() calls into these.
   ========================================================= */
import { VEIN, FELL, MOMENTUM, MOMENTUM_COOL, BONFIRE, RESONANCE, RESONANCE_BONUS } from './data/techniques.js'
import { weatherAt } from './data/weather.js'

// vein: rich swings left · fell: cuts at each tree · momentum: the skill being worked and its stacks ·
// bonfire: until when it burns · last: the latest notable moment, for the screen
export const techniquesState = () => ({ technique: { vein: 0, fell: {}, momentum: { skill: null, n: 0, at: 0 }, bonfire: 0, last: null } })

export const techniques = {
  ensureTech() {
    const t = (this.s.technique ||= techniquesState().technique)
    t.fell ||= {}
    t.momentum ||= { skill: null, n: 0, at: 0 }
    return t
  },
  /* ---------------- momentum ---------------- */
  // Stacks of the skill being worked, if it is still warm
  momentumOf(skill, now = Date.now()) {
    const m = this.s.technique?.momentum
    if (!m || m.skill !== skill || now - m.at > MOMENTUM_COOL) return 0
    return m.n
  },
  momentumBonus(skill, now = Date.now()) { const d = MOMENTUM[skill]; return d ? this.momentumOf(skill, now) * d.per : 0 },
  buildMomentum(skill, now = Date.now()) {
    const d = MOMENTUM[skill]
    if (!d) return
    const m = this.ensureTech().momentum
    if (m.skill !== skill || now - m.at > MOMENTUM_COOL) { m.skill = skill; m.n = 0 }
    m.n = Math.min(d.max, m.n + 1)
    m.at = now
  },
  breakMomentum(skill) { const m = this.s.technique?.momentum; if (m?.skill === skill) m.n = 0 },
  /* ---------------- the bonfire ---------------- */
  hearthLeft(now = Date.now()) { return Math.max(0, (this.s.technique?.bonfire || 0) - now) },
  stokeHearth(now = Date.now()) {
    const t = this.ensureTech()
    t.bonfire = Math.min(now + BONFIRE.cap, Math.max(t.bonfire || 0, now) + BONFIRE.perLog)
  },
  /* ---------------- runes and the sky ---------------- */
  resonates(item, now = Date.now()) {
    const r = RESONANCE[item]
    if (!r) return false
    const w = weatherAt(now)
    return (r.night && w.night) || (r.weather || []).includes(w.weather.id)
  },
  /* ---------------- bonuses ---------------- */
  techniqueMods(key) {
    let v = 0
    const m = this.s.technique?.momentum
    if (m?.skill && MOMENTUM[m.skill]?.mod === key) v += this.momentumBonus(m.skill)
    if (this.hearthLeft() > 0) v += BONFIRE.mods[key] || 0
    return v
  },
  techNote(kind, params = {}) { this.ensureTech().last = { kind, at: Date.now(), ...params } },
  // After an action's outputs: the skill's own extras. Returns the XP to give
  techniqueAfter(skill, a, xp, double) {
    const t = this.ensureTech()
    const outs = Object.entries(a.out)
    if (skill === 'mining' && outs.length) {
      if (t.vein > 0) {
        outs.forEach(([k]) => this.addItem(k, VEIN.extra * double))
        t.vein--
      } else if (Math.random() < VEIN.chance * (1 + this.mod('loot'))) {
        t.vein = VEIN.swings
        this.techNote('vein', { item: outs[0][0] })
      }
    }
    if (skill === 'woodcutting' && outs.length) {
      t.fell[a.id] = (t.fell[a.id] || 0) + 1
      if (t.fell[a.id] >= FELL.cuts) {
        t.fell[a.id] = 0
        outs.forEach(([k]) => this.addItem(k, FELL.logs))
        xp += a.xp * FELL.xp
        this.techNote('fell', { item: outs[0][0] })
      }
    }
    if (skill === 'herblore' && outs.length && Math.random() < this.momentumBonus('herblore')) {
      outs.forEach(([k, q]) => this.addItem(k, q))
      this.techNote('extra', { item: outs[0][0] })
    }
    if (skill === 'firemaking') this.stokeHearth()
    if (skill === 'runecrafting') {
      for (const [k, q] of outs) {
        if (!this.resonates(k)) continue
        const base = q * (a.runeMult ? this.runeMult(skill, a) : 1) * double
        this.addItem(k, Math.max(1, Math.round(base * RESONANCE_BONUS)))
      }
    }
    return xp
  },
}
