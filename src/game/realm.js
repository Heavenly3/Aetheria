/* =========================================================
   REALM — the regions' threat: it grows with time, falls with every hunt, and changes how their
   creatures fight and what they carry. Cleansing an overrun region pays a bounty.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { AREAS } from './data/combat.js'
import { THREAT, THREAT_EFFECT, CLEANSE, REGION_OF, threatLevel, threatShare } from './data/realm.js'

const H = 3600e3
// regions: threat and when it was last settled, and whether it was overrun · cleansed: bounties earned
export const realmState = () => ({ realm: { regions: {}, cleansed: 0 } })

export const realm = {
  ensureRealm(now = Date.now()) {
    const r = (this.s.realm ||= realmState().realm)
    r.regions ||= {}
    AREAS.forEach((a, i) => {
      if (r.regions[a.id]) return
      // Each region starts somewhere between calm and restless, always the same for a new world
      const [lo, hi] = THREAT.start
      r.regions[a.id] = { threat: lo + ((i * 37) % 100) / 100 * (hi - lo), at: now, overrun: false }
    })
    return r
  },
  // A region's threat right now, counting the time since it was last settled (reading never changes it)
  threatOf(id, now = Date.now()) {
    const g = this.s.realm?.regions?.[id]
    if (!g) return 0
    return Math.min(THREAT.max, g.threat + THREAT.rise * Math.max(0, now - g.at) / H)
  },
  threatLevelOf(id, now) { return threatLevel(this.threatOf(id, now)) },
  // How strongly a region's threat shows, 0 to 1, for a creature (bosses keep to themselves)
  regionShare(m, now) {
    const id = m && !m.boss && REGION_OF[m.id]
    return id ? threatShare(this.threatOf(id, now)) : 0
  },
  regionEffect(m, key) { return this.regionShare(m) * (THREAT_EFFECT[key] || 0) },
  // Settles every region's threat and announces the ones that just got overrun
  tickRealm(now = Date.now()) {
    const r = this.ensureRealm(now)
    for (const a of AREAS) {
      const g = r.regions[a.id]
      g.threat = this.threatOf(a.id, now)
      g.at = now
      if (!g.overrun && g.threat >= CLEANSE.from) {
        g.overrun = true
        this.log('death-skull', 'log.overrun', { area: '@area:' + a.id })
        this.emit('overrun', { area: a.id })
      }
    }
  },
  // Every creature hunted in a region calms it down a little
  easeThreat(monsterId, elite = false, now = Date.now()) {
    const id = REGION_OF[monsterId]
    const r = this.ensureRealm(now), g = id && r.regions[id]
    if (!g) return
    g.threat = Math.max(0, this.threatOf(id, now) - (elite ? THREAT.perElite : THREAT.perKill))
    g.at = now
    if (g.threat >= CLEANSE.from) g.overrun = true
    // An overrun region brought back to calm: the king pays
    if (g.overrun && g.threat <= CLEANSE.to) {
      g.overrun = false
      const area = AREAS.find(a => a.id === id)
      const gold = this.addGold(CLEANSE.gold(area.recLvl), true)
      r.cleansed = (r.cleansed || 0) + 1
      this.log('laurel-crown', 'log.cleansed', { area: '@area:' + id, gold })
      this.emit('cleansed', { area: id, gold })
    }
  },
}
