import { reactive, toRaw } from 'vue'
import { SKILLS, XP_TABLE, MAX_LEVEL } from './data/skills.js'
import { ITEMS, SLOTS, CROPS, GEMS, POTION_DURATION } from './data/items.js'
import { ACTIONS, findAction } from './data/actions.js'
import {
  PLAYER_ATTACK_SPEED, COMBAT_STYLES, SPELLS, MONSTERS, AREAS, BOSSES, MERCENARIES,
  SLAYER_SHOP, TOWER_SHOP, towerMonster, monsterLevel, DUNGEONS,
} from './data/combat.js'
import { QUESTS, ACHIEVEMENTS, ROOMS, BLESSINGS, BLESSING_DURATION, PRESTIGE } from './data/progression.js'
import {
  SLOT_COUNT, DIFFICULTIES, ATTRIBUTES, ROLES, TALENTS, POINTS_PER_LEVEL, HERO_MAX_LEVEL, HERO_XP_SHARE, heroXpFor,
  TALENT_POINT_EVERY, MASTERY, masteryXpPerAction, TOOL_TYPES, TOOL_SPEED_PER_TIER,
} from './data/character.js'
import { systems, extraState } from './systems.js'
import { meta, metaState } from './meta.js'
import { ascension, ascensionState } from './ascension.js'
import { collection, collectionState } from './collection.js'
import { cloneNamed } from '../i18n/bind.js'
import '../i18n/names.js'

const SLOT_KEY = i => `aetheria-slot-${i}`
const META_KEY = 'aetheria-meta'
const LEGACY_KEY = 'aetheria-save-v2'
const RESPAWN_TIME = 1.5
const HP_REGEN = 3          // seconds per HP outside combat
const HP_REGEN_COMBAT = 6   // seconds per HP while fighting
const ELIXIR_DURATION = 1800
const LOG_SIZE = 40
const CHAIN_DEPTH = 3   // how many steps down the chained crafting may go
const CHAIN_BATCH = 10  // batches to prepare for an endless action

const GATHERING = ['mining', 'woodcutting', 'fishing', 'farming', 'thieving']
const ARTISAN = ['smithing', 'cooking', 'firemaking', 'fletching', 'crafting', 'herblore', 'runecrafting', 'prayer']
const skillCat = s => (GATHERING.includes(s) ? 'gathering' : ARTISAN.includes(s) ? 'artisan' : 'other')
const TOOL_FOR = Object.fromEntries(Object.entries(TOOL_TYPES).map(([type, d]) => [d.skill, type]))
const BOSS_MAP = Object.fromEntries(BOSSES.map(b => [b.id, b]))
const CROP_MAP = Object.fromEntries(CROPS.map(c => [c.id, c]))
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const msg = (key, params = {}) => ({ key, params })
const store = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v); return true } catch { return false } },
  del(k) { try { localStorage.removeItem(k) } catch { /* storage unavailable */ } },
}

export function newState(profile = {}) {
  const skills = {}
  Object.keys(SKILLS).forEach(id => (skills[id] = { xp: 0 }))
  skills.hitpoints.xp = XP_TABLE[10]
  return {
    version: 3,
    created: Date.now(),
    lastTick: Date.now(),
    name: profile.name || 'Adventurer',
    role: profile.role || 'warrior',
    avatar: profile.avatar || 'wizard-face',
    tint: profile.tint || '#6f5cd2',
    difficulty: profile.difficulty || 'normal',
    gold: 50,
    skills,
    hero: { xp: 0, attrs: Object.fromEntries(Object.keys(ATTRIBUTES).map(k => [k, 0])), talents: {} },
    mastery: {},
    inventory: {},
    equipment: Object.fromEntries(Object.keys(SLOTS).map(k => [k, null])),
    tools: { pickaxe: null, axe: null, rod: null },
    farm: { plots: [], auto: true },
    food: null,
    potion: null,
    spell: 'wind_strike',
    combatStyle: 'attack',
    autoEatPct: 50,
    activity: null,
    hp: 10,
    hpRegen: 0,
    buffs: { potion: null, elixir: 0 },
    blessings: {},
    killsBy: {},
    quests: {},
    achievements: {},
    rooms: {},
    prestige: {},
    slayer: { task: null, points: 0, completed: 0, streak: 0 },
    tower: { best: 0, tokens: 0 },
    stats: { actions: 0, kills: 0, goldEarned: 0, deaths: 0, burnt: 0, rares: 0, playTime: 0, harvests: 0 },
    log: [],
    // Old saves load with the tutorial finished; only new characters get it
    tutorial: { step: 0, done: true, base: null },
    ...extraState(),
    ...metaState(),
    ...ascensionState(),
    ...collectionState(),
  }
}

export const state = reactive(newState())

function replaceState(next) {
  const fresh = newState()
  for (const k of Object.keys(state)) if (!(k in fresh)) delete state[k]
  for (const k of Object.keys(fresh)) {
    const v = next[k]
    if (v === undefined) state[k] = fresh[k]
    else if (fresh[k] && typeof fresh[k] === 'object' && !Array.isArray(fresh[k]) && v && typeof v === 'object') state[k] = { ...fresh[k], ...v }
    else state[k] = v
  }
  Object.keys(SKILLS).forEach(id => (state.skills[id] ||= { xp: 0 }))
  state.hero.attrs = { ...fresh.hero.attrs, ...(state.hero.attrs || {}) }
  state.hero.talents ||= {}
  if (!Array.isArray(state.farm.plots)) state.farm.plots = []
  if (!Array.isArray(state.log)) state.log = []
  const ex = extraState()
  state.tavern = { ...ex.tavern, ...(state.tavern || {}) }
  state.tavern.dice = { ...ex.tavern.dice, ...(state.tavern.dice || {}) }
  ;['board', 'workers', 'orders', 'reports'].forEach(k => { if (!Array.isArray(state.tavern[k])) state.tavern[k] = [] })
  if (!Array.isArray(state.queue)) state.queue = []
  if (!Array.isArray(state.history)) state.history = []
  if (!Array.isArray(state.loadouts) || state.loadouts.length !== 3) state.loadouts = [null, null, null]
  state.settings = { ...ex.settings, ...(state.settings || {}) }
}

let towerCache = { key: '', m: null }
const scaledCache = new Map()

