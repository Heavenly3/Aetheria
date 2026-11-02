/* =========================================================
   COMPANY — the companions the hero hires: who they are, who goes along, and what they do in a
   boss fight or a dungeon. Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { MERC_ROLES, PARTY_SLOTS, MERC_SPEED, HURT_TIME, MERC_MAX_LVL, hireCost, wageOf, mercXpNeed, mercPower } from './data/company.js'
import { MECHS } from './data/fighting.js'
import { monsterLevel } from './data/combat.js'
import { rollName } from './data/journal.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
// Statuses a cleric lifts
const CLEANSED = ['bleed', 'poison', 'burn']

// members: everyone hired, one of each trade · party: the ones who go along
export const companyState = () => ({ company: { members: [], party: [] } })

export const company = {
  companyMember(id) { return this.s.company?.members.find(m => m.id === id) || null },
  mercHurt(mem) { return (mem?.hurtUntil || 0) > Date.now() },
  mercHireCost() { return hireCost(this.combatLevel()) },
  hireMerc(role) {
    const c = this.s.company
    if (!MERC_ROLES[role] || c.members.some(m => m.role === role)) return null
    const cost = this.mercHireCost()
    if (this.s.gold < cost) { this.toast('two-coins', 'company.noGold', { n: cost }, 'warn'); return null }
    this.s.gold -= cost
    const she = Math.random() < 0.5
    let name
    do name = rollName(Math.random, she ? 'she' : 'he')
    while (c.members.some(m => m.name === name))
    const mem = { id: role, role, name, she, lvl: 1, xp: 0, hurtUntil: 0 }
    c.members.push(mem)
    if (c.party.length < PARTY_SLOTS) c.party.push(mem.id)
    this.emit('hired', mem)
    return mem
  },
  dismissMerc(id) {
    const c = this.s.company
    c.members = c.members.filter(m => m.id !== id)
    c.party = c.party.filter(p => p !== id)
  },
  // In or out of the party; false when the party is full
  toggleParty(id) {
    const c = this.s.company
    if (c.party.includes(id)) { c.party = c.party.filter(p => p !== id); return true }
    if (!this.companyMember(id) || c.party.length >= PARTY_SLOTS) return false
    c.party.push(id)
    return true
  },
  // Who would come along now: in the party and not hurt
  partyReady() { return this.s.company.party.map(id => this.companyMember(id)).filter(m => m && !this.mercHurt(m)) },
  partyWages() { return this.partyReady().reduce((s, m) => s + wageOf(m.lvl), 0) },
  // At the start of a boss fight or a dungeon: the party comes along if the wages can be paid
  bringParty(act) {
    const ready = this.partyReady()
    if (!ready.length) return
    const cost = ready.reduce((s, m) => s + wageOf(m.lvl), 0)
    if (this.s.gold < cost) { this.toast('two-coins', 'company.cantPay', { n: cost }, 'warn'); return }
    this.s.gold -= cost
    act.party = ready.map(m => m.id)
  },
  partyOf(act) { return (act?.party || []).map(id => this.companyMember(id)).filter(Boolean) },
  // The share of the enemy's blows that falls on the hero rather than on the party
  heroDrawShare(act) {
    const others = this.partyOf(act).reduce((s, m) => s + MERC_ROLES[m.role].draw, 0)
    return 1 / (1 + others)
  },
  // A squire steps in front of a charged strike and takes part of it
  partyGuard(act) { return this.partyOf(act).reduce((v, m) => Math.max(v, MERC_ROLES[m.role].guard || 0), 0) },
  // The party's turn: blows, healing, cutting off moves, lifting statuses; 'kill' if the enemy fell to them
  companyTick(act, m, dt, ps) {
    const party = this.partyOf(act)
    if (!party.length) return null
    const hl = this.combatLevel()
    // An archer looses at a creature's move as soon as it starts
    const c = act.mech?.charge
    if (c && MECHS[c.id].cut && !c.archer) {
      c.archer = true
      const archer = party.find(p => MERC_ROLES[p.role].interrupt)
      if (archer && Math.random() < MERC_ROLES[archer.role].interrupt) {
        this.note(act, 'mercInterrupt', { name: archer.name })
        this.interruptMove(act)
      }
    }
    // A cleric lifts a bleed, poison or burn every so often
    const cleric = party.find(p => MERC_ROLES[p.role].cleanse)
    if (cleric) {
      act.cleanseT = (act.cleanseT || 0) + dt
      const fx = act.fx?.player || {}
      const id = CLEANSED.find(k => fx[k])
      if (id && act.cleanseT >= MERC_ROLES[cleric.role].cleanse) {
        act.cleanseT = 0
        delete fx[id]
        this.note(act, 'mercCleanse', { name: cleric.name, status: id })
      }
    }
    act.mercTimer = (act.mercTimer || 0) + dt
    if (act.mercTimer < MERC_SPEED) return null
    act.mercTimer -= MERC_SPEED
    let total = 0, breaking = 0
    for (const p of party) {
      const r = MERC_ROLES[p.role], pow = mercPower(p.lvl, hl)
      if (r.heal && this.s.hp < this.maxHp()) this.heal(Math.max(1, Math.round(this.maxHp() * r.heal * pow)))
      if (Math.random() >= 0.8) continue
      const dmg = rand(1, Math.max(1, Math.round(ps.maxHit * r.dmg * pow)))
      total += dmg
      breaking += dmg * (r.breaker || 1)
    }
    const dealt = Math.min(total, act.mHp)
    act.mHp -= dealt
    this.track(act, 'dealt', dealt)
    if (act.mech?.charge) act.mech.charge.dealt += breaking
    this.emit('hit', { who: 'merc', dmg: total })
    return act.mHp <= 0 ? 'kill' : null
  },
  // Every creature that falls with them along teaches them something
  companyKill(m, act) {
    const xp = monsterLevel(m)
    for (const p of this.partyOf(act)) {
      if (p.lvl >= MERC_MAX_LVL) continue
      p.xp += xp
      while (p.lvl < MERC_MAX_LVL && p.xp >= mercXpNeed(p.lvl)) {
        p.xp -= mercXpNeed(p.lvl)
        p.lvl++
        this.note(act, 'mercLevel', { name: p.name, lvl: p.lvl })
      }
    }
  },
  // When the hero falls, the party is hurt for a while
  companyFell(act) {
    for (const p of this.partyOf(act)) p.hurtUntil = Date.now() + HURT_TIME
  },
}
