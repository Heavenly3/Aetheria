/* =========================================================
   ASCENSION — start the whole hero over for Aether shards
   and spend them on permanent upgrades.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { SKILLS, XP_TABLE } from './data/skills.js'
import { BOSSES } from './data/combat.js'
import { UPGRADES, UPGRADE_MAP, ASCEND_MIN_TOTAL } from './data/ascension.js'
import { TRIALS, TRIAL_MAP, TRIAL_SHARDS } from './data/trials.js'

// Skills that an "Ancestry" head start raises; combat skills are earned again in battle
const START_SKILLS = ['mining', 'woodcutting', 'fishing', 'farming', 'thieving', 'smithing', 'cooking', 'firemaking', 'fletching', 'crafting', 'herblore', 'runecrafting', 'agility', 'prayer']

// What survives an ascension; everything else goes back to a fresh character
const KEPT = ['created', 'name', 'role', 'avatar', 'tint', 'difficulty', 'pets', 'achievements', 'stats', 'history', 'settings', 'daily', 'ascension', 'bestiary', 'cosmetics', 'festival', 'omens', 'companions', 'weekly', 'relicForge', 'journal', 'abilities', 'guilds', 'codex', 'church', 'thief', 'log', 'legacy', 'routines', 'unlocks', 'records', 'mythics', 'mythicStreak']

// How many finished lives the record keeps, newest last
export const LIVES_KEPT = 100

export const ascensionState = () => ({
  // trial: the rule this life is lived under · trials: how many times each was completed
  // lives: a summary of every life finished · lifeAt: when this life began (time and play time)
  ascension: { shards: 0, total: 0, count: 0, upgrades: {}, trial: null, trials: {}, lives: [], lifeAt: null },
})

export const ascension = {
  upgradeRank(id) { return this.s.ascension?.upgrades[id] || 0 },
  ascensionMods(key) {
    let v = 0
    const ups = this.s.ascension?.upgrades
    if (!ups) return 0
    for (const id in ups) { const u = UPGRADE_MAP[id]; if (u?.mods[key]) v += u.mods[key] * ups[id] }
    return v
  },
  upgradeCost(u) { return u.cost * (this.upgradeRank(u.id) + 1) },
  upgradeUnlocked(u) { return !u.req || this.upgradeRank(u.req) > 0 },
  canBuyUpgrade(u) {
    return this.upgradeRank(u.id) < u.max && this.upgradeUnlocked(u) && this.s.ascension.shards >= this.upgradeCost(u)
  },
  buyUpgrade(id) {
    const u = UPGRADE_MAP[id]
    if (!u || !this.canBuyUpgrade(u)) return false
    this.s.ascension.shards -= this.upgradeCost(u)
    this.s.ascension.upgrades[id] = this.upgradeRank(id) + 1
    return true
  },
  // Refund every shard spent so the tree can be planned again
  resetUpgrades() {
    const asc = this.s.ascension
    let refund = 0
    for (const u of UPGRADES) for (let r = 1; r <= this.upgradeRank(u.id); r++) refund += u.cost * r
    asc.upgrades = {}
    asc.shards += refund
    return refund
  },

  /* ---------------- trials ---------------- */
  trial() { return this.s.ascension?.trial || null },
  underTrial(id) { return this.trial() === id },
  trialDone(id) { return (this.s.ascension?.trials?.[id] || 0) > 0 },
  trialsDone() { return TRIALS.filter(t => this.trialDone(t.id)).length },
  trialMods(key) { let v = 0; for (const t of TRIALS) if (this.trialDone(t.id)) v += t.reward[key] || 0; return v },
  // Giving up a trial keeps the life going without its rule (and without its reward)
  giveUpTrial() { if (this.s.ascension.trial) { this.s.ascension.trial = null; return true } return false },

  canAscend() { return this.totalLevel() >= ASCEND_MIN_TOTAL },
  // What this life has come to so far. Its start is unknown for a life begun before the record
  // existed (a save that had already ascended), so its length is left out
  lifeSummary() {
    const asc = this.s.ascension
    const start = asc.lifeAt || (asc.count ? null : { t: this.s.created, play: 0 })
    const best = Object.keys(SKILLS).reduce((a, k) => (this.s.skills[k].xp > this.s.skills[a].xp ? k : a))
    return {
      n: asc.count + 1,
      start: start?.t ?? null,
      played: start ? Math.max(0, (this.s.stats.playTime || 0) - start.play) : null,
      total: this.totalLevel(), hero: this.heroLevel(), combat: this.combatLevel(),
      bosses: BOSSES.filter(b => (this.s.killsBy[b.id] || 0) > 0).length,
      kills: Object.values(this.s.killsBy || {}).reduce((sum, n) => sum + n, 0),
      best: { skill: best, lvl: this.level(best) },
      finds: start ? Object.keys(this.s.mythics || {}).filter(id => this.s.mythics[id].first >= start.t) : [],
      trial: this.trial(),
    }
  },
  // Shards grow with total level, hero level, quest points and bosses defeated this life
  shardsForAscension() {
    if (!this.canAscend()) return 0
    const bosses = BOSSES.filter(b => (this.s.killsBy[b.id] || 0) > 0).length
    const base = Math.floor(Math.pow(this.totalLevel() / 100, 1.6) + this.heroLevel() / 4 + this.questPoints() / 4 + bosses * 2)
    // Living a whole life under a trial pays more
    return this.trial() ? Math.floor(base * TRIAL_SHARDS) : base
  },
  // next: the trial to live the new life under, or none
  ascend(next = null) {
    if (!this.canAscend()) return 0
    const gained = this.shardsForAscension()
    const completed = this.trial()
    const life = { ...this.lifeSummary(), end: Date.now(), shards: gained }
    const tasks = this.taskSnapshot()
    const guildTasks = this.guildSnapshot()
    const kept = {}
    for (const k of KEPT) kept[k] = JSON.parse(JSON.stringify(this.s[k] ?? null))
    const myths = this.mythicsHeld()
    const fresh = this.freshState({ name: kept.name, role: kept.role, avatar: kept.avatar, tint: kept.tint, difficulty: kept.difficulty })
    for (const k of Object.keys(fresh)) this.s[k] = k in kept && kept[k] !== null ? kept[k] : fresh[k]
    const asc = this.s.ascension
    asc.shards += gained
    asc.total += gained
    asc.count++
    asc.trials ||= {}
    if (completed) {
      asc.trials[completed] = (asc.trials[completed] || 0) + 1
      this.log(TRIAL_MAP[completed].icon, 'log.trialDone', { trial: '@trial:' + completed })
    }
    asc.trial = TRIAL_MAP[next] ? next : null
    asc.lives = [...(asc.lives || []), life].slice(-LIVES_KEPT)
    asc.lifeAt = { t: life.end, play: this.s.stats.playTime || 0 }
    this.setupCharacter()
    this.returnMythics(myths)
    const lvl = Math.floor(this.ascensionMods('startSkills'))
    if (lvl > 1) START_SKILLS.forEach(sk => { this.s.skills[sk].xp = Math.max(this.s.skills[sk].xp, XP_TABLE[lvl]) })
    this.s.gold += Math.floor(this.ascensionMods('startGold'))
    // A life of magic only starts with magic chosen
    if (asc.trial === 'arcane') this.setStyleType('magic')
    this.s.hp = this.maxHp()
    this.restoreTasks(tasks)
    this.restoreGuildTasks(guildTasks)
    this.log('ankh', 'log.ascend', { n: asc.count, shards: gained })
    this.emit('ascend', { count: asc.count, shards: gained, completed })
    this.save()
    return gained
  },
}
