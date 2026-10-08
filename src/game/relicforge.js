/* =========================================================
   RELIC FORGE — reforge, fuse and reshape omen relics.
   Mixed into G (engine.js); `this` is the engine.
   A relic is picked either from the inventory or from an equipment slot (worn relics can be
   reforged in place; fusing and reshaping only take relics from the bag).
   ========================================================= */
import { ITEMS } from './data/items.js'
import {
  SEAL_ITEM, HEAT_MAX, FUSE_COUNT, REFORGE_COST, FUSE_COST, RESHAPE_COST, RELIC_BASES,
  relicId, nextQuality, qualityRank, reforgeOdds, rollOdds,
} from './data/relicforge.js'

export const relicForgeState = () => ({
  // heat: favours better rolls after bad ones · counts for statistics and achievements
  relicForge: { heat: 0, reforged: 0, fused: 0, reshaped: 0, ascended: 0, forgedMythic: 0 },
})

const isRelic = id => !!ITEMS[id]?.relic

export const relicForge = {
  /* ================= what the hero holds ================= */
  // Every relic the hero has: worn ones first, then the bag, best quality first
  relicsOwned() {
    const out = []
    for (const [slot, id] of Object.entries(this.s.equipment)) if (isRelic(id)) out.push({ id, slot, n: 1 })
    for (const [id, n] of Object.entries(this.s.inventory)) if (n > 0 && isRelic(id)) out.push({ id, slot: null, n })
    return out.sort((a, b) => (!!b.slot - !!a.slot) || qualityRank(ITEMS[b.id].quality) - qualityRank(ITEMS[a.id].quality))
  },
  // Is this relic still there (in that slot, or in the bag)?
  hasRelic(id, slot = null) {
    if (!isRelic(id)) return false
    return slot ? this.s.equipment[slot] === id : this.qty(id) > 0
  },
  forgeHeat() { return this.s.relicForge.heat },
  canPayForge(cost) { return this.s.gold >= cost.gold && this.qty('stardust') >= cost.dust },
  payForge(cost) { this.s.gold -= cost.gold; this.removeItem('stardust', cost.dust) },
  // Put a new relic where the old one was
  swapRelic(oldId, newId, slot) {
    if (slot) this.s.equipment[slot] = newId
    else { this.removeItem(oldId, 1); this.addItem(newId, 1) }
  },
  relicFanfare(id) {
    const q = ITEMS[id].quality
    if (q === 'mythic') this.s.relicForge.forgedMythic++
    if (qualityRank(q) >= 2) this.log(ITEMS[id].icon, 'log.relicForged', { item: '@item:' + id })
    if (qualityRank(q) >= 3) this.emit('rare', { item: id, n: 1 })
  },

  /* ================= reforge ================= */
  reforgeCost(id) { return REFORGE_COST[ITEMS[id]?.quality] || null },
  reforgeChances(id, sealed = false) { return reforgeOdds(ITEMS[id].quality, this.forgeHeat(), sealed) },
  canReforge(id, slot = null, sealed = false) {
    const cost = this.reforgeCost(id)
    return !!cost && this.hasRelic(id, slot) && this.canPayForge(cost) && (!sealed || this.qty(SEAL_ITEM) > 0)
  },
  reforgeRelic(id, slot = null, sealed = false, rng = Math.random) {
    if (!this.canReforge(id, slot, sealed)) return null
    const it = ITEMS[id], from = it.quality
    const to = rollOdds(this.reforgeChances(id, sealed), rng)
    this.payForge(this.reforgeCost(id))
    if (sealed) this.removeItem(SEAL_ITEM, 1)
    const newId = relicId(it.relic, to)
    this.swapRelic(id, newId, slot)
    const st = this.s.relicForge
    st.reforged++
    const dir = qualityRank(to) > qualityRank(from) ? 'up' : to === from ? 'same' : 'down'
    // Bad luck stokes the forge; a better relic cools it
    if (dir === 'up') { st.heat = 0; st.ascended++ } else st.heat = Math.min(HEAT_MAX, st.heat + 1)
    if (dir === 'up') this.relicFanfare(newId)
    return { from: id, to: newId, dir, sealed }
  },

  /* ================= fuse ================= */
  fuseCost(quality) { return FUSE_COST[quality] || null },
  // Relics in the bag of one quality that fusing may use (locked ones are kept)
  fusePool(quality) {
    return RELIC_BASES.map(b => relicId(b, quality)).filter(id => this.qty(id) > 0 && !this.isLocked(id)).map(id => ({ id, n: this.qty(id) }))
  },
  fuseCount(quality) { return this.fusePool(quality).reduce((s, x) => s + x.n, 0) },
  // Which relics a fusion would take: from the kinds with the most copies first
  fusePick(quality) {
    const pool = this.fusePool(quality).sort((a, b) => b.n - a.n)
    const out = []
    for (const p of pool) for (let i = 0; i < p.n && out.length < FUSE_COUNT; i++) out.push(p.id)
    return out.length === FUSE_COUNT ? out : null
  },
  canFuse(quality, base) {
    const cost = this.fuseCost(quality)
    return !!cost && !!nextQuality(quality) && RELIC_BASES.includes(base) && !!this.fusePick(quality) && this.canPayForge(cost)
  },
  fuseRelics(quality, base) {
    if (!this.canFuse(quality, base)) return null
    const used = this.fusePick(quality)
    this.payForge(this.fuseCost(quality))
    used.forEach(id => this.removeItem(id, 1))
    const newId = relicId(base, nextQuality(quality))
    this.addItem(newId, 1)
    this.s.relicForge.fused++
    this.relicFanfare(newId)
    return { used, to: newId }
  },

  /* ================= reshape ================= */
  reshapeCost(id) { return RESHAPE_COST[ITEMS[id]?.quality] || null },
  canReshape(id, base) {
    const cost = this.reshapeCost(id)
    return !!cost && this.hasRelic(id) && RELIC_BASES.includes(base) && ITEMS[id].relic !== base && this.canPayForge(cost)
  },
  reshapeRelic(id, base) {
    if (!this.canReshape(id, base)) return null
    this.payForge(this.reshapeCost(id))
    const newId = relicId(base, ITEMS[id].quality)
    this.swapRelic(id, newId, null)
    this.s.relicForge.reshaped++
    return { from: id, to: newId }
  },
}

