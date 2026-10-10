/* =========================================================
   FARM — soil, plot events, hybrids, farm buildings and favourite seasons.
   The plots themselves (planting, growing, harvesting) live in engine.js and call into these.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { CROPS } from './data/items.js'
import { seasonOf } from './data/weather.js'
import {
  SOIL, SOIL_BY_LEVEL, BOUNTIFUL_CHANCE, PEST_CHANCE, SCARECROW_GUARD, SHOO_XP, HYBRIDS, HYBRID_CHANCE, hybridOf,
  BUILDINGS, FLOWERS, SEASON_BONUS, FAVOURITE_SEASON,
} from './data/farm.js'

const CROP_MAP = Object.fromEntries(CROPS.map(c => [c.id, c]))
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

export const farm = {
  ensureFarm() {
    const f = this.s.farm
    f.buildings ||= {}
    f.made ||= {}
    f.almanac ||= {}
    return f
  },
  building(id) { return this.s.farm.buildings?.[id] || 0 },

  /* ---------- soil ---------- */
  canFertilize(i, kind) {
    const p = this.s.farm.plots[i], s = SOIL[kind]
    return !!p && !!s && p.t > 0 && (p.soil || 0) < s.level && this.qty(kind) > 0
  },
  fertilize(i, kind) {
    if (!this.canFertilize(i, kind)) return false
    const p = this.s.farm.plots[i], s = SOIL[kind]
    this.removeItem(kind, 1)
    p.soil = s.level
    if (s.speed) p.t *= 1 - s.speed
    return true
  },

  /* ---------- events while growing ---------- */
  // Halfway through, a plot can turn bountiful or catch pests (once per planting)
  rollPlotEvent(p) {
    p.rolled = true
    const soil = SOIL_BY_LEVEL[p.soil] || null
    const r = Math.random()
    const bountiful = BOUNTIFUL_CHANCE + (soil?.bountiful || 0) + this.mod('loot') * 0.5
    const pests = PEST_CHANCE * Math.max(0, 1 - this.building('scarecrow') * SCARECROW_GUARD)
    if (r < bountiful) p.event = 'bountiful'
    else if (r < bountiful + pests) p.event = 'pests'
  },
  shoo(i) {
    const p = this.s.farm.plots[i]
    if (!p || p.event !== 'pests') return false
    p.event = null
    this.addXp('farming', SHOO_XP * Math.max(1, CROP_MAP[p.crop].lvl / 5))
    return true
  },

  /* ---------- seasons ---------- */
  inSeason(cropId, d = new Date()) { return FAVOURITE_SEASON[cropId] === seasonOf(d) },
  // How a harvest of a plot comes out: the base roll changed by soil, event and season
  plotYield(p, base) {
    let n = base + (SOIL_BY_LEVEL[p.soil]?.yield || 0)
    if (this.inSeason(p.crop)) n = Math.round(n * (1 + SEASON_BONUS))
    if (p.event === 'bountiful') n *= 2
    else if (p.event === 'pests') n = Math.max(1, Math.floor(n / 2))
    return n
  },

  /* ---------- hybrids ---------- */
  // Harvesting a plot can cross it with a growing neighbour
  tryCross(i) {
    const plots = this.s.farm.plots, p = plots[i]
    for (const j of [i - 1, i + 1]) {
      const q = plots[j]
      if (!q) continue
      const h = hybridOf(p.crop, q.crop)
      if (!h || Math.random() >= HYBRID_CHANCE * (1 + this.masteryLevel('farming', p.crop) / 100)) continue
      const n = rand(1, 2)
      this.addItem(h.id + '_seed', n)
      const f = this.ensureFarm()
      if (!f.almanac[h.id]) {
        f.almanac[h.id] = Date.now()
        this.log('sprout', 'log.hybrid', { crop: '@crop:' + h.id })
        this.emit('hybrid', { id: h.id })
      }
      return { id: h.id, n }
    }
    return null
  },
  hybridKnown(id) { return !!this.s.farm.almanac?.[id] },
  hybridsKnown() { return HYBRIDS.filter(h => this.hybridKnown(h.id)).length },

  /* ---------- buildings ---------- */
  buildCost(id) { const b = BUILDINGS[id], l = this.building(id); return l < b.max ? b.cost(l) : null },
  canBuildFarm(id) { const c = this.buildCost(id); return !!c && this.canAffordCost(c) },
  buildFarm(id) {
    if (!this.canBuildFarm(id)) return false
    const f = this.ensureFarm()
    this.payCost(this.buildCost(id))
    // A producing building starts its first batch now (and keeps what was waiting)
    if (BUILDINGS[id].every && !f.buildings[id]) f.made[id] = Date.now()
    f.buildings[id] = (f.buildings[id] || 0) + 1
    return true
  },
  // Batches waiting in a producing building, up to what it can store
  farmReady(id, now = Date.now()) {
    const b = BUILDINGS[id], l = this.building(id)
    if (!b.every || !l) return 0
    const since = now - (this.s.farm.made?.[id] || now)
    return Math.min(b.store * l, Math.floor((since * l) / b.every))
  },
  farmNext(id, now = Date.now()) {
    const b = BUILDINGS[id], l = this.building(id)
    if (!b.every || !l) return 0
    const step = b.every / l
    return step - ((now - (this.s.farm.made?.[id] || now)) % step)
  },
  collectFarm(id, now = Date.now()) {
    const n = this.farmReady(id, now)
    if (!n) return null
    const b = BUILDINGS[id], f = this.ensureFarm()
    const got = {}
    for (let k = 0; k < n; k++) {
      for (const [item, [a, z]] of Object.entries(b.makes)) got[item] = (got[item] || 0) + rand(a, z)
      // Busy bees: flowers growing on the farm add a honey to each batch
      if (id === 'hive' && this.s.farm.plots.some(p => p && FLOWERS.includes(p.crop))) got.honey += 1
    }
    Object.entries(got).forEach(([k, q]) => this.addItem(k, q))
    // Keep the time already spent on the next batch, unless the store was full
    const step = b.every / this.building(id)
    const full = n >= b.store * this.building(id)
    f.made[id] = full ? now : (f.made[id] || now) + n * step
    this.addXp('farming', n * 20 * this.building(id))
    return got
  },
  farmBuildingsReady() { return ['coop', 'hive'].reduce((s, id) => s + (this.farmReady(id) ? 1 : 0), 0) },
  wellSpeed() { return this.building('well') * BUILDINGS.well.speed },
}
