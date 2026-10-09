/* =========================================================
   SLAYER — hunting tasks, Superior creatures and slayer perks.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { MONSTERS, AREAS, SLAYER_SHOP, monsterLevel } from './data/combat.js'
import {
  TASK_KINDS, TASK_KIND_IDS, SUPERIOR_CHANCE, SIGILS, REROLL_COST, BLOCK_COST, BLOCK_MAX, STREAK_CHEST_EVERY, PERK_MAP, TASK_HELMS,
} from './data/slayer.js'

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

export const slayer = {
  ensureSlayer() {
    const sl = this.s.slayer
    sl.perks ||= {}
    if (!Array.isArray(sl.blocked)) sl.blocked = []
    if (!Array.isArray(sl.offers)) sl.offers = []
    return sl
  },
  slayerPerk(id) { return !!this.s.slayer.perks?.[id] },
  // Creatures the hero can be sent after, weakest first; blocked ones are left out
  slayerCandidates() {
    const cl = this.combatLevel(), sl = this.level('slayer'), blocked = this.s.slayer.blocked || []
    return Object.values(MONSTERS).filter(m => {
      const area = AREAS.find(a => a.id === m.area)
      return this.areaUnlocked(area) && monsterLevel(m) <= cl + 8 && (!m.slayer || sl >= m.slayer) && !blocked.includes(m.id)
    }).sort((a, b) => monsterLevel(a) - monsterLevel(b))
  },
  makeOffer(kind, pool = this.slayerCandidates()) {
    if (!pool.length) return null
    const k = TASK_KINDS[kind]
    const from = Math.floor(k.pick[0] * (pool.length - 1)), to = Math.max(from, Math.ceil(k.pick[1] * (pool.length - 1)))
    const m = pool[rand(from, to)]
    const size = Math.round((rand(...k.size) + Math.floor(this.level('slayer') / 5)) * (this.slayerPerk('extend') ? 1.5 : 1))
    return { kind, monster: m.id, total: size }
  },
  // Three tasks to choose from; they stay until one is taken or new ones are asked for
  slayerOffers() {
    const sl = this.ensureSlayer()
    if (!sl.task && !sl.offers.length) sl.offers = TASK_KIND_IDS.map(k => this.makeOffer(k)).filter(Boolean)
    return sl.offers
  },
  rerollOffers() {
    const sl = this.ensureSlayer()
    if (sl.task || sl.points < REROLL_COST) return false
    sl.points -= REROLL_COST
    sl.offers = []
    this.slayerOffers()
    return true
  },
  takeOffer(i) {
    const sl = this.ensureSlayer(), o = this.slayerOffers()[i]
    if (sl.task || !o) return false
    sl.task = { monster: o.monster, kind: o.kind, left: o.total, total: o.total }
    sl.offers = []
    return true
  },
  // A task in one click: the standard offer
  newSlayerTask() {
    if (this.s.slayer.task) return
    const offers = this.slayerOffers()
    this.takeOffer(Math.max(0, offers.findIndex(o => o.kind === 'standard')))
  },
  slayerReward(task = this.s.slayer.task) {
    const m = MONSTERS[task.monster], k = TASK_KINDS[task.kind || 'standard']
    const streakBonus = (this.s.slayer.streak + 1) % 10 === 0 ? 5 : 1
    return {
      pts: Math.round((4 + Math.floor(monsterLevel(m) / 8)) * k.pts * (this.slayerPerk('extend') ? 1.5 : 1) * streakBonus),
      gold: Math.round(task.total * monsterLevel(m) * k.gold * (this.slayerPerk('bounty') ? 1.5 : 1)),
      xp: Math.round(task.total * m.hp * k.xp),
    }
  },
  completeSlayerTask() {
    const sl = this.ensureSlayer()
    const task = sl.task, m = MONSTERS[task.monster]
    const r = this.slayerReward(task)
    sl.streak++
    sl.points += r.pts
    sl.completed++
    const gold = this.addGold(r.gold, true)
    if (r.xp) this.addXp('slayer', r.xp)
    if (sl.streak % STREAK_CHEST_EVERY === 0) {
      this.addItem('gem_chest', 1)
      if (sl.streak % (STREAK_CHEST_EVERY * 2) === 0) this.addItem('starlight_shard', 1)
    }
    this.log('death-skull', 'log.slayerTask', { monster: '@monster:' + m.id })
    this.toast('death-skull', 'msg.slayerDone', { pts: r.pts, gold }, 'success')
    sl.task = null
    sl.offers = []
    this.rollPet(src => src.slayer)
  },
  // Slayer XP from each kill on task
  slayerXpMult() { return this.slayerPerk('insight') ? 1.15 : 1 },
  taskHelmBonus() { return TASK_HELMS[this.s.equipment.head] || 0 },

  /* ---------- Superior creatures ---------- */
  superiorChance() { return SUPERIOR_CHANCE * (this.slayerPerk('superior') ? 2 : 1) },
  rollSuperior(act) {
    const task = this.s.slayer.task
    return act.kind === 'area' && !!task && task.monster === act.target && Math.random() < this.superiorChance()
  },
  superiorLoot(m) {
    const n = rand(...SIGILS) + (this.s.slayer.task?.kind === 'hard' ? 1 : 0)
    this.addItem('slayer_sigil', n)
    this.addXp('slayer', Math.round(m.hp * 3))
    this.s.stats.superiors = (this.s.stats.superiors || 0) + 1
    return n
  },

  /* ---------- points ---------- */
  buySlayer(id) {
    const it = SLAYER_SHOP.find(x => x.id === id)
    const sl = this.ensureSlayer()
    if (!it || sl.points < it.cost) return false
    if (id === 'skip') { if (!sl.task) return false; sl.task = null; sl.offers = [] }
    sl.points -= it.cost
    if (it.item) this.addItem(it.item, 1)
    if (it.items) Object.entries(it.items).forEach(([k, q]) => this.addItem(k, q))
    return true
  },
  buyPerk(id) {
    const p = PERK_MAP[id], sl = this.ensureSlayer()
    if (!p || sl.perks[id] || sl.points < p.cost) return false
    sl.points -= p.cost
    sl.perks[id] = true
    return true
  },
  // Never be sent after this creature again (and drop the current task if it is that one)
  blockMonster(id) {
    const sl = this.ensureSlayer()
    if (sl.blocked.includes(id) || sl.blocked.length >= BLOCK_MAX || sl.points < BLOCK_COST) return false
    sl.points -= BLOCK_COST
    sl.blocked.push(id)
    if (sl.task?.monster === id) sl.task = null
    sl.offers = sl.offers.filter(o => o.monster !== id)
    return true
  },
  unblockMonster(id) {
    const sl = this.ensureSlayer()
    sl.blocked = sl.blocked.filter(x => x !== id)
    return true
  },
}
