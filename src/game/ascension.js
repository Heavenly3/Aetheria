/* =========================================================
   ASCENSION — start the whole hero over for Aether shards
   and spend them on permanent upgrades.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { XP_TABLE } from './data/skills.js'
import { BOSSES } from './data/combat.js'
import { UPGRADES, UPGRADE_MAP, ASCEND_MIN_TOTAL } from './data/ascension.js'

// Skills that an "Ancestry" head start raises; combat skills are earned again in battle
const START_SKILLS = ['mining', 'woodcutting', 'fishing', 'farming', 'thieving', 'smithing', 'cooking', 'firemaking', 'fletching', 'crafting', 'herblore', 'runecrafting', 'agility', 'prayer']

// What survives an ascension; everything else goes back to a fresh character
const KEPT = ['created', 'name', 'role', 'avatar', 'tint', 'difficulty', 'pets', 'achievements', 'stats', 'history', 'settings', 'daily', 'ascension', 'bestiary', 'cosmetics', 'festival', 'omens', 'companions', 'weekly', 'relicForge', 'journal', 'log']

export const ascensionState = () => ({
  ascension: { shards: 0, total: 0, count: 0, upgrades: {} },
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

  canAscend() { return this.totalLevel() >= ASCEND_MIN_TOTAL },
  // Shards grow with total level, hero level, quest points and bosses defeated this life
  shardsForAscension() {
    if (!this.canAscend()) return 0
    const bosses = BOSSES.filter(b => (this.s.killsBy[b.id] || 0) > 0).length
    return Math.floor(Math.pow(this.totalLevel() / 100, 1.6) + this.heroLevel() / 4 + this.questPoints() / 4 + bosses * 2)
  },
  ascend() {
    if (!this.canAscend()) return 0
    const gained = this.shardsForAscension()
    const tasks = this.taskSnapshot()
    const kept = {}
    for (const k of KEPT) kept[k] = JSON.parse(JSON.stringify(this.s[k] ?? null))
    const fresh = this.freshState({ name: kept.name, role: kept.role, avatar: kept.avatar, tint: kept.tint, difficulty: kept.difficulty })
    for (const k of Object.keys(fresh)) this.s[k] = k in kept && kept[k] !== null ? kept[k] : fresh[k]
    const asc = this.s.ascension
    asc.shards += gained
    asc.total += gained
    asc.count++
    this.setupCharacter()
    const lvl = Math.floor(this.ascensionMods('startSkills'))
    if (lvl > 1) START_SKILLS.forEach(sk => { this.s.skills[sk].xp = Math.max(this.s.skills[sk].xp, XP_TABLE[lvl]) })
    this.s.gold += Math.floor(this.ascensionMods('startGold'))
    this.s.hp = this.maxHp()
    this.restoreTasks(tasks)
    this.log('ankh', 'log.ascend', { n: asc.count, shards: gained })
    this.emit('ascend', { count: asc.count, shards: gained })
    this.save()
    return gained
  },
}
