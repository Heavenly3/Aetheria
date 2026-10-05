/* =========================================================
   META — pets, gear enchanting and daily / weekly tasks.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { XP_TABLE } from './data/skills.js'
import { SLOTS } from './data/items.js'
import { PETS, PET_MAP } from './data/pets.js'
import { seeded, dayKey } from './systems.js'

/* ---------------- Enchanting ---------------- */
export const ENCHANT_MAX = 10
export const ENCHANT_PER_LEVEL = 0.08 // +8% of the item's stats per level
export const ENCHANT_SLOTS = Object.keys(SLOTS).filter(s => s !== 'ammo')
const SUCCESS = [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]
const DROP_FROM = 5 // failing from this level up loses one level unless protected
export const PROTECT_ITEM = 'starlight_shard'

// Materials for going from `lvl` to `lvl + 1`
function enchantCost(lvl) {
  const items = {}
  if (lvl < 3) items.nature_rune = 10 * (lvl + 1)
  else if (lvl < 6) items.death_rune = 10 * (lvl + 1)
  else if (lvl < 8) items.blood_rune = 8 * (lvl + 1)
  else items.void_essence = (lvl - 6) * 3
  return { gold: Math.round(500 * Math.pow(2.2, lvl)), items }
}

/* ---------------- Daily and weekly tasks ---------------- */
const DAILY_COUNT = 3
const WEEKLY_COUNT = 3
const WEEKLY_MULT = 6
export const STREAK_BONUS = 0.1 // +10% rewards per streak day
export const STREAK_CAP = 10

// type -> how to read the counter and how big a daily target is
const TASKS = {
  xp:      { read: (G, t) => G.s.skills[t.skill].xp, target: (G, t) => Math.max(400, Math.round(levelGap(G.level(t.skill)) * 0.5)) },
  actions: { read: G => G.s.stats.actions, target: () => 300 },
  kills:   { read: G => G.s.stats.kills, target: G => 60 + Math.min(140, G.combatLevel()) },
  gold:    { read: G => G.s.stats.goldEarned, target: G => 1000 + G.heroLevel() * 400 },
  harvest: { read: G => G.s.stats.harvests || 0, target: () => 12 },
  dungeon: { read: G => G.s.stats.dungeons || 0, target: () => 3 },
  orders:  { read: G => G.s.stats.orders || 0, target: () => 2 },
  slayer:  { read: G => G.s.slayer.completed, target: () => 2 },
}
const levelGap = lvl => XP_TABLE[Math.min(99, lvl + 1)] - XP_TABLE[Math.min(98, lvl)]
const XP_SKILLS = ['mining', 'woodcutting', 'fishing', 'smithing', 'cooking', 'firemaking', 'fletching', 'crafting', 'herblore', 'runecrafting', 'agility', 'thieving']

// Monday of the current week as a day key
export const weekKey = (d = new Date()) => {
  const m = new Date(d)
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return dayKey(m)
}
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d) }

export const metaState = () => ({
  pets: {},
  enchant: {},
  daily: { day: '', tasks: [], week: '', weekly: [], streak: 0, bestStreak: 0, lastDone: '', claimed: 0 },
})

