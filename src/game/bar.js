/* =========================================================
   BAR — patrons and special guests at the tavern, and the hero's own brews.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { ITEMS, BREWS } from './data/items.js'
import { ACTIONS } from './data/actions.js'
import { DRINKS, DRINK_DURATION } from './data/tavern.js'
import { rollName } from './data/journal.js'
import { PATRON_STAY, maxPatrons, patronEvery, PAY_MULT, repMult, GUEST_CHANCE, GUESTS, GUEST_MAP } from './data/bar.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

export const bar = {
  // What patrons may ask for: cooked food and brews the hero can already make (or nearly)
  barMenu() {
    const lvl = this.level('cooking')
    return (ACTIONS.cooking || []).filter(a => a.lvl <= lvl + 5).map(a => Object.keys(a.out)[0]).filter(id => ITEMS[id] && ITEMS[id].type !== 'junk')
  },
  // Patrons come and go with the clock, so the bar fills up while the hero is away too
  ensurePatrons(now = Date.now()) {
    const t = this.s.tavern
    if (!Array.isArray(t.patrons)) t.patrons = []
    if (!t.rep) t.rep = 0
    // Only touch the state when something changed: the screens call this while rendering
    if (t.patrons.some(p => p.until <= now)) t.patrons = t.patrons.filter(p => p.until > now)
    const every = patronEvery(t.level), max = maxPatrons(t.level)
    if (!t.patronAt) t.patronAt = now - every
    if (now - t.patronAt > every * max) t.patronAt = now - every * max
    while (t.patronAt + every <= now) {
      t.patronAt += every
      if (t.patrons.length < max) {
        const p = this.makePatron(t.patronAt)
        if (p && p.until > now) t.patrons.push(p)
      }
    }
    return t.patrons
  },
  makePatron(at = Date.now()) {
    const menu = this.barMenu()
    if (!menu.length) return null
    const level = this.s.tavern.level
    const guest = Math.random() < GUEST_CHANCE ? GUESTS[Math.floor(Math.random() * GUESTS.length)] : null
    const item = menu[Math.floor(Math.random() * menu.length)]
    const qty = rand(2, 3 + level) * (guest ? 2 : 1)
    return {
      id: `${at}-${Math.floor(Math.random() * 1e6)}`, at, until: at + PATRON_STAY,
      name: guest ? null : rollName(Math.random, Math.random() < 0.5 ? 'he' : 'she'), guest: guest?.id || null,
      item, qty, tip: rand(10, 30) / 100,
    }
  },
  patronPay(p) {
    const base = ITEMS[p.item].value * p.qty * PAY_MULT * repMult(this.s.tavern.rep || 0) * (p.guest ? 1.5 : 1)
    return Math.max(5, Math.round(base * (1 + p.tip)))
  },
  canServe(p) { return this.qty(p.item) >= p.qty },
  serve(id) {
    const t = this.s.tavern
    const i = t.patrons.findIndex(p => p.id === id)
    const p = t.patrons[i]
    if (!p || !this.canServe(p)) return null
    this.removeItem(p.item, p.qty)
    const gold = this.addGold(this.patronPay(p))
    t.patrons.splice(i, 1)
    t.rep = (t.rep || 0) + (p.guest ? 4 : 1)
    this.s.stats.patrons = (this.s.stats.patrons || 0) + 1
    const reward = p.guest ? GUEST_MAP[p.guest].reward : null
    if (reward) {
      this.s.stats.guests = (this.s.stats.guests || 0) + 1
      Object.entries(reward).forEach(([k, n]) => this.addItem(k, n))
      this.log(GUEST_MAP[p.guest].icon, 'log.guest', { guest: '@guest:' + p.guest })
    }
    return { gold, reward }
  },
  // Bar staff serve whoever they can by themselves
  serveAll() {
    let n = 0, gold = 0
    for (const p of [...this.ensurePatrons()]) { const r = this.serve(p.id); if (r) { n++; gold += r.gold } }
    return { n, gold }
  },
  patronsReady() { return (this.s.tavern.patrons || []).filter(p => p.until > Date.now() && this.canServe(p)).length },

  /* ---------- the hero's own brews ---------- */
  brewFor(drinkId) { return BREWS.find(b => b.drink === drinkId) || null },
  drinkOwn(drinkId) {
    const b = this.brewFor(drinkId)
    if (!b || this.qty(b.id) <= 0 || !DRINKS.some(d => d.id === drinkId)) return false
    this.removeItem(b.id, 1)
    this.s.tavern.drink = { id: drinkId, t: DRINK_DURATION }
    return true
  },
}
