/* =========================================================
   CROWN — the seven shards of the Aether Crown: found again in every life, set in the circlet for
   their bonus, called on for their powers, and at the end given to someone.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { SHARDS, SHARD_MAP, SOCKETS, CHOICE_BOSS, ENDINGS, ENDING_MAP } from './data/crown.js'

// crown: this life's shards (found), the circlet's sockets, powers' cooldowns and running powers
// legacy: what outlives every life (the endings chosen so far)
export const crownState = () => ({
  crown: { found: {}, sockets: Array(SOCKETS).fill(null), ready: {}, active: {} },
  legacy: { endings: {} },
})

export const crown = {
  ensureCrown() {
    const c = (this.s.crown ||= crownState().crown)
    c.found ||= {}; c.ready ||= {}; c.active ||= {}
    if (!Array.isArray(c.sockets)) c.sockets = []
    while (c.sockets.length < SOCKETS) c.sockets.push(null)
    this.s.legacy ||= { endings: {} }
    this.s.legacy.endings ||= {}
    return c
  },
  shardFound(id) { return !!this.s.crown?.found?.[id] },
  shardsFound() { return SHARDS.filter(s => this.shardFound(s.id)).length },
  crownWhole() { return SHARDS.every(s => this.shardFound(s.id)) },
  // New shards are found as the story reaches them; a free socket takes them at once
  checkCrown(quiet = false) {
    const c = this.ensureCrown()
    for (const s of SHARDS) {
      if (c.found[s.id]) continue
      let ok = false
      try { ok = s.check(this) } catch { ok = false }
      if (!ok) continue
      c.found[s.id] = Date.now()
      if (!s.heart) { const i = c.sockets.indexOf(null); if (i >= 0) c.sockets[i] = s.id }
      if (quiet) continue
      this.log(s.icon, 'log.shard', { shard: '@shard:' + s.id })
      this.emit('shard', s)
    }
  },
  // A shard counts when it sits in a socket; the Heart always counts once it wakes
  shardActive(id) {
    const s = SHARD_MAP[id]
    if (!s || !this.shardFound(id)) return false
    return s.heart || this.s.crown.sockets.includes(id)
  },
  setSocket(i, id) {
    const c = this.ensureCrown()
    if (i < 0 || i >= SOCKETS) return false
    if (id && (!this.shardFound(id) || SHARD_MAP[id].heart)) return false
    const was = c.sockets.indexOf(id)
    if (id && was >= 0) c.sockets[was] = c.sockets[i]
    c.sockets[i] = id || null
    return true
  },
  /* ---------------- powers ---------------- */
  powerReadyIn(id, now = Date.now()) { return Math.max(0, (this.s.crown?.ready?.[id] || 0) - now) },
  powerLeft(id, now = Date.now()) { return Math.max(0, (this.s.crown?.active?.[id] || 0) - now) },
  canUsePower(id, now = Date.now()) { return !!SHARD_MAP[id]?.power && this.shardActive(id) && this.powerReadyIn(id, now) <= 0 },
  usePower(id, now = Date.now()) {
    if (!this.canUsePower(id, now)) return false
    const c = this.ensureCrown(), p = SHARD_MAP[id].power
    c.ready[id] = now + p.cd
    if (p.time) c.active[id] = now + p.time
    // Bloom: every growing plot is ready at once
    if (p.instant === 'bloom') this.s.farm.plots.forEach(pl => { if (pl && pl.t > 0) pl.t = 0 })
    this.emit('shardPower', { id, power: p.id })
    return true
  },
  /* ---------------- bonuses ---------------- */
  crownMods(key) { return this.memo('crown', this.crownTotals)[key] || 0 },
  // Every bonus of the crown at once: set shards, powers at work and the endings chosen
  crownTotals() {
    const c = this.s.crown, out = {}
    const add = mods => { for (const k in mods) out[k] = (out[k] || 0) + mods[k] }
    if (c) {
      const now = Date.now()
      for (const s of SHARDS) {
        if (!this.shardActive(s.id)) continue
        add(s.mods)
        if ((c.active?.[s.id] || 0) > now) add(s.power.mods)
      }
    }
    for (const id in this.s.legacy?.endings || {}) add(ENDING_MAP[id]?.mods)
    return out
  },
  /* ---------------- the choice ---------------- */
  canChooseEnding() { return this.crownWhole() && (this.s.killsBy?.[CHOICE_BOSS] || 0) > 0 && !this.s.crown.chosen },
  endingsChosen() { return ENDINGS.filter(e => this.s.legacy?.endings?.[e.id]) },
  chooseEnding(id) {
    if (!ENDING_MAP[id] || !this.canChooseEnding()) return false
    this.ensureCrown()
    this.s.crown.chosen = id
    this.s.legacy.endings[id] ||= Date.now()
    this.log(ENDING_MAP[id].icon, 'log.ending', { ending: '@ending:' + id })
    this.emit('ending', ENDING_MAP[id])
    this.checkJournal()
    return true
  },
}