export const meta = {
  /* ================= pets ================= */
  hasPet(id) { return !!this.s.pets?.[id] },
  petCount() { return Object.keys(this.s.pets || {}).filter(id => PET_MAP[id]).length },
  petTotal() { return PETS.length },
  rollPet(match, scale = 1) {
    for (const p of PETS) {
      if (this.hasPet(p.id) || !match(p.source)) continue
      if (Math.random() < p.chance * scale * (1 + this.mod('loot') * 0.5)) this.awardPet(p)
    }
  },
  awardPet(p) {
    this.s.pets[p.id] = Date.now()
    this.log(p.icon, 'log.pet', { pet: '@pet:' + p.id })
    this.emit('pet', p)
  },
  rollSkillPet(skill, time) { this.rollPet(src => src.skill === skill, skill === 'farming' ? 1 : time / 3) },
  rollMonsterPet(id) { this.rollPet(src => src.monster === id) },
  petMods(key) {
    let v = 0
    for (const id in this.s.pets) { const p = PET_MAP[id]; if (p) v += p.mods[key] || 0 }
    return v
  },

  /* ================= enchanting ================= */
  enchantLevel(slot) { return this.s.enchant?.[slot] || 0 },
  maxEnchant() { return Math.max(0, ...ENCHANT_SLOTS.map(s => this.enchantLevel(s))) },
  enchantMult(slot) { return 1 + this.enchantLevel(slot) * ENCHANT_PER_LEVEL },
  enchantCost(slot) { return enchantCost(this.enchantLevel(slot)) },
  enchantChance(slot) { return SUCCESS[this.enchantLevel(slot)] ?? 0 },
  enchantRisky(slot) { return this.enchantLevel(slot) >= DROP_FROM },
  canEnchant(slot) {
    if (this.enchantLevel(slot) >= ENCHANT_MAX) return false
    const c = this.enchantCost(slot)
    return this.s.gold >= c.gold && this.hasItems(c.items)
  },
  // Returns 'success' | 'fail' | 'drop', or null when it cannot be attempted
  enchant(slot, protect = false) {
    if (!ENCHANT_SLOTS.includes(slot) || !this.canEnchant(slot)) return null
    const useShield = protect && this.enchantRisky(slot) && this.qty(PROTECT_ITEM) > 0
    const c = this.enchantCost(slot)
    this.s.gold -= c.gold
    Object.entries(c.items).forEach(([k, q]) => this.removeItem(k, q))
    if (useShield) this.removeItem(PROTECT_ITEM, 1)
    const lvl = this.enchantLevel(slot)
    if (Math.random() < this.enchantChance(slot)) {
      this.s.enchant[slot] = lvl + 1
      if (lvl + 1 >= 5) this.log('upgrade', 'log.enchant', { slot: '@slot:' + slot, n: lvl + 1 })
      return 'success'
    }
    if (lvl >= DROP_FROM && !useShield) { this.s.enchant[slot] = lvl - 1; return 'drop' }
    return 'fail'
  },

  /* ================= daily and weekly tasks ================= */
  makeTasks(seedKey, count, mult) {
    const rng = seeded(seedKey + this.s.created)
    const pool = ['xp', 'xp', 'actions', 'kills', 'gold', 'harvest', 'dungeon', 'orders']
    if (this.level('slayer') >= 5) pool.push('slayer')
    const out = []
    while (out.length < count && pool.length) {
      const type = pool.splice(Math.floor(rng() * pool.length), 1)[0]
      const t = { type }
      if (type === 'xp') {
        const taken = out.filter(o => o.type === 'xp').map(o => o.skill)
        const skills = XP_SKILLS.filter(s => !taken.includes(s))
        t.skill = skills[Math.floor(rng() * skills.length)]
      }
      t.target = Math.round(TASKS[type].target(this, t) * mult)
      t.base = TASKS[type].read(this, t)
      t.claimed = false
      out.push(t)
    }
    return out
  },
  ensureTasks() {
    const d = (this.s.daily ||= metaState().daily)
    const today = dayKey()
    if (d.day !== today) {
      d.day = today
      d.tasks = this.makeTasks('daily' + today, DAILY_COUNT, 1)
    }
    const week = weekKey()
    if (d.week !== week) {
      d.week = week
      d.weekly = this.makeTasks('weekly' + week, WEEKLY_COUNT, WEEKLY_MULT)
    }
  },
  taskProgress(t) {
    const cur = Math.max(0, TASKS[t.type].read(this, t) - t.base)
    return { cur: Math.min(cur, t.target), max: t.target }
  },
  taskDone(t) { return this.taskProgress(t).cur >= t.target },
  // The streak only counts while yesterday (or today) was completed
  currentStreak() {
    const d = this.s.daily
    return d && (d.lastDone === dayKey() || d.lastDone === yesterday()) ? d.streak : 0
  },
  streakMult() { return 1 + Math.min(STREAK_CAP, this.currentStreak()) * STREAK_BONUS },
  taskReward(t, weekly) {
    const m = weekly ? WEEKLY_MULT : 1
    const r = { gold: Math.round((300 + this.heroLevel() * 150) * m * this.streakMult()), tokens: weekly ? 4 : 1 }
    if (weekly) r.items = { gem_chest: 1 }
    return r
  },
  claimTask(i, weekly = false) {
    const d = this.s.daily
    const t = (weekly ? d.weekly : d.tasks)[i]
    if (!t || t.claimed || !this.taskDone(t)) return null
    const r = this.taskReward(t, weekly)
    t.claimed = true
    d.claimed = (d.claimed || 0) + 1
    this.addGold(r.gold)
    this.s.tavern.tokens += r.tokens
    Object.entries(r.items || {}).forEach(([k, n]) => this.addItem(k, n))
    if (!weekly && d.tasks.every(x => x.claimed) && d.lastDone !== d.day) {
      d.streak = d.lastDone === yesterday() ? d.streak + 1 : 1
      d.bestStreak = Math.max(d.bestStreak || 0, d.streak)
      d.lastDone = d.day
      const bonus = { coin_pouch: 1 + Math.floor(d.streak / 3) }
      if (d.streak % 7 === 0) bonus.gem_chest = 1
      Object.entries(bonus).forEach(([k, n]) => this.addItem(k, n))
      this.log('flame', 'log.streak', { n: d.streak })
      this.emit('streak', { n: d.streak, bonus })
    }
    return r
  },
  tasksReady() {
    const d = this.s.daily
    if (!d) return 0
    return [...(d.tasks || []), ...(d.weekly || [])].filter(t => !t.claimed && this.taskDone(t)).length
  },
}
