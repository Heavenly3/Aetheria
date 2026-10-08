/* =========================================================
   OMENS — rare world phenomena that arrive unannounced.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { ITEMS } from './data/items.js'
import { PET_MAP } from './data/pets.js'
import {
  OMEN_MAP, OMEN_CHANCE_PER_MIN, SIGN_TIME, OFFERING_COST, OFFERING_CHANCE_PER_MIN, rollOmen, omenMonster,
  rollRelic, WISHES, WISH_LIMIT, rollBoon, BOONS, CARAVAN_POOL, RARITIES,
} from './data/omens.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const msg = (key, params = {}) => ({ key, params })

// The creatures of an omen follow the hero's combat level; cached per level
let creatureCache = { key: '', m: null }

export const omensState = () => ({
  // seen: omens witnessed · kills: omen creatures defeated · wishes: comet gifts kept forever
  // boon: the blessing rolled when an omen ends · offering: stardust offered to call the next omen
  omens: { seen: {}, kills: {}, wishes: {}, boon: null, offering: false, relics: {} },
})

export const omens = {
  /* ================= the active omen ================= */
  // s.event: { id, phase: 'sign' | 'active', t, total, part, offers, done }
  activeOmen() { const e = this.s.event; return e && e.phase === 'active' ? OMEN_MAP[e.id] || null : null },
  omenSign() { const e = this.s.event; return e && e.phase === 'sign' ? OMEN_MAP[e.id]?.rarity || 'common' : null },
  // The cryptic line of the omen on its way (each omen has its own sign)
  omenSignHint() { const e = this.s.event; return e && e.phase === 'sign' && OMEN_MAP[e.id] ? `omens.hints.${e.id}` : null },
  // Kept for the parts of the interface that only need "is something going on"
  currentEvent() { return this.activeOmen() },

  maybeEvent() {
    if (this.s.event) return
    const offering = !!this.s.omens.offering
    if (Math.random() >= (offering ? OFFERING_CHANCE_PER_MIN : OMEN_CHANCE_PER_MIN)) return
    this.s.omens.offering = false
    this.beginSign(rollOmen(Math.random, offering).id)
  },
  beginSign(id) {
    const o = OMEN_MAP[id]
    this.s.event = { id, phase: 'sign', t: SIGN_TIME }
    this.log('crystal-ball', `omens.hints.${id}`)
    this.emit('omenSign', { rarity: o.rarity, msg: msg(`omens.hints.${id}`) })
  },
  startEvent(id) {
    const o = OMEN_MAP[id]
    if (!o) return
    const seen = this.s.omens.seen
    seen[id] = (seen[id] || 0) + 1
    if (o.instant) { this.s.event = null; return this.lostChest(o) }
    const e = { id, phase: 'active', t: o.duration, total: o.duration, part: false }
    if (o.caravan) e.offers = this.caravanOffers()
    this.s.event = e
    this.log(o.icon, 'log.omen', { omen: '@event:' + id })
    this.emit('event', { ev: o, msg: msg(o.hunt ? 'events.hunt' : 'events.started', { event: '@event:' + id }) })
    this.emit('notify', msg('notify.event', { event: '@event:' + id }))
  },
  lostChest(o) {
    const gold = this.addGold(rand(120, 450) * (1 + this.combatLevel() / 25), true)
    const dust = rand(15, 40)
    this.addItem('stardust', dust)
    const relic = Math.random() < 0.05 ? this.gainRelic() : null
    this.log(o.icon, 'log.chestOmen', { gold, dust })
    this.emit('event', { ev: o, msg: msg(relic ? 'events.chestRelic' : 'events.chestFound', { gold, dust, relic: relic ? '@item:' + relic : '' }) })
  },
  endOmen() {
    const e = this.s.event, o = e && OMEN_MAP[e.id]
    this.s.event = null
    if (!o) return
    if (this.s.activity?.type === 'combat' && this.s.activity.kind === 'omen') this.stop(msg('omens.closed'))
    if (o.hunt === 'gilded_goblin' && !e.done) this.log(o.icon, 'log.goblinEscaped')
    if (!e.part) return
    if (o.gift) this.eyeGift()
    const b = rollBoon()
    this.s.omens.boon = { id: b.id, t: b.duration }
    this.log('sparkles', 'log.boon', { boon: '@boon:' + b.id })
    this.emit('boon', b)
  },
  updateOmens(dt) {
    const e = this.s.event
    if (e) {
      e.t -= dt
      if (e.t <= 0) e.phase === 'sign' ? this.startEvent(e.id) : this.endOmen()
    }
    const b = this.s.omens.boon
    if (b) { b.t -= dt; if (b.t <= 0) this.s.omens.boon = null }
  },

  /* ================= effects ================= */
  omenMods(key) {
    let v = this.activeOmen()?.mods[key] || 0
    const b = this.s.omens.boon
    if (b) v += BOONS.find(x => x.id === b.id)?.mods[key] || 0
    for (const id in this.s.omens.wishes) v += (WISHES.find(w => w.id === id)?.mods[key] || 0) * this.s.omens.wishes[id]
    return v
  },
  omenMonsterMult() { return this.activeOmen()?.monsterMult || 1 },
  omenRareMult() { return this.activeOmen()?.rareMult || 1 },

  // Called on every completed action and every kill while an omen is on
  omenAction(time = 3) {
    const o = this.activeOmen()
    if (!o) return
    this.s.event.part = true
    const scale = time / 3
    if (o.stardust && Math.random() < o.stardust.action * scale) this.addItem('stardust', rand(...o.stardust.qty))
    if (o.jackpot && Math.random() < o.jackpot * scale) this.jackpot()
    if (o.wishes && Math.random() < o.wishes.action * scale) this.grantWish()
    if (o.pet && o.id !== 'blood_moon') this.rollPet(src => src.omen === o.id, scale)
  },
  omenKill(m) {
    const o = this.activeOmen()
    if (!o) return
    this.s.event.part = true
    if (m.omen) return this.omenCreatureKilled(o, m)
    if (o.stardust && Math.random() < o.stardust.kill) this.addItem('stardust', rand(...o.stardust.qty))
    if (o.jackpot && Math.random() < o.jackpot * 2) this.jackpot()
    if (o.wishes && Math.random() < o.wishes.kill) this.grantWish()
    if (o.pet) this.rollPet(src => src.omen === o.id)
  },
  jackpot() {
    const gold = this.addGold((30 + this.combatLevel() * 40) * rand(8, 12), true)
    this.emit('toast', { icon: 'gold-nuggets', msg: msg('omens.jackpot', { gold }), kind: 'success' })
  },
  grantWish() {
    const w = this.s.omens.wishes
    if (Object.values(w).reduce((a, b) => a + b, 0) >= WISH_LIMIT) return
    const wish = WISHES[Math.floor(Math.random() * WISHES.length)]
    w[wish.id] = (w[wish.id] || 0) + 1
    this.log('burning-meteor', 'log.wish', { wish: '@wish:' + wish.id })
    this.emit('wish', wish)
  },
  omensSeen() { return Object.values(this.s.omens.seen).reduce((a, b) => a + b, 0) },
  omensSeenKinds() { return Object.keys(this.s.omens.seen).filter(id => OMEN_MAP[id]).length },
  omenKinds() { return Object.keys(OMEN_MAP).length },
  wishCount() { return Object.values(this.s.omens.wishes).reduce((a, b) => a + b, 0) },
  gainRelic(minQuality = 'common') {
    const id = rollRelic(Math.random, minQuality)
    this.addItem(id, 1)
    const q = ITEMS[id].quality
    this.s.omens.relics[q] = (this.s.omens.relics[q] || 0) + 1
    this.log(ITEMS[id].icon, 'log.relic', { item: '@item:' + id })
    if (RARITIES.indexOf(q) >= 2) this.emit('rare', { item: id, n: 1 })
    return id
  },
  eyeGift() {
    if (!this.hasPet('wandering_eye')) return this.awardPet(PET_MAP.wandering_eye)
    this.gainRelic('mythic')
  },

  /* ================= creatures of the omens ================= */
  omenCreature(id) {
    const cl = this.combatLevel()
    const key = id + '|' + cl + '|' + this.s.difficulty
    if (creatureCache.key !== key) creatureCache = { key, m: this.scaleMonster(omenMonster(id, cl)) }
    return creatureCache.m
  },
  canHunt() { const o = this.activeOmen(); return !!o?.hunt && !this.s.event.done },
  omenCreatureKilled(o, m) {
    const k = this.s.omens.kills
    k[m.id] = (k[m.id] || 0) + 1
    if (m.relic && Math.random() < m.relic) this.gainRelic()
    this.rollPet(src => src.omen === o.id)
    if (m.id === 'gilded_goblin') {
      this.s.event.done = true
      this.log(o.icon, 'log.goblinCaught')
      this.endOmen()
    }
  },

  /* ================= the Veiled Caravan ================= */
  caravanOffers() {
    const pool = [...CARAVAN_POOL]
    return Array.from({ length: 3 }, () => ({ ...pool.splice(Math.floor(Math.random() * pool.length), 1)[0], sold: false }))
  },
  canBuyCaravan(offer) {
    if (!offer || offer.sold || this.activeOmen()?.id !== 'merchant') return false
    return offer.gold ? this.s.gold >= offer.gold : this.qty('stardust') >= offer.stardust
  },
  buyCaravan(i) {
    const offer = this.s.event?.offers?.[i]
    if (!this.canBuyCaravan(offer)) return null
    if (offer.gold) this.s.gold -= offer.gold
    else this.removeItem('stardust', offer.stardust)
    offer.sold = true
    if (offer.relic) return this.gainRelic()
    this.addItem(offer.item, offer.qty)
    return offer.item
  },

  /* ================= offering to the stars ================= */
  canOffer() { return !this.s.event && !this.s.omens.offering && this.qty('stardust') >= OFFERING_COST },
  makeOffering() {
    if (!this.canOffer()) return false
    this.removeItem('stardust', OFFERING_COST)
    this.s.omens.offering = true
    this.log('crystal-ball', 'log.offering')
    return true
  },
}
