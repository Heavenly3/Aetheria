/* =========================================================
   CHURCH — the Order of the Dawn's favour, daily offerings, holy water
   and the graceful outfit bought with marks of grace.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { FAVOUR_LEVELS, favourLevel, OFFERINGS, offeringQty, OFFERING_XP } from './data/church.js'
import { GRACEFUL } from './data/extras.js'
import { seeded, dayKey } from './systems.js'

export const churchState = () => ({
  // favour: favour with the Order · day / offering / given: today's offering and whether it was made
  church: { favour: 0, day: '', offering: null, given: false },
})

export const church = {
  ensureChurch() {
    const c = (this.s.church ||= churchState().church)
    const today = dayKey()
    if (c.day !== today) {
      // One offering a day, the same all day; it never asks for what the hero cannot make yet
      const rng = seeded('offering' + today + this.s.created)
      const o = OFFERINGS[Math.floor(rng() * OFFERINGS.length)]
      Object.assign(c, { day: today, offering: { item: o.item, qty: offeringQty(o, this.heroLevel()), favour: o.favour }, given: false })
    }
    return c
  },
  favourLevel() { return favourLevel(this.s.church?.favour || 0) },
  favourPerk(key) { return FAVOUR_LEVELS[this.favourLevel()][key] || 0 },
  nextFavour() { const l = this.favourLevel(); return l < FAVOUR_LEVELS.length - 1 ? FAVOUR_LEVELS[l + 1] : null },
  canGiveOffering() { const c = this.ensureChurch(); return !c.given && this.qty(c.offering.item) >= c.offering.qty },
  giveOffering() {
    const c = this.ensureChurch()
    if (!this.canGiveOffering()) return null
    const before = this.favourLevel()
    this.removeItem(c.offering.item, c.offering.qty)
    c.given = true
    c.favour += c.offering.favour
    this.addXp('prayer', c.offering.favour * OFFERING_XP)
    const after = this.favourLevel()
    if (after > before) {
      this.log('holy-symbol', 'log.favour', { n: after })
      this.emit('favour', { level: after })
    }
    return { favour: c.offering.favour, level: after }
  },
  // Blessing cost with the Order's discount
  blessingCost(b) { return Math.round(b.cost * (1 - this.favourPerk('discount'))) },
  // Holy water renews every active blessing to its full length
  canConsecrate() { return this.qty('holy_water') > 0 && this.activeBlessings() > 0 },
  consecrate() {
    if (!this.canConsecrate()) return false
    this.removeItem('holy_water', 1)
    const full = this.blessingDuration()
    for (const id in this.s.blessings) if (this.s.blessings[id] > 0) this.s.blessings[id] = full
    return true
  },

  /* ---------- the graceful outfit (Agility) ---------- */
  canBuyGraceful(g) { return this.level('agility') >= g.lvl && this.qty('mark_of_grace') >= g.cost },
  buyGraceful(id) {
    const g = GRACEFUL.find(x => x.id === id)
    if (!g || !this.canBuyGraceful(g)) return false
    this.removeItem('mark_of_grace', g.cost)
    this.addItem(g.id, 1)
    return true
  },
}