export const G = {
  s: state,
  slot: null,
  tracker: null,
  listeners: {},

  /* ================= events ================= */
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => this.off(evt, fn) },
  off(evt, fn) { this.listeners[evt] = (this.listeners[evt] || []).filter(f => f !== fn) },
  emit(evt, data) {
    if (this.tracker) return
    ;(this.listeners[evt] || []).forEach(fn => fn(data))
  },
  // Messages are { key, params } pairs so they can be shown in any language
  toast(icon, key, params = {}, kind = 'info') { this.emit('toast', { icon, msg: msg(key, params), kind }) },
  log(icon, key, params = {}) {
    this.s.log.unshift({ t: Date.now(), icon, key, params })
    if (this.s.log.length > LOG_SIZE) this.s.log.length = LOG_SIZE
  },

  /* ================= save slots ================= */
  // Move a save from the pre-slot version into slot 1
  migrateLegacy() {
    const raw = store.get(LEGACY_KEY)
    if (!raw || store.get(SLOT_KEY(0))) return
    try {
      const s = JSON.parse(raw)
      Object.assign(s, { role: s.role || 'warrior', difficulty: s.difficulty || 'easy', avatar: 'wizard-face', tint: '#6f5cd2' })
      store.set(SLOT_KEY(0), JSON.stringify(s))
      store.del(LEGACY_KEY)
    } catch { /* unreadable old save */ }
  },
  summarize(s) {
    const lvl = xp => this.levelFromXp(xp)
    return {
      name: s.name, role: s.role, avatar: s.avatar, tint: s.tint, difficulty: s.difficulty || 'normal',
      heroLevel: this.heroLevelFromXp(s.hero?.xp || 0),
      totalLevel: Object.keys(SKILLS).reduce((a, k) => a + lvl(s.skills?.[k]?.xp || 0), 0),
      playTime: s.stats?.playTime || 0, lastTick: s.lastTick, gold: s.gold || 0,
      activity: s.activity ? (s.activity.type === 'skill' ? { skill: s.activity.skill } : { combat: true }) : null,
    }
  },
  listSlots() {
    this.migrateLegacy()
    return Array.from({ length: SLOT_COUNT }, (_, i) => {
      const raw = store.get(SLOT_KEY(i))
      if (!raw) return null
      try { return this.summarize(JSON.parse(raw)) } catch { return null }
    })
  },
  lastSlot() {
    try { const m = JSON.parse(store.get(META_KEY) || '{}'); return Number.isInteger(m.last) && store.get(SLOT_KEY(m.last)) ? m.last : null } catch { return null }
  },
  loadSlot(i) {
    const raw = store.get(SLOT_KEY(i))
    if (!raw) return false
    replaceState(JSON.parse(raw))
    this.slot = i
    this.migrateState()
    store.set(META_KEY, JSON.stringify({ last: i }))
    return true
  },
  newGame(i, profile) {
    replaceState(newState(profile))
    this.slot = i
    this.setupCharacter()
    this.s.tutorial = { step: 0, done: false, base: null }
    this.log(ROLES[this.s.role].icon, 'log.start', { name: this.s.name, role: '@role:' + this.s.role })
    this.save()
  },
  deleteSlot(i) {
    store.del(SLOT_KEY(i))
    if (this.lastSlot() === i) store.del(META_KEY)
    if (this.slot === i) this.slot = null
  },
  save() {
    if (this.slot === null) return
    state.lastTick = Date.now()
    store.set(SLOT_KEY(this.slot), JSON.stringify(toRaw(state)))
    store.set(META_KEY, JSON.stringify({ last: this.slot }))
  },
  exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(toRaw(state))))) },
  importSave(str) {
    const s = JSON.parse(decodeURIComponent(escape(atob(str.trim()))))
    if (!s || !s.skills) throw new Error('Invalid save')
    this.loadSave(s)
  },
  // Replace the game in the current slot with a save object (from a file or a transfer code)
  loadSave(s) {
    replaceState(JSON.parse(JSON.stringify(s)))
    this.migrateState()
    this.save()
  },
  // Store a save object straight into a slot, from the title screen
  writeSlot(i, s) {
    return store.set(SLOT_KEY(i), JSON.stringify(s))
  },

  freshState(profile) { return newState(profile) },
  setupCharacter() {
    const role = ROLES[this.s.role]
    Object.entries(role.skills).forEach(([k, l]) => (this.s.skills[k].xp = XP_TABLE[l]))
    Object.entries(role.items).forEach(([k, q]) => this.addItem(k, q))
    if (role.gold) this.s.gold += role.gold
    ;['bronze_pickaxe', 'bronze_axe', 'rod'].forEach(id => { this.addItem(id, 1); this.equip(id) })
    role.equip.forEach(id => {
      if (!ITEMS[id]) return
      if (ITEMS[id].stackEquip) this.s.equipment.ammo = id
      else { this.addItem(id, 1); this.equip(id) }
    })
    this.addItem('potato_seed', 6)
    this.s.combatStyle = role.style
    this.s.hp = this.maxHp()
    this.ensurePlots()
  },
  // Fill in whatever older saves are missing
  migrateState() {
    const st = this.s
    // The bestiary keeps its own lifetime kill count; saves from before it start from the current one
    if (!Object.keys(st.bestiary.kills).length) st.bestiary.kills = { ...st.killsBy }
    if (!ROLES[st.role]) st.role = 'warrior'
    if (!DIFFICULTIES[st.difficulty]) st.difficulty = 'normal'
    if ((st.version || 2) < 3) {
      ;['bronze_pickaxe', 'bronze_axe', 'rod'].forEach(id => { if (!st.tools[ITEMS[id].toolType]) { this.addItem(id, 1); this.equip(id) } })
      st.version = 3
    }
    Object.keys(st.skills).forEach(id => { if (!SKILLS[id]) delete st.skills[id] })
    Object.keys(st.inventory).forEach(id => { if (!ITEMS[id]) delete st.inventory[id] })
    this.ensurePlots()
  },

  /* ================= levels ================= */
  levelFromXp(xp) {
    let lo = 1, hi = MAX_LEVEL
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (xp >= XP_TABLE[mid]) lo = mid; else hi = mid - 1 }
    return lo
  },
  level(skill) { return this.levelFromXp(this.s.skills[skill].xp) },
  levelProgress(skill) {
    const l = this.level(skill)
    if (l >= MAX_LEVEL) return 1
    const xp = this.s.skills[skill].xp
    return (xp - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l])
  },
  xpToNext(skill) {
    const l = this.level(skill)
    return l >= MAX_LEVEL ? 0 : XP_TABLE[l + 1] - this.s.skills[skill].xp
  },
  totalLevel() { return Object.keys(SKILLS).reduce((s, k) => s + this.level(k), 0) },
  maxSkillLevel() { return Math.max(...Object.keys(SKILLS).filter(k => k !== 'hitpoints').map(k => this.level(k))) },
  combatLevel() {
    const L = k => this.level(k)
    const base = 0.25 * (L('defense') + L('hitpoints'))
    const melee = 0.325 * (L('attack') + L('strength'))
    const range = 0.325 * Math.floor(L('ranged') * 1.5)
    const mage = 0.325 * Math.floor(L('magic') * 1.5)
    return Math.floor(base + Math.max(melee, range, mage))
  },

  /* ================= hero level, attributes and talents ================= */
  heroLevelFromXp(xp) {
    let lo = 1, hi = HERO_MAX_LEVEL
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (xp >= heroXpFor(mid)) lo = mid; else hi = mid - 1 }
    return lo
  },
  heroLevel() { return this.heroLevelFromXp(this.s.hero.xp) },
  heroProgress() {
    const l = this.heroLevel()
    if (l >= HERO_MAX_LEVEL) return 1
    return (this.s.hero.xp - heroXpFor(l)) / (heroXpFor(l + 1) - heroXpFor(l))
  },
  heroXpToNext() { const l = this.heroLevel(); return l >= HERO_MAX_LEVEL ? 0 : heroXpFor(l + 1) - this.s.hero.xp },
  addHeroXp(n) {
    const before = this.heroLevel()
    this.s.hero.xp += n
    const after = this.heroLevel()
    if (after > before) {
      this.log('laurel-crown', 'log.heroLevel', { level: after, points: POINTS_PER_LEVEL * (after - before) })
      if (this.tracker) this.tracker.heroLevel = after
      this.ensurePlots()
      this.emit('herolevel', after)
    }
  },
  attr(a) { return (ROLES[this.s.role]?.attrs[a] || 0) + (this.s.hero.attrs[a] || 0) },
  attrPoints() {
    const spent = Object.values(this.s.hero.attrs).reduce((a, b) => a + b, 0)
    return (this.heroLevel() - 1) * POINTS_PER_LEVEL - spent
  },
  allocate(a, n = 1) {
    n = Math.min(n, this.attrPoints())
    if (n <= 0 || !ATTRIBUTES[a]) return false
    this.s.hero.attrs[a] += n
    return true
  },
  talentRank(id) { return this.s.hero.talents[id] || 0 },
  talentPoints() {
    const spent = Object.values(this.s.hero.talents).reduce((a, b) => a + b, 0)
    return Math.floor(this.heroLevel() / TALENT_POINT_EVERY) - spent
  },
  canLearn(tal) {
    return this.talentPoints() > 0 && this.talentRank(tal.id) < tal.max && this.heroLevel() >= tal.lvl && (!tal.role || tal.role === this.s.role)
  },
  learnTalent(id) {
    const tal = TALENTS.find(x => x.id === id)
    if (!tal || !this.canLearn(tal)) return false
    this.s.hero.talents[id] = this.talentRank(id) + 1
    return true
  },
  respecCost() { return 500 * this.heroLevel() },
  respec() {
    const cost = this.respecCost()
    if (this.s.gold < cost) return false
    this.s.gold -= cost
    Object.keys(this.s.hero.attrs).forEach(k => (this.s.hero.attrs[k] = 0))
    this.s.hero.talents = {}
    this.s.hp = Math.min(this.s.hp, this.maxHp())
    return true
  },

  /* ================= modifiers ================= */
  // Sum of role, attribute, talent and temporary bonuses for a modifier key
  mod(key) {
    let v = (ROLES[this.s.role]?.bonus[key] || 0) + this.extraMods(key) + this.petMods(key) + this.ascensionMods(key) + this.setMods(key) + this.bestiaryMods(key) + this.festivalMods(key)
    for (const a in ATTRIBUTES) { const per = ATTRIBUTES[a].mods[key]; if (per) v += per * this.attr(a) }
    const tal = this.s.hero.talents
    for (const tt of TALENTS) if (tt.mod === key && tal[tt.id]) v += tt.per * tal[tt.id]
    return v
  },
  diff() { return DIFFICULTIES[this.s.difficulty] || DIFFICULTIES.normal },
  room(id) { return this.s.rooms[id] || 0 },
  blessed(id) { return (this.s.blessings[id] || 0) > 0 },
  prestigeOf(skill) { return this.s.prestige[skill] || 0 },
  totalPrestige() { return Object.values(this.s.prestige).reduce((a, b) => a + b, 0) },
  xpMult(skill) {
    const base = 1 + this.room('library') * 0.04 + this.prestigeOf(skill) * PRESTIGE.xpPerLevel + this.totalPrestige() * PRESTIGE.globalXp
      + (this.blessed('wisdom') ? 0.1 : 0) + (this.blessed('grace') ? 0.2 : 0) + (this.s.buffs.elixir > 0 ? 0.25 : 0)
      + this.mod('xp') + this.mod('xp.' + skill)
    return base * this.diff().xp
  },
  toolTier(type) { const id = this.s.tools[type]; return id ? ITEMS[id].tier : 0 },
  speedFactor(skill) {
    const cat = skillCat(skill)
    const tool = TOOL_FOR[skill]
    return 1 + (cat === 'gathering' ? this.room('tools') * 0.06 : 0) + (cat === 'artisan' ? this.room('workshop') * 0.06 : 0)
      + this.level('agility') * 0.002 + this.prestigeOf(skill) * PRESTIGE.speedPerLevel
      + (this.blessed('diligence') ? 0.1 : 0) + (this.blessed('grace') ? 0.1 : 0)
      + this.mod('speed') + this.mod('speed.' + cat) + this.mod('speed.' + skill)
      + (tool ? this.toolTier(tool) * TOOL_SPEED_PER_TIER : 0)
  },
  goldMult() { return (1 + this.room('vault') * 0.06 + (this.blessed('fortune') ? 0.15 : 0) + this.mod('gold')) * this.diff().gold },
  offlineCapHours() { return (8 + this.room('bedroom') * 2 + this.mod('offline')) * this.diff().offline },
  maxBlessings() { return 1 + Math.floor(this.level('prayer') / 30) },
  blessingDuration() { return BLESSING_DURATION * (1 + 0.25 * this.room('chapel') + this.mod('blessing')) },
  healMult() { return 1 + this.room('kitchen') * 0.1 + this.mod('heal') },

  /* ================= XP ================= */
  addXp(skill, amount, applyMult = true) {
    const before = this.level(skill)
    const gained = amount * (applyMult ? this.xpMult(skill) : 1)
    this.s.skills[skill].xp = Math.min(200_000_000, this.s.skills[skill].xp + gained)
    if (this.tracker) this.tracker.xp[skill] = (this.tracker.xp[skill] || 0) + gained
    this.addHeroXp(gained * HERO_XP_SHARE)
    const after = this.level(skill)
    if (after > before) {
      if (this.tracker) this.tracker.levels[skill] = after
      this.log(SKILLS[skill].icon, 'log.levelUp', { skill: '@skill:' + skill, level: after })
      this.emit('levelup', { skill, level: after })
    }
  },

  /* ================= per-action mastery ================= */
  masteryXp(skill, id) { return this.s.mastery[skill]?.[id] || 0 },
  masteryLevel(skill, id) { return this.levelFromXp(this.masteryXp(skill, id) * MASTERY.xpScale) },
  masteryProgress(skill, id) {
    const l = this.masteryLevel(skill, id)
    if (l >= MAX_LEVEL) return 1
    const xp = this.masteryXp(skill, id) * MASTERY.xpScale
    return (xp - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l])
  },
  addMastery(skill, id, amount) {
    const before = this.masteryLevel(skill, id)
    ;(this.s.mastery[skill] ||= {})[id] = this.masteryXp(skill, id) + amount * (1 + this.mod('mastery'))
    const after = this.masteryLevel(skill, id)
    if (after > before && after % 10 === 0) {
      const ref = CROP_MAP[id] && skill === 'farming' ? '@crop:' + id : `@action:${skill}/${id}`
      this.log('laurels-trophy', 'log.mastery', { level: after, name: ref })
      this.emit('mastery', { skill, id, level: after, name: ref })
    }
  },
  maxMastery() {
    let m = 1
    for (const sk in this.s.mastery) for (const id in this.s.mastery[sk]) m = Math.max(m, this.masteryLevel(sk, id))
    return m
  },
  doubleChance(skill, id) {
    return this.mod('double') + this.mod('double.' + skillCat(skill)) + this.masteryLevel(skill, id) * MASTERY.doublePer
  },
  preserveChance(skill, id) {
    if (skillCat(skill) !== 'artisan') return 0
    return Math.min(0.5, this.mod('preserve') + Math.floor(this.masteryLevel(skill, id) / MASTERY.preserveEvery) * MASTERY.preservePer)
  },

  /* ================= inventory ================= */
  qty(id) { return this.s.inventory[id] || 0 },
  addItem(id, n = 1) {
    if (n <= 0 || !ITEMS[id]) return
    this.s.inventory[id] = this.qty(id) + n
    if (this.tracker) this.tracker.items[id] = (this.tracker.items[id] || 0) + n
  },
  removeItem(id, n = 1) {
    const q = this.qty(id) - n
    if (q <= 0) delete this.s.inventory[id]
    else this.s.inventory[id] = q
    if (this.tracker) this.tracker.items[id] = (this.tracker.items[id] || 0) - n
    if (q <= 0) {
      if (this.s.food === id) this.s.food = null
      if (this.s.potion === id) this.s.potion = null
      if (this.s.equipment.ammo === id) this.s.equipment.ammo = null
    }
  },
  hasItems(items) { return Object.entries(items || {}).every(([k, q]) => this.qty(k) >= q) },
  addGold(n, mult = false) {
    n = Math.floor(n * (mult ? this.goldMult() : 1))
    this.s.gold += n
    this.s.stats.goldEarned += n
    if (this.tracker) this.tracker.gold += n
    return n
  },
  sellPrice(id) { return Math.floor(ITEMS[id].value * this.goldMult() * this.marketMult(id)) },
  sell(id, n) {
    n = Math.min(n, this.qty(id))
    if (n <= 0 || this.isLocked(id)) return 0
    const earned = this.sellPrice(id) * n
    this.removeItem(id, n)
    this.s.gold += earned
    this.s.stats.goldEarned += earned
    return earned
  },
  sellJunk() {
    let total = 0
    Object.keys(this.s.inventory).forEach(id => { if (ITEMS[id]?.type === 'junk') total += this.sell(id, this.qty(id)) })
    return total
  },
  buy(id, n, price) {
    const cost = n * price
    if (n <= 0 || this.s.gold < cost) return false
    this.s.gold -= cost
    this.addItem(id, n)
    return true
  },
  openChest(id) {
    if (this.qty(id) <= 0) return null
    this.removeItem(id, 1)
    const got = {}
    const give = (item, n) => { this.addItem(item, n); got[item] = (got[item] || 0) + n }
    if (id === 'bird_nest') {
      const pool = CROPS.filter(c => c.lvl <= 60)
      const c = pool[Math.floor(Math.pow(Math.random(), 2) * pool.length)]
      give(c.id + '_seed', rand(1, 3))
    } else if (id === 'coin_pouch') {
      got.gold = this.addGold(rand(40, 160), true)
    } else if (id === 'gem_chest') {
      for (let i = 0, n = rand(2, 4); i < n; i++) {
        const r = Math.random()
        const g = r < 0.5 ? GEMS[0] : r < 0.8 ? GEMS[1] : r < 0.95 ? GEMS[2] : GEMS[3]
        give('uncut_' + g.id, 1)
      }
    }
    return got
  },

  /* ================= equipment and tools ================= */
  bonuses() {
    const b = { atk: 0, str: 0, def: 0, rAtk: 0, rStr: 0, mAtk: 0, mDmg: 0 }
    // Enchant levels belong to the slot, so they scale whatever is equipped there
    Object.entries(this.s.equipment).forEach(([slot, id]) => {
      if (!id || !ITEMS[id]) return
      const mult = slot === 'ammo' ? 1 : this.enchantMult(slot)
      Object.entries(ITEMS[id].stats || {}).forEach(([k, v]) => (b[k] += k === 'mDmg' ? v * mult : Math.round(v * mult)))
    })
    return b
  },
  meetsReq(req) { return Object.entries(req || {}).every(([sk, l]) => this.level(sk) >= l) },
  canEquip(id) {
    const it = ITEMS[id]
    return !!it && (it.type === 'equip' || it.type === 'tool') && this.meetsReq(it.req)
  },
  equip(id) {
    if (!this.canEquip(id) || this.qty(id) <= 0) return false
    const it = ITEMS[id]
    if (it.type === 'tool') {
      const prev = this.s.tools[it.toolType]
      this.removeItem(id, 1)
      if (prev) this.addItem(prev, 1)
      this.s.tools[it.toolType] = id
      return true
    }
    const eq = this.s.equipment
    if (it.stackEquip) { eq.ammo = id; return true }
    if (it.slot === 'weapon' && it.twoHanded && eq.shield) this.unequip('shield')
    if (it.slot === 'shield' && eq.weapon && ITEMS[eq.weapon].twoHanded) this.unequip('weapon')
    const prev = eq[it.slot]
    this.removeItem(id, 1)
    if (prev) this.addItem(prev, 1)
    eq[it.slot] = id
    return true
  },
  unequip(slot) {
    const id = this.s.equipment[slot]
    if (!id) return
    this.s.equipment[slot] = null
    if (!ITEMS[id].stackEquip) this.addItem(id, 1)
  },
  unequipTool(type) {
    const id = this.s.tools[type]
    if (!id) return
    this.s.tools[type] = null
    this.addItem(id, 1)
  },

  /* ================= health, food and potions ================= */
  maxHp() { return this.level('hitpoints') + Math.floor(this.mod('maxHp')) },
  heal(n) { this.s.hp = Math.min(this.maxHp(), this.s.hp + n) },
  foodHeal(id) { return Math.floor(ITEMS[id].heal * this.healMult()) },
  eat(id) {
    const it = ITEMS[id]
    if (!it || it.type !== 'food' || this.qty(id) <= 0 || this.s.hp >= this.maxHp()) return false
    this.removeItem(id, 1)
    this.heal(this.foodHeal(id))
    if (this.tracker) this.tracker.eaten++
    return true
  },
  drink(id) {
    const it = ITEMS[id]
    if (!it || it.type !== 'potion' || this.qty(id) <= 0) return false
    this.removeItem(id, 1)
    if (it.elixir) this.s.buffs.elixir += ELIXIR_DURATION
    else this.s.buffs.potion = { id, t: POTION_DURATION }
    return true
  },
  boost(skill) {
    const p = this.s.buffs.potion
    if (!p || p.t <= 0) return 0
    const b = ITEMS[p.id]?.buff?.[skill]
    return b ? b[0] + Math.floor(this.level(skill) * b[1]) : 0
  },
  boosted(skill) { return this.level(skill) + this.boost(skill) },
  autoEat() {
    const food = this.s.food
    while (food && this.s.hp <= this.maxHp() * this.s.autoEatPct / 100 && this.qty(food) > 0) if (!this.eat(food)) break
  },
  autoDrink() {
    const id = this.s.potion
    const p = this.s.buffs.potion
    if (id && (!p || p.t <= 0) && this.qty(id) > 0) this.drink(id)
  },

  /* ================= skill actions ================= */
  getAction: findAction,
  actionTime(skill, a) { return a.time / (this.speedFactor(skill) + this.masteryLevel(skill, a.id) * MASTERY.speedPer) },
  hasTool(a) { return !a.tool || this.toolTier(a.tool.type) >= a.tool.tier },
  canDo(skill, a) { return this.level(skill) >= a.lvl && this.hasItems(a.in) && this.hasTool(a) },
  burnChance(skill, a) { return Math.max(0, 0.45 - (this.level(skill) - a.lvl) * 0.025) * (1 - this.room('kitchen') * 0.3) },
  failChance(skill, a) { return Math.min(0.55, Math.max(0.03, 0.55 - (this.level(skill) - a.lvl) * 0.012 - this.mod('thieving'))) },
  runeMult(skill, a) { return 1 + Math.floor((this.level(skill) - a.lvl) / 12) },

  startSkill(skill, actionId) {
    const a = findAction(skill, actionId)
    if (!a) return
    const cur = this.s.activity
    if (cur && cur.type === 'skill' && cur.skill === skill && cur.action === actionId) return this.stop()
    if (this.level(skill) < a.lvl) return this.toast('padlock', 'msg.needLevel', { lvl: a.lvl, skill: '@skill:' + skill }, 'warn')
    if (!this.hasTool(a)) return this.toast(TOOL_TYPES[a.tool.type].icon, 'msg.needTool', { tool: TOOL_TYPES[a.tool.type].name, tier: a.tool.tier }, 'warn')
    if (!this.hasItems(a.in) && !this.canChain(a)) return this.toast('knapsack', 'msg.noMaterials', {}, 'warn')
    this.s.activity = { type: 'skill', skill, action: actionId, progress: 0 }
    this.emit('activity')
  },

  /* ---------- chained crafting ---------- */
  // An action the player can run that produces `item`, following missing inputs a few steps down
  producerFor(item, depth = 0) {
    if (depth >= CHAIN_DEPTH) return null
    let best = null
    for (const [skill, list] of Object.entries(ACTIONS)) {
      for (const a of list) {
        if (!a.out[item] || this.level(skill) < a.lvl || !this.hasTool(a)) continue
        if (best && a.lvl <= best.a.lvl) continue
        if (Object.entries(a.in).every(([k, q]) => this.qty(k) >= q || this.producerFor(k, depth + 1))) best = { skill, a }
      }
    }
    return best
  },
  canChain(a) {
    return !!this.s.settings.autoChain && Object.entries(a.in).every(([k, q]) => this.qty(k) >= q || this.producerFor(k))
  },
  canStart(skill, a) { return this.level(skill) >= a.lvl && this.hasTool(a) && (this.hasItems(a.in) || this.canChain(a)) },
  // Switch to making the first missing material; the current action is resumed afterwards
  tryChain(act, a) {
    if (!this.s.settings.autoChain || act.noChain) return false
    let depth = 0
    for (let p = act.parent; p; p = p.parent) depth++
    if (depth >= CHAIN_DEPTH) return false
    const batches = act.limit ? act.limit - act.done : CHAIN_BATCH
    const item = Object.keys(a.in).find(k => this.qty(k) < a.in[k])
    const p = item && this.producerFor(item, depth)
    if (!p) return false
    const need = a.in[item] * batches - this.qty(item)
    this.s.activity = {
      type: 'skill', skill: p.skill, action: p.a.id, progress: 0, done: 0,
      limit: Math.max(1, Math.ceil(need / p.a.out[item])),
      parent: { skill: act.skill, action: act.action, limit: act.limit, done: act.done || 0, parent: act.parent },
    }
    this.emit('activity')
    return true
  },
  // Back to the action that asked for the materials; if nothing was made, don't chain again
  resumeParent(act) {
    const p = act.parent
    this.s.activity = { type: 'skill', skill: p.skill, action: p.action, progress: 0, limit: p.limit, done: p.done, parent: p.parent, noChain: act.done === 0 }
    this.emit('activity')
  },

  // `reason` is an optional { key, params } message shown to the player
  stop(reason) {
    if (!this.s.activity) return
    this.s.activity = null
    if (this.tracker && reason) this.tracker.stopReason = reason
    this.emit('activity')
    if (reason) this.emit('toast', { icon: 'hourglass', msg: reason, kind: 'warn' })
  },

  completeAction(skill, a) {
    const act = this.s.activity
    if (!(Object.keys(a.in).length && Math.random() < this.preserveChance(skill, a.id))) {
      Object.entries(a.in).forEach(([k, q]) => this.removeItem(k, q))
    }
    this.s.stats.actions++
    this.addMastery(skill, a.id, masteryXpPerAction(a.time))
    this.rollSkillPet(skill, a.time)
    this.festivalAction(a.time)

    if (a.fail && Math.random() < this.failChance(skill, a)) {
      const dmg = rand(a.fail.dmg[0], a.fail.dmg[1])
      this.s.hp -= dmg
      act.progress -= 2 // stunned
      this.autoEat()
      this.emit('gain', msg('gain.caught', { dmg }))
      if (this.s.hp <= 0) { this.s.hp = 1; this.stop(msg('msg.faintedThieving')) }
      return
    }
    if (a.burn && Math.random() < this.burnChance(skill, a)) {
      this.addItem('burnt_food', 1)
      this.s.stats.burnt++
      this.emit('gain', msg('gain.burnt'))
      return
    }
    const double = Math.random() < this.doubleChance(skill, a.id) ? 2 : 1
    let gain = null
    Object.entries(a.out).forEach(([k, q]) => {
      let n = q
      if (a.runeMult) n = q * this.runeMult(skill, a)
      n *= double
      this.addItem(k, n)
      gain = msg('gain.item', { n, item: '@item:' + k })
    })
    if (a.gold) gain = msg('gain.gold', { n: this.addGold(rand(a.gold[0], a.gold[1]) * double, true) })
    let bonus = null
    ;(a.extra || []).forEach(e => {
      if (Math.random() < e.chance * (1 + this.mod('loot'))) {
        const n = rand(e.qty[0], e.qty[1])
        this.addItem(e.item, n)
        bonus = '@item:' + e.item
        if (e.chance < 0.02) { this.log(ITEMS[e.item].icon, 'log.found', { item: '@item:' + e.item }); this.emit('rare', { item: e.item, n }) }
      }
    })
    this.addXp(skill, a.xp)
    gain ||= msg('gain.xp', { n: Math.round(a.xp * this.xpMult(skill)) })
    this.emit('gain', { ...gain, double: double > 1, bonus })
  },

  updateSkill(dt) {
    const act = this.s.activity
    const a = findAction(act.skill, act.action)
    if (!a) return this.stop()
    act.progress += dt
    const dur = this.actionTime(act.skill, a)
    while (act.progress >= dur && this.s.activity === act) {
      if (!this.canDo(act.skill, a)) {
        if (this.level(act.skill) >= a.lvl && this.tryChain(act, a)) return
        if (act.parent) return this.resumeParent(act)
        if (this.s.queue.length) {
          this.toast('hourglass', 'msg.queueSkipMaterials', { action: `@action:${act.skill}/${a.id}` }, 'warn')
          return this.queueFinished()
        }
        return this.stop(msg('msg.outOfMaterials', { action: `@action:${act.skill}/${a.id}` }))
      }
      act.progress -= dur
      this.completeAction(act.skill, a)
      if (act.limit && ++act.done >= act.limit && this.s.activity === act) return act.parent ? this.resumeParent(act) : this.queueFinished()
    }
  },

  /* ================= real-time farming ================= */
  plotCount() {
    const hl = this.heroLevel()
    return 3 + this.room('garden') + (hl >= 20 ? 1 : 0) + (hl >= 50 ? 1 : 0)
  },
  ensurePlots() {
    const plots = this.s.farm.plots
    while (plots.length < this.plotCount()) plots.push(null)
  },
  growTime(crop) { return crop.grow / (1 + this.mod('farmSpeed') + this.masteryLevel('farming', crop.id) * MASTERY.speedPer) },
  plant(i, cropId) {
    const c = CROP_MAP[cropId]
    if (!c || this.s.farm.plots[i] || i >= this.plotCount()) return false
    if (this.level('farming') < c.lvl) { this.toast('padlock', 'msg.needLevel', { lvl: c.lvl, skill: '@skill:farming' }, 'warn'); return false }
    if (this.qty(c.id + '_seed') <= 0) { this.toast('plant-seed', 'msg.noSeeds', { item: '@item:' + c.id + '_seed' }, 'warn'); return false }
    this.removeItem(c.id + '_seed', 1)
    const time = this.growTime(c)
    this.s.farm.plots[i] = { crop: c.id, t: time, total: time }
    return true
  },
  plantAll(cropId) {
    let n = 0
    this.s.farm.plots.forEach((p, i) => { if (!p && this.qty(cropId + '_seed') > 0 && this.plant(i, cropId)) n++ })
    return n
  },
  harvest(i, replant = false) {
    const p = this.s.farm.plots[i]
    if (!p || p.t > 0) return null
    const c = CROP_MAP[p.crop]
    const base = rand(c.yield[0], c.yield[1]) + Math.floor(this.mod('farmYield')) + Math.floor(this.masteryLevel('farming', c.id) / 20)
    const n = base * (Math.random() < this.doubleChance('farming', c.id) ? 2 : 1)
    this.addItem(c.id, n)
    this.addXp('farming', c.harvestXp)
    this.addMastery('farming', c.id, 10 + c.grow / 30)
    this.s.stats.harvests = (this.s.stats.harvests || 0) + 1
    this.rollSkillPet('farming')
    this.s.farm.plots[i] = null
    if (replant && this.qty(c.id + '_seed') > 0 && this.level('farming') >= c.lvl) this.plant(i, c.id)
    return { item: c.id, n }
  },
  harvestAll() {
    let total = 0
    this.s.farm.plots.forEach((p, i) => { if (p && p.t <= 0) { const r = this.harvest(i, this.s.farm.auto); if (r) total += r.n } })
    return total
  },
  updateFarm(dt) {
    const plots = this.s.farm.plots
    for (let i = 0; i < plots.length; i++) {
      const p = plots[i]
      if (!p) continue
      if (p.t > 0) p.t = Math.max(0, p.t - dt)
      if (p.t <= 0 && this.s.farm.auto) this.harvest(i, true)
    }
  },
  farmBusy() { return this.s.farm.plots.some(p => p && p.t > 0) },

  /* ================= combat ================= */
  styleType() { return COMBAT_STYLES[this.s.combatStyle].type },
  currentSpell() { return SPELLS.find(sp => sp.id === this.s.spell) || SPELLS[0] },
  onTask(m) { return this.s.slayer.task && m && this.s.slayer.task.monster === m.id },
  areaUnlocked(area) { return !area.reqQuest || this.questDone(area.reqQuest) },
  // Apply the difficulty multiplier to a monster's stats
  scaleMonster(m) {
    const f = this.diff().monster
    if (f === 1) return m
    const key = m.id + '|' + f
    let s = scaledCache.get(key)
    if (!s) {
      s = cloneNamed(m, { hp: Math.round(m.hp * f), att: Math.round(m.att * f), def: Math.round(m.def * f), maxHit: Math.max(1, Math.round(m.maxHit * f)) })
      scaledCache.set(key, s)
    }
    return s
  },

  playerStats(m) {
    const st = this.s.combatStyle, type = this.styleType(), b = this.bonuses()
    let acc, maxHit
    if (type === 'melee') {
      const effAtt = this.boosted('attack') + 8 + (st === 'attack' ? 3 : 0)
      const effStr = this.boosted('strength') + 8 + (st === 'strength' ? 3 : 0)
      acc = effAtt * (b.atk + 64)
      maxHit = Math.floor(0.5 + effStr * (b.str + 64) / 640)
    } else if (type === 'ranged') {
      const eff = this.boosted('ranged') + 8
      acc = eff * (b.rAtk + 64)
      maxHit = Math.floor(0.5 + eff * (b.rStr + 64) / 640)
    } else {
      const eff = this.boosted('magic') + 8
      acc = eff * (b.mAtk + 64)
      maxHit = Math.floor(this.currentSpell().max * (1 + b.mDmg))
    }
    let accMult = 1 + (this.blessed('vigor') ? 0.1 : 0) + this.mod(type + 'Acc')
    let dmgMult = 1 + (this.blessed('vigor') ? 0.1 : 0) + this.room('trophy') * 0.04 + this.mod(type + 'Dmg')
    if (this.s.equipment.head === 'slayer_helm' && this.onTask(m)) { accMult += 0.15; dmgMult += 0.15 }
    const hunt = this.huntBonus(m)
    accMult += hunt
    dmgMult += hunt
    const effDef = this.boosted('defense') + 8 + (st === 'defense' ? 3 : 0)
    return {
      accRoll: acc * accMult,
      maxHit: Math.max(1, Math.floor(maxHit * dmgMult)),
      defRoll: effDef * (b.def + 64) * (1 + this.room('armory') * 0.05 + (this.blessed('protection') ? 0.1 : 0) + this.mod('defense')),
    }
  },
  monsterRolls(m) {
    return { accRoll: (m.att + 9) * 64, defRoll: (m.def + 9) * 64 * (m.weak === this.styleType() ? 0.65 : 1) }
  },
  hitChance(acc, def) { return acc > def ? 1 - (def + 2) / (2 * (acc + 1)) : acc / (2 * (def + 1)) },

  // Returns a { key, params } message if the current style cannot attack, or null
  attackBlocker() {
    const type = this.styleType()
    if (type === 'ranged') {
      const w = this.s.equipment.weapon
      if (!w || ITEMS[w].style !== 'ranged') return msg('msg.needBow')
      const ammo = this.s.equipment.ammo
      if (!ammo || this.qty(ammo) <= 0) return msg('msg.noArrows')
    }
    if (type === 'magic') {
      const sp = this.currentSpell()
      if (this.level('magic') < sp.lvl) return msg('msg.spellLevel', { lvl: sp.lvl, spell: sp.name })
      if (!this.hasItems(sp.runes)) return msg('msg.noRunes', { spell: sp.name })
    }
    return null
  },

  getMonster(act) {
    if (!act) return null
    if (act.kind === 'boss') return BOSS_MAP[act.target] && this.scaleMonster(BOSS_MAP[act.target])
    if (act.kind === 'dungeon') {
      const dg = DUNGEONS.find(d => d.id === act.target)
      if (!dg) return null
      return this.scaleMonster(act.room < dg.rooms.length ? MONSTERS[dg.rooms[act.room]] : dg.boss)
    }
    if (act.kind === 'tower') {
      const key = act.floor + '|' + this.s.difficulty
      if (towerCache.key !== key) towerCache = { key, m: this.scaleMonster(towerMonster(act.floor)) }
      return towerCache.m
    }
    return MONSTERS[act.target] && this.scaleMonster(MONSTERS[act.target])
  },

  startCombat(kind, target, opts = {}) {
    const cur = this.s.activity
    if (cur && cur.type === 'combat' && cur.kind === kind && cur.target === target && kind !== 'tower') return this.stop()
    const blocker = this.attackBlocker()
    if (blocker) return this.toast('crossed-swords', blocker.key, blocker.params, 'warn')
    let mercs = []
    if (kind === 'boss') {
      const b = BOSS_MAP[target]
      if (b.reqQuest && !this.questDone(b.reqQuest)) return this.toast('padlock', 'msg.bossLocked', {}, 'warn')
      mercs = (opts.mercs || []).filter(id => MERCENARIES.some(x => x.id === id))
      const cost = mercs.reduce((s, id) => s + MERCENARIES.find(x => x.id === id).cost, 0)
      if (this.s.gold < cost) return this.toast('two-coins', 'msg.mercGold', {}, 'warn')
      this.s.gold -= cost
    }
    if (kind === 'area') {
      const m = MONSTERS[target]
      const area = AREAS.find(a => a.id === m.area)
      if (!this.areaUnlocked(area)) return this.toast('padlock', 'msg.areaLocked', {}, 'warn')
      if (m.slayer && this.level('slayer') < m.slayer) return this.toast('death-skull', 'msg.needLevel', { lvl: m.slayer, skill: '@skill:slayer' }, 'warn')
    }
    if (kind === 'dungeon') {
      const dg = DUNGEONS.find(d => d.id === target)
      if (!dg) return
      if (dg.reqQuest && !this.questDone(dg.reqQuest)) return this.toast('padlock', 'msg.dungeonLocked', {}, 'warn')
    }
    const floor = kind === 'tower' ? Math.max(1, Math.floor(this.s.tower.best / 10) * 10 + 1) : null
    if (this.s.hp <= 0) this.s.hp = 1
    const act = { type: 'combat', kind, target, floor, room: 0, mHp: 0, pTimer: 0, mTimer: 0, mercTimer: 0, respawn: 0, mercs, runKills: 0, clears: 0 }
    act.mHp = this.getMonster(act).hp
    this.s.activity = act
    this.emit('activity')
  },

  updateCombat(dt) {
    const act = this.s.activity
    const m = this.getMonster(act)
    if (!m) return this.stop()
    if (act.respawn > 0) {
      act.respawn -= dt
      if (act.respawn <= 0) { act.mHp = this.getMonster(act).hp; act.pTimer = 0; act.mTimer = 0 }
      return
    }
    const ps = this.playerStats(m)
    const mr = this.monsterRolls(m)

    act.pTimer += dt
    if (act.pTimer >= PLAYER_ATTACK_SPEED) {
      act.pTimer -= PLAYER_ATTACK_SPEED
      const blocker = this.attackBlocker()
      if (blocker) return this.stop(blocker)
      const type = this.styleType()
      if (type === 'ranged' && Math.random() >= this.mod('ammoSave')) this.removeItem(this.s.equipment.ammo, 1)
      if (type === 'magic' && Math.random() >= this.mod('runeSave')) Object.entries(this.currentSpell().runes).forEach(([r, q]) => this.removeItem(r, q))
      const hit = Math.random() < this.hitChance(ps.accRoll, mr.defRoll)
      const dmg = hit ? rand(1, ps.maxHit) : 0 // a landed blow always does at least 1
      const dealt = Math.min(dmg, act.mHp)
      act.mHp -= dealt
      if (type === 'magic') this.addXp('magic', this.currentSpell().xp + dealt * 2)
      else if (dealt > 0) this.addXp(COMBAT_STYLES[this.s.combatStyle].skill, dealt * 4)
      if (dealt > 0) this.addXp('hitpoints', dealt * 1.33)
      this.emit('hit', { who: 'player', dmg })
      if (act.mHp <= 0) return this.killMonster(m)
    }

    if (act.mercs.length) {
      act.mercTimer += dt
      if (act.mercTimer >= PLAYER_ATTACK_SPEED) {
        act.mercTimer -= PLAYER_ATTACK_SPEED
        let total = 0
        act.mercs.forEach(id => { const mc = MERCENARIES.find(x => x.id === id); if (Math.random() < 0.75) total += rand(0, mc.maxHit) })
        act.mHp -= Math.min(total, act.mHp)
        this.emit('hit', { who: 'merc', dmg: total })
        if (act.mHp <= 0) return this.killMonster(m)
      }
    }

    act.mTimer += dt
    if (act.mTimer >= m.speed) {
      act.mTimer -= m.speed
      if (Math.random() < 1 / (1 + act.mercs.length)) {
        const hit = Math.random() < this.hitChance(mr.accRoll, ps.defRoll)
        const dmg = hit ? rand(0, m.maxHit) : 0
        this.s.hp -= dmg
        this.emit('hit', { who: 'monster', dmg })
        this.autoEat()
        if (this.s.hp <= 0) return this.die(m)
      } else this.emit('hit', { who: 'monster-merc', dmg: 0 })
    }
  },

  killMonster(m) {
    const act = this.s.activity
    const st = this.s
    st.stats.kills++
    st.killsBy[m.id] = (st.killsBy[m.id] || 0) + 1
    this.countBeast(m.id)
    this.festivalKill(m)
    act.runKills++
    if (this.tracker) this.tracker.kills[m.id] = (this.tracker.kills[m.id] || 0) + 1
    const gold = this.addGold(rand(m.gold[0], m.gold[1]), true)
    const loot = []
    const lootMult = 1 + this.mod('loot')
    m.drops.forEach(d => {
      if (Math.random() < Math.min(1, d.chance * lootMult)) {
        const n = rand(d.qty[0], d.qty[1])
        this.addItem(d.item, n)
        this.recordDrop(m.id, d.item)
        loot.push({ item: d.item, n })
        if (d.chance < 0.05) {
          if (ITEMS[d.item].rare) st.stats.rares++
          this.log(ITEMS[d.item].icon, 'log.drop', { monster: '@monster:' + m.id, item: '@item:' + d.item })
          this.emit('rare', { item: d.item, n })
        }
      }
    })
    const task = st.slayer.task
    if (task && task.monster === m.id) {
      this.addXp('slayer', m.hp)
      task.left--
      if (task.left <= 0) this.completeSlayerTask()
    }
    if (act.kind === 'tower') {
      const tokens = (1 + Math.floor(m.floor / 10)) * (m.floor % 10 === 0 ? 3 : 1)
      st.tower.tokens += tokens
      if (this.tracker) this.tracker.tokens = (this.tracker.tokens || 0) + tokens
      if (m.floor > st.tower.best && m.floor % 10 === 0) this.log('stone-tower', 'log.towerFloor', { floor: m.floor })
      st.tower.best = Math.max(st.tower.best, m.floor)
      act.floor++
      act.respawn = 1
    } else if (act.kind === 'dungeon') {
      const dg = DUNGEONS.find(d => d.id === act.target)
      act.room++
      act.respawn = 1
      if (act.room > dg.rooms.length) {
        const got = {}
        dg.chest.forEach(c => { if (Math.random() < Math.min(1, c.chance * lootMult)) { const n = rand(c.qty[0], c.qty[1]); this.addItem(c.item, n); got[c.item] = n } })
        st.dungeonsBy[dg.id] = (st.dungeonsBy[dg.id] || 0) + 1
        st.stats.dungeons = (st.stats.dungeons || 0) + 1
        act.clears++
        act.room = 0
        act.respawn = 3
        if (st.dungeonsBy[dg.id] === 1) this.log(dg.icon, 'log.dungeonFirst', { dungeon: '@dungeon:' + dg.id })
        this.emit('dungeon', { dg, got })
      }
    } else act.respawn = m.boss ? m.respawn : RESPAWN_TIME
    if (m.boss && !m.dungeon && st.killsBy[m.id] === 1) this.log('trophy', 'log.bossFirst', { monster: '@monster:' + m.id })
    if (m.boss) this.rollMonsterPet(m.id)
    this.emit('kill', { monster: m, gold, loot })
  },

  die(m) {
    const act = this.s.activity
    this.s.stats.deaths++
    this.s.hp = this.maxHp()
    const lost = Math.floor(this.s.gold * this.diff().death)
    if (lost > 0) this.s.gold -= lost
    this.log('broken-skull', lost > 0 ? 'log.deathGold' : 'log.death', { monster: '@monster:' + m.id, gold: lost })
    if (act.kind === 'dungeon') this.stop(msg('msg.diedDungeon', { dungeon: '@dungeon:' + act.target, room: act.room + 1, gold: lost }))
    else if (act.kind === 'tower') this.stop(msg('msg.diedTower', { floor: act.floor, best: this.s.tower.best, gold: lost }))
    else this.stop(msg('msg.died', { monster: '@monster:' + m.id, gold: lost }))
    this.emit('death', m)
  },

  /* ================= slayer ================= */
  slayerCandidates() {
    const cl = this.combatLevel(), sl = this.level('slayer')
    return Object.values(MONSTERS).filter(m => {
      const area = AREAS.find(a => a.id === m.area)
      return this.areaUnlocked(area) && monsterLevel(m) <= cl + 8 && (!m.slayer || sl >= m.slayer)
    })
  },
  newSlayerTask() {
    if (this.s.slayer.task) return
    const pool = this.slayerCandidates()
    const m = pool[Math.floor(Math.pow(Math.random(), 0.7) * pool.length)]
    const total = rand(12, 30) + Math.floor(this.level('slayer') / 4)
    this.s.slayer.task = { monster: m.id, left: total, total }
  },
  completeSlayerTask() {
    const sl = this.s.slayer
    const m = MONSTERS[sl.task.monster]
    sl.streak++
    const pts = (4 + Math.floor(monsterLevel(m) / 8)) * (sl.streak % 10 === 0 ? 5 : 1)
    sl.points += pts
    sl.completed++
    const gold = this.addGold(sl.task.total * monsterLevel(m), true)
    this.log('death-skull', 'log.slayerTask', { monster: '@monster:' + m.id })
    this.toast('death-skull', 'msg.slayerDone', { pts, gold }, 'success')
    sl.task = null
    this.rollPet(src => src.slayer)
  },
  buySlayer(id) {
    const it = SLAYER_SHOP.find(x => x.id === id)
    const sl = this.s.slayer
    if (!it || sl.points < it.cost) return false
    if (id === 'skip') { if (!sl.task) return false; sl.task = null }
    sl.points -= it.cost
    if (it.item) this.addItem(it.item, 1)
    if (it.items) Object.entries(it.items).forEach(([k, q]) => this.addItem(k, q))
    return true
  },

  /* ================= tower ================= */
  buyTower(id) {
    const it = TOWER_SHOP.find(x => x.id === id)
    if (!it || this.s.tower.tokens < it.cost) return false
    this.s.tower.tokens -= it.cost
    if (it.item) this.addItem(it.item, 1)
    if (it.items) Object.entries(it.items).forEach(([k, q]) => this.addItem(k, q))
    return true
  },

  /* ================= quests ================= */
  questDone(id) { return this.s.quests[id]?.status === 'done' },
  questsDone() { return Object.values(this.s.quests).filter(q => q.status === 'done').length },
  questPoints() { return QUESTS.filter(q => this.questDone(q.id)).reduce((s, q) => s + (q.reward.qp || 0), 0) },
  questReqMet(q) { return (q.req.quests || []).every(id => this.questDone(id)) && this.meetsReq(q.req.levels) },
  questStatus(q) {
    const st = this.s.quests[q.id]?.status
    if (st) return st
    return this.questReqMet(q) ? 'available' : 'locked'
  },
  startQuest(id) {
    const q = QUESTS.find(x => x.id === id)
    if (!q || this.questStatus(q) !== 'available') return
    const base = {}
    q.obj.forEach(o => { if (o.type === 'kill') base[o.monster] = this.s.killsBy[o.monster] || 0 })
    this.s.quests[id] = { status: 'active', base, slayerBase: this.s.slayer.completed }
  },
  objProgress(q, o) {
    const qs = this.s.quests[q.id]
    switch (o.type) {
      case 'item': return { cur: Math.min(this.qty(o.item), o.qty), max: o.qty }
      case 'kill': return { cur: Math.min((this.s.killsBy[o.monster] || 0) - (qs?.base?.[o.monster] || 0), o.qty), max: o.qty }
      case 'level': return { cur: Math.min(this.level(o.skill), o.lvl), max: o.lvl }
      case 'tower': return { cur: Math.min(this.s.tower.best, o.floor), max: o.floor }
      case 'slayer': return { cur: Math.min(this.s.slayer.completed - (qs?.slayerBase || 0), o.tasks), max: o.tasks }
    }
    return { cur: 0, max: 1 }
  },
  questReady(q) { return this.s.quests[q.id]?.status === 'active' && q.obj.every(o => { const p = this.objProgress(q, o); return p.cur >= p.max }) },
  completeQuest(id) {
    const q = QUESTS.find(x => x.id === id)
    if (!q || !this.questReady(q)) return false
    q.obj.forEach(o => { if (o.type === 'item') this.removeItem(o.item, o.qty) })
    const r = q.reward
    if (r.gold) this.addGold(r.gold)
    Object.entries(r.xp || {}).forEach(([k, v]) => this.addXp(k, v, false))
    Object.entries(r.items || {}).forEach(([k, v]) => this.addItem(k, v))
    if (r.slayerPoints) this.s.slayer.points += r.slayerPoints
    this.s.quests[id].status = 'done'
    this.log(q.icon, 'log.quest', { quest: '@quest:' + q.id })
    this.emit('quest', q)
    return true
  },

  /* ================= achievements ================= */
  checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
      if (this.s.achievements[a.id]) return
      let ok = false
      try { ok = a.check(this) } catch { ok = false }
      if (ok) {
        this.s.achievements[a.id] = Date.now()
        if (a.gold) this.addGold(a.gold)
        this.log(a.icon, 'log.achievement', { ach: '@ach:' + a.id })
        this.emit('achievement', a)
      }
    })
  },

  /* ================= home ================= */
  roomCost(r) { return r.cost(this.room(r.id)) },
  canBuild(r) {
    if (this.room(r.id) >= r.max) return false
    const c = this.roomCost(r)
    return this.s.gold >= c.gold && this.hasItems(c.items)
  },
  build(id) {
    const r = ROOMS.find(x => x.id === id)
    if (!r || !this.canBuild(r)) return false
    const c = this.roomCost(r)
    this.s.gold -= c.gold
    Object.entries(c.items).forEach(([k, q]) => q > 0 && this.removeItem(k, q))
    this.s.rooms[id] = this.room(id) + 1
    this.ensurePlots()
    this.log(r.icon, 'log.room', { room: '@room:' + r.id, level: this.room(id) })
    return true
  },

  /* ================= church ================= */
  activeBlessings() { return Object.values(this.s.blessings).filter(v => v > 0).length },
  bless(id) {
    const b = BLESSINGS.find(x => x.id === id)
    if (!b || this.level('prayer') < b.lvl || this.s.gold < b.cost) return false
    if (!this.blessed(id) && this.activeBlessings() >= this.maxBlessings()) return false
    this.s.gold -= b.cost
    this.s.blessings[id] = this.blessingDuration()
    return true
  },

  /* ================= prestige ================= */
  canPrestige(skill) { return this.level(skill) >= MAX_LEVEL },
  doPrestige(skill) {
    if (!this.canPrestige(skill)) return false
    this.s.skills[skill].xp = skill === 'hitpoints' ? XP_TABLE[10] : 0
    this.s.prestige[skill] = this.prestigeOf(skill) + 1
    if (skill === 'hitpoints') this.s.hp = Math.min(this.s.hp, this.maxHp())
    const act = this.s.activity
    if (act && act.type === 'skill' && act.skill === skill) this.stop()
    this.log('sparkles', 'log.prestige', { n: this.prestigeOf(skill), skill: '@skill:' + skill })
    return true
  },

  /* ================= main loop ================= */
  update(dt) {
    const st = this.s
    st.stats.playTime += dt
    for (const k in st.blessings) { if (st.blessings[k] > 0) st.blessings[k] = Math.max(0, st.blessings[k] - dt) }
    if (st.buffs.potion) { st.buffs.potion.t -= dt; if (st.buffs.potion.t <= 0) st.buffs.potion = null }
    if (st.buffs.elixir > 0) st.buffs.elixir = Math.max(0, st.buffs.elixir - dt)
    this.updateFarm(dt)
    this.updateSystems(dt)
    this.ensureTasks()

    const act = st.activity
    if (act && act.type === 'skill') this.updateSkill(dt)
    else if (act && act.type === 'combat') {
      this.autoDrink()
      let rem = dt
      while (rem > 0 && st.activity && st.activity.type === 'combat') {
        const step = Math.min(rem, 0.1)
        this.updateCombat(step)
        rem -= step
      }
    }
    const fighting = st.activity && st.activity.type === 'combat'
    const every = fighting ? HP_REGEN_COMBAT : HP_REGEN
    if (st.hp > 0 && st.hp < this.maxHp()) {
      st.hpRegen += dt
      while (st.hpRegen >= every && st.hp < this.maxHp()) { st.hpRegen -= every; st.hp++ }
    } else st.hpRegen = 0
    if (st.hp > this.maxHp()) st.hp = this.maxHp()
    st.lastTick = Date.now()
  },

  // Fast-forward elapsed time on the raw (non-reactive) state and return a summary
  simulate(seconds) {
    const cap = this.offlineCapHours() * 3600
    const total = Math.min(seconds, cap)
    const raw = toRaw(state)
    const activity = raw.activity ? JSON.parse(JSON.stringify(raw.activity)) : null
    this.tracker = { seconds: total, capped: seconds > cap, xp: {}, items: {}, levels: {}, kills: {}, gold: 0, eaten: 0, tokens: 0, heroLevel: 0, stopReason: null, activity }
    this.s = raw
    try {
      const step = 0.5
      for (let time = 0; time < total; time += step) {
        this.update(Math.min(step, total - time))
        const idle = !raw.activity && raw.hp >= this.maxHp() && !this.farmBusy() && !raw.buffs.potion && raw.buffs.elixir <= 0
          && Object.values(raw.blessings).every(v => v <= 0) && !this.systemsBusy()
        if (idle) break
      }
    } finally {
      this.s = state
    }
    const summary = this.tracker
    this.tracker = null
    const snap = JSON.parse(JSON.stringify(raw))
    for (const k of Object.keys(snap)) state[k] = snap[k]
    this.emit('activity')
    return summary
  },
}

Object.assign(G, systems, meta, ascension, collection)

export { SKILLS, ITEMS }
