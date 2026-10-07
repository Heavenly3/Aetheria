/* =========================================================
   COMPANIONS — hatching, feeding and raising pets.
   Mixed into G (engine.js); `this` is the engine.
   Hunger, hatching and gifts follow the clock (timestamps), so they keep going while the game is closed.
   ========================================================= */
import { ITEMS } from './data/items.js'
import { PET_MAP } from './data/pets.js'
import {
  MAX_LEVEL, xpToNext, growth, FULL_MAX, START_FULL, HUNGER_MS, SKILL_SHARE, HATCH_MS, PAT_COOLDOWN, PAT_BOND,
  BOND_MAX, BOND_TIME, BASKET_MAX, NICK_MAX, GIFTS_AT, CURIOUS_AT, companionBoost, restMult, giftEveryMs, feedValue, rollGift, bondTier,
} from './data/companions.js'

export const companionsState = () => ({
  // active: the companion's pet id · care: per pet { lvl, xp, bond, full, at, patAt, nick, time }
  // eggs: [{ pet, at }] waiting to hatch · basket: gifts waiting to be collected · giftAt: when the next one arrives
  companions: { active: null, care: {}, eggs: [], basket: [], giftAt: 0 },
})

const freshCare = now => ({ lvl: 1, xp: 0, bond: 0, full: START_FULL, at: now, patAt: 0, nick: '', time: 0 })
const NO_CARE = Object.freeze(freshCare(0))

