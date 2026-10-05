/* =========================================================
   COLLECTION — equipment set bonuses and the bestiary.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { SETS, SET_OF } from './data/sets.js'
import { BESTIARY, BEAST_GROUP, KNOWLEDGE, HUNT_BONUS, killsFor } from './data/bestiary.js'

export const collectionState = () => ({
  // kills: lifetime count per creature, kept through ascension (killsBy restarts with each life)
  bestiary: { kills: {}, drops: {}, claimed: {} },
})

// Set bonuses only change when the equipment does, so they are cached by what is worn
let setCache = { key: null, mods: {} }

export const collection = {
  /* ================= equipment sets ================= */
  setPieces(set) {
    const worn = Object.values(this.s.equipment)
    return set.pieces.filter(id => worn.includes(id)).length
  },
  activeSets() {
    const seen = new Set()
    for (const id of Object.values(this.s.equipment)) if (id && SET_OF[id]) seen.add(SET_OF[id])
    return SETS.filter(s => seen.has(s)).map(s => ({ set: s, worn: this.setPieces(s) }))
  },
  setMods(key) {
    const eq = this.s.equipment
    const k = eq.head + eq.cape + eq.amulet + eq.weapon + eq.body + eq.shield + eq.legs
    if (setCache.key !== k) {
      const mods = {}
      for (const { set, worn } of this.activeSets())
        for (const b of set.bonuses) if (worn >= b.n) for (const m in b.mods) mods[m] = (mods[m] || 0) + b.mods[m]
      setCache = { key: k, mods }
    }
    return setCache.mods[key] || 0
  },

  /* ================= bestiary ================= */
  beastKills(id) { return this.s.bestiary.kills?.[id] || 0 },
  countBeast(id) { if (BEAST_GROUP[id]) this.s.bestiary.kills[id] = (this.s.bestiary.kills[id] || 0) + 1 },
  // Highest knowledge tier reached for a creature, or null if never defeated
  knowledge(m) {
    const kills = this.beastKills(m.id)
    let tier = null
    for (const k of KNOWLEDGE) if (kills >= killsFor(m, k)) tier = k
    return tier
  },
  knows(m, tier) { return this.beastKills(m.id) >= killsFor(m, tier) },
  // Scaled copies (dungeon rooms) keep the id and boss flag of the original, so they count too
  huntBonus(m) { return m && BEAST_GROUP[m.id] && this.knows(m, 'hunted') ? HUNT_BONUS : 0 },
  dropSeen(monsterId, item) { return !!this.s.bestiary.drops[monsterId]?.[item] },
  recordDrop(monsterId, item) {
    if (!BEAST_GROUP[monsterId]) return
    const d = this.s.bestiary.drops
    ;(d[monsterId] ||= {})[item] = 1
  },
  groupProgress(g) {
    return { done: g.monsters.filter(m => this.knows(m, 'studied')).length, total: g.monsters.length }
  },
  groupComplete(g) { const p = this.groupProgress(g); return p.done === p.total },
  groupClaimed(g) { return !!this.s.bestiary.claimed[g.id] },
  claimGroup(id) {
    const g = BESTIARY.find(x => x.id === id)
    if (!g || this.groupClaimed(g) || !this.groupComplete(g)) return false
    this.s.bestiary.claimed[g.id] = true
    this.addGold(g.reward.gold)
    this.log(g.icon, 'log.bestiaryGroup', { group: '@beasts:' + g.id })
    return true
  },
  claimableGroups() { return BESTIARY.filter(g => this.groupComplete(g) && !this.groupClaimed(g)).length },
  bestiaryMods(key) {
    let v = 0
    for (const id in this.s.bestiary.claimed) { const g = BESTIARY.find(x => x.id === id); if (g) v += g.reward.mods[key] || 0 }
    return v
  },
  huntedCount() { return BESTIARY.reduce((a, g) => a + g.monsters.filter(m => this.knows(m, 'hunted')).length, 0) },
  bestiaryProgress() {
    const all = BESTIARY.flatMap(g => g.monsters)
    return { seen: all.filter(m => this.knows(m, 'seen')).length, total: all.length }
  },
}
