import { describe, it, expect, beforeEach, vi } from 'vitest'
import { G, state, newHero, setLevel, fixRandom } from './helpers.js'
import { dayKey } from '../src/game/systems.js'

const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d) }
// Push every counter a task reads past its target
function complete(t) {
  const add = { xp: () => (state.skills[t.skill].xp += t.target), actions: () => (state.stats.actions += t.target), kills: () => (state.stats.kills += t.target),
    gold: () => (state.stats.goldEarned += t.target), harvest: () => (state.stats.harvests = (state.stats.harvests || 0) + t.target),
    dungeon: () => (state.stats.dungeons = (state.stats.dungeons || 0) + t.target), orders: () => (state.stats.orders = (state.stats.orders || 0) + t.target),
    slayer: () => (state.slayer.completed += t.target) }
  add[t.type]()
}

describe('pets', () => {
  beforeEach(() => newHero())

  it('arrive as a single egg on a lucky roll', () => {
    fixRandom(0)
    const spy = vi.fn()
    const off = G.on('petEgg', spy)
    G.rollSkillPet('mining', 3)
    G.rollSkillPet('mining', 3)
    off()
    expect(G.hasPet('rock_golem')).toBe(false)
    expect(G.hasEgg('rock_golem')).toBe(true)
    expect(state.companions.eggs).toHaveLength(1)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('never drop on an unlucky roll', () => {
    fixRandom(0.999)
    G.rollMonsterPet('goblin_king')
    expect(G.petCount()).toBe(0)
  })

  it('add their bonus to the modifiers', () => {
    const before = G.mod('gold')
    state.pets.goblin_whelp = Date.now()
    expect(G.mod('gold')).toBeCloseTo(before + 0.03)
  })
})

describe('enchanting', () => {
  beforeEach(() => {
    newHero()
    state.gold = 1e9
    for (const k of ['nature_rune', 'death_rune', 'blood_rune', 'void_essence', 'starlight_shard']) G.addItem(k, 1e6)
  })

  it('raises the slot level and scales item stats', () => {
    fixRandom(0)
    const atk = G.bonuses().atk
    expect(G.enchant('weapon')).toBe('success')
    expect(G.enchantLevel('weapon')).toBe(1)
    state.enchant.weapon = 10
    expect(G.bonuses().atk).toBe(Math.round(atk * 1.8))
    expect(G.enchant('weapon')).toBeNull()
  })

  it('drops a level on a risky failure unless protected', () => {
    fixRandom(0.999)
    state.enchant.body = 3
    expect(G.enchant('body')).toBe('fail')
    expect(G.enchantLevel('body')).toBe(3)
    state.enchant.body = 7
    expect(G.enchant('body')).toBe('drop')
    expect(G.enchantLevel('body')).toBe(6)
    const shards = G.qty('starlight_shard')
    expect(G.enchant('body', true)).toBe('fail')
    expect(G.enchantLevel('body')).toBe(6)
    expect(G.qty('starlight_shard')).toBe(shards - 1)
  })

  it('charges gold and materials', () => {
    fixRandom(0)
    const gold = state.gold
    const runes = G.qty('nature_rune')
    G.enchant('head')
    expect(state.gold).toBeLessThan(gold)
    expect(G.qty('nature_rune')).toBeLessThan(runes)
  })
})

describe('daily and weekly tasks', () => {
  beforeEach(() => { newHero(); G.ensureTasks() })

  it('creates the same tasks for the same day', () => {
    const first = JSON.stringify(state.daily.tasks.map(t => [t.type, t.skill, t.target]))
    state.daily.day = ''
    G.ensureTasks()
    expect(JSON.stringify(state.daily.tasks.map(t => [t.type, t.skill, t.target]))).toBe(first)
    expect(state.daily.tasks).toHaveLength(3)
    expect(state.daily.weekly).toHaveLength(3)
  })

  it('pays a reward once a task is done', () => {
    const t = state.daily.tasks[0]
    expect(G.claimTask(0)).toBeNull()
    complete(t)
    const gold = state.gold
    expect(G.claimTask(0)).toMatchObject({ tokens: 1 })
    expect(state.gold).toBeGreaterThan(gold)
    expect(G.claimTask(0)).toBeNull()
  })

  it('builds a streak day after day and breaks it after a gap', () => {
    state.daily.tasks.forEach(complete)
    state.daily.tasks.forEach((_, i) => G.claimTask(i))
    expect(G.currentStreak()).toBe(1)
    state.daily.lastDone = yesterday()
    state.daily.day = ''
    G.ensureTasks()
    state.daily.tasks.forEach(complete)
    state.daily.tasks.forEach((_, i) => G.claimTask(i))
    expect(state.daily.streak).toBe(2)
    expect(G.streakMult()).toBeCloseTo(1.2)
    state.daily.lastDone = '2000-01-01'
    expect(G.currentStreak()).toBe(0)
  })
})

describe('ascension', () => {
  beforeEach(() => newHero({ name: 'Phoenix', role: 'mage' }))

  it('needs total level 500', () => {
    expect(G.canAscend()).toBe(false)
    expect(G.ascend()).toBe(0)
  })

  it('resets the hero, keeps the collection and grants shards', () => {
    for (const sk of Object.keys(state.skills)) setLevel(sk, 40)
    state.pets.beaver = 1
    state.achievements.total_50 = 1
    state.enchant.weapon = 4
    const shards = G.shardsForAscension()
    expect(shards).toBeGreaterThan(0)
    expect(G.ascend()).toBe(shards)
    expect(state.ascension).toMatchObject({ shards, total: shards, count: 1 })
    expect(G.level('mining')).toBe(1)
    expect(state.enchant).toEqual({})
    expect(state).toMatchObject({ name: 'Phoenix', role: 'mage' })
    expect(state.pets.beaver).toBe(1)
    expect(state.achievements.total_50).toBe(1)
  })

  it('upgrades follow the tree and can be refunded', () => {
    state.ascension.shards = 100
    expect(G.buyUpgrade('memory')).toBe(false) // needs echoes first
    expect(G.buyUpgrade('echoes')).toBe(true)
    expect(G.buyUpgrade('memory')).toBe(true)
    expect(G.ascensionMods('xp')).toBeCloseTo(0.05)
    const spent = 100 - state.ascension.shards
    expect(G.resetUpgrades()).toBe(spent)
    expect(state.ascension.shards).toBe(100)
  })

  it('applies head-start upgrades on the next life', () => {
    state.ascension.upgrades = { echoes: 1, ancestry: 2, gilded: 1, inheritance: 1 }
    for (const sk of Object.keys(state.skills)) setLevel(sk, 40)
    G.ascend()
    expect(G.level('mining')).toBe(10)
    expect(G.level('attack')).toBe(1)
    expect(state.gold).toBeGreaterThanOrEqual(2500)
  })
})