export const companions = {
  /* ================= care records ================= */
  careOf(id) { return this.s.companions.care[id] || NO_CARE },
  ensureCare(id) { return (this.s.companions.care[id] ||= freshCare(Date.now())) },
  // Pets owned before raising existed get a care record on load
  syncCare() {
    const c = this.s.companions
    if (!Array.isArray(c.eggs)) c.eggs = []
    if (!Array.isArray(c.basket)) c.basket = []
    for (const id in this.s.pets) if (PET_MAP[id]) this.ensureCare(id)
    if (c.active && !this.hasPet(c.active)) c.active = null
  },
  petName(id) { return this.careOf(id).nick || PET_MAP[id]?.name || id },
  companion() { const id = this.s.companions.active; return id && this.hasPet(id) ? PET_MAP[id] : null },
  isCompanion(id) { return this.s.companions.active === id },

  /* ================= hunger ================= */
  // Only the companion gets hungry; resting pets keep whatever they had
  fullness(id, now = Date.now()) {
    const c = this.careOf(id)
    if (!this.isCompanion(id)) return c.full
    return Math.max(0, c.full - ((now - c.at) / HUNGER_MS) * FULL_MAX)
  },
  isFed(id, now) { return this.fullness(id, now) > 0 },
  // Fix the current fullness into the record (before anything that changes it)
  settleFull(id, now = Date.now()) {
    const c = this.ensureCare(id)
    c.full = this.fullness(id, now)
    c.at = now
    return c
  },
  hungerState(id) {
    const f = this.fullness(id)
    return f <= 0 ? 'starving' : f < 25 ? 'hungry' : f < 70 ? 'content' : 'full'
  },

  /* ================= the companion ================= */
  setCompanion(id) {
    const c = this.s.companions
    if (id && !this.hasPet(id)) return false
    const now = Date.now()
    if (c.active) this.settleFull(c.active, now)
    c.active = id || null
    if (id) { this.settleFull(id, now); c.giftAt = now + giftEveryMs(this.careOf(id).bond) }
    this.emit('activity')
    return true
  },
  // How much of its bonus a pet gives right now
  petPower(id, now) {
    const c = this.careOf(id)
    const base = growth(c.lvl)
    if (this.isCompanion(id)) return base * (this.isFed(id, now) ? companionBoost(c.bond) : 1)
    return base * restMult(c.bond)
  },

  /* ================= feeding and petting ================= */
  foodsFor(id) {
    return Object.keys(this.s.inventory).filter(it => this.qty(it) > 0 && feedValue(id, it))
      .sort((a, b) => feedValue(id, b).fav - feedValue(id, a).fav || ITEMS[a].value - ITEMS[b].value)
  },
  canFeed(id) { return this.hasPet(id) && this.fullness(id) < FULL_MAX - 1 },
  feedPet(id, itemId) {
    const v = feedValue(id, itemId)
    if (!v || !this.canFeed(id) || this.qty(itemId) < 1) return null
    this.removeItem(itemId, 1)
    const now = Date.now()
    const c = this.settleFull(id, now)
    const wasStarving = c.full <= 0
    c.full = Math.min(FULL_MAX, c.full + v.full)
    this.addBond(id, v.bond)
    this.addPetXp(id, v.xp)
    // A companion that went hungry starts its gift timer again once fed
    if (this.isCompanion(id) && (wasStarving || this.s.companions.giftAt < now)) this.s.companions.giftAt = now + giftEveryMs(c.bond)
    return v
  },
  patReady(id, now = Date.now()) { return now - this.careOf(id).patAt >= PAT_COOLDOWN },
  patPet(id) {
    if (!this.hasPet(id) || !this.patReady(id)) return false
    this.ensureCare(id).patAt = Date.now()
    this.addBond(id, PAT_BOND)
    return true
  },
  renamePet(id, name) {
    if (!this.hasPet(id)) return false
    this.ensureCare(id).nick = String(name || '').replace(/\s+/g, ' ').trim().slice(0, NICK_MAX)
    return true
  },

  /* ================= growth ================= */
  addBond(id, n) {
    const c = this.ensureCare(id)
    const before = bondTier(c.bond)
    c.bond = Math.min(BOND_MAX, c.bond + n)
    const after = bondTier(c.bond)
    if (after.id !== before.id) {
      this.log(PET_MAP[id].icon, 'log.petBond', { pet: '@pet:' + id, tier: '@bond:' + after.id })
      this.emit('petBond', { pet: PET_MAP[id], tier: after.id })
    }
  },
  addPetXp(id, n) {
    const c = this.ensureCare(id)
    if (c.lvl >= MAX_LEVEL) return
    c.xp += n * (c.bond >= CURIOUS_AT ? 1.1 : 1)
    while (c.lvl < MAX_LEVEL && c.xp >= xpToNext(c.lvl)) {
      c.xp -= xpToNext(c.lvl)
      c.lvl++
      this.log(PET_MAP[id].icon, 'log.petLevel', { pet: '@pet:' + id, level: c.lvl })
      this.emit('petLevel', { pet: PET_MAP[id], level: c.lvl })
    }
    if (c.lvl >= MAX_LEVEL) c.xp = 0
  },
  maxPetLevel() { return Math.max(0, ...Object.values(this.s.companions.care).map(c => c.lvl)) },
  maxPetBond() { return Math.max(0, ...Object.values(this.s.companions.care).map(c => c.bond)) },
  // Called from addXp: the fed companion learns alongside you
  companionXp(gained) {
    const id = this.s.companions.active
    if (id && this.hasPet(id) && this.isFed(id)) this.addPetXp(id, gained * SKILL_SHARE)
  },

  /* ================= eggs ================= */
  hasEgg(id) { return this.s.companions.eggs.some(e => e.pet === id) },
  layEgg(p) {
    this.s.companions.eggs.push({ pet: p.id, at: Date.now() })
    this.log('cosmic-egg', 'log.petEgg', {})
    this.emit('petEgg', p)
  },
  eggProgress(e, now = Date.now()) { return Math.min(1, (now - e.at) / HATCH_MS) },
  eggReady(e, now) { return this.eggProgress(e, now) >= 1 },
  hatchEgg(i) {
    const eggs = this.s.companions.eggs, e = eggs[i]
    if (!e || !this.eggReady(e)) return null
    eggs.splice(i, 1)
    const p = PET_MAP[e.pet]
    if (!p || this.hasPet(p.id)) return null
    this.awardPet(p)
    return p
  },
  readyEggs() { const now = Date.now(); return this.s.companions.eggs.filter(e => this.eggReady(e, now)).length },

  /* ================= gifts ================= */
  // Fill the basket for the time the companion spent fed and bonded enough to bring things
  processGifts(now = Date.now()) {
    const c = this.s.companions, id = c.active
    if (!id || !this.hasPet(id)) return
    const care = this.careOf(id)
    const every = giftEveryMs(care.bond)
    if (care.bond < GIFTS_AT || c.basket.length >= BASKET_MAX) { if (c.giftAt < now) c.giftAt = now + every; return }
    const starveAt = care.at + (care.full / FULL_MAX) * HUNGER_MS
    const until = Math.min(now, starveAt)
    while (c.giftAt <= until && c.basket.length < BASKET_MAX) {
      const g = rollGift(id, care.lvl, care.bond)
      if (!g) break
      c.basket.push({ ...g, pet: id })
      c.giftAt += every
    }
    if (c.giftAt < now && (c.basket.length >= BASKET_MAX || starveAt <= now)) c.giftAt = now + every
  },
  collectGifts() {
    const c = this.s.companions
    if (!c.basket.length) return []
    const got = c.basket.splice(0)
    got.forEach(g => this.addItem(g.item, g.n))
    if (c.active && c.giftAt < Date.now()) c.giftAt = Date.now() + giftEveryMs(this.careOf(c.active).bond)
    return got
  },

  // Per-tick work: bond from time spent together, and the gift basket every few seconds
  updateCompanion(dt) {
    const id = this.s.companions.active
    if (!id || !this.hasPet(id)) return
    if (this.isFed(id)) {
      const care = this.ensureCare(id)
      care.time += dt
      if (care.time >= BOND_TIME) { care.time -= BOND_TIME; this.addBond(id, 1) }
    }
    giftTimer += dt
    if (giftTimer >= 5) { giftTimer = 0; this.processGifts() }
  },
}

let giftTimer = 5
