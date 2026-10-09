import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel, fixRandom } from './helpers.js'
import { MONSTERS, monsterLevel } from '../src/game/data/combat.js'
import { TASK_KINDS, REROLL_COST, BLOCK_COST, STREAK_CHEST_EVERY, SUPERIOR_CHANCE } from '../src/game/data/slayer.js'
import { ELITE_IDS } from '../src/game/data/fighting.js'

function strongHero() {
  newHero()
  for (const s of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(s, 60)
  setLevel('slayer', 30)
}

describe('slayer', () => {
  it('offers an easy, a standard and a hard task', () => {
    strongHero()
    const offers = G.slayerOffers()
    expect(offers.map(o => o.kind)).toEqual(Object.keys(TASK_KINDS))
    const lvl = o => monsterLevel(MONSTERS[o.monster])
    expect(lvl(offers[2])).toBeGreaterThanOrEqual(lvl(offers[0]))
    expect(offers[2].total).toBeGreaterThan(offers[0].total)
    // The same offers stay until one is taken
    expect(G.slayerOffers()).toEqual(offers)
    expect(G.takeOffer(2)).toBe(true)
    expect(state.slayer.task).toMatchObject({ monster: offers[2].monster, kind: 'hard' })
    expect(G.slayerOffers()).toEqual([])
  })

  it('pays more for harder tasks', () => {
    strongHero()
    const m = Object.keys(MONSTERS)[5]
    const easy = G.slayerReward({ monster: m, kind: 'easy', total: 20 })
    const hard = G.slayerReward({ monster: m, kind: 'hard', total: 20 })
    expect(hard.pts).toBeGreaterThan(easy.pts)
    expect(hard.gold).toBeGreaterThan(easy.gold)
    expect(hard.xp).toBeGreaterThan(easy.xp)
  })

  it('finishes a task with points, gold and Slayer XP', () => {
    strongHero()
    G.takeOffer(0)
    const task = state.slayer.task
    const r = G.slayerReward(task)
    const xp = state.skills.slayer.xp, gold = state.gold
    task.left = 0
    G.completeSlayerTask()
    expect(state.slayer.task).toBe(null)
    expect(state.slayer.points).toBe(r.pts)
    expect(state.gold).toBeGreaterThan(gold)
    expect(state.skills.slayer.xp).toBeGreaterThan(xp)
  })

  it('gives a gem chest every so many tasks in a row', () => {
    strongHero()
    state.slayer.streak = STREAK_CHEST_EVERY - 1
    G.takeOffer(1)
    G.completeSlayerTask()
    expect(G.qty('gem_chest')).toBe(1)
  })

  it('rerolls offers and blocks creatures for points', () => {
    strongHero()
    G.slayerOffers()
    expect(G.rerollOffers()).toBe(false)
    state.slayer.points = REROLL_COST + BLOCK_COST
    expect(G.rerollOffers()).toBe(true)
    expect(state.slayer.points).toBe(BLOCK_COST)
    const id = G.slayerOffers()[0].monster
    expect(G.blockMonster(id)).toBe(true)
    expect(G.slayerCandidates().some(m => m.id === id)).toBe(false)
    expect(G.slayerOffers().some(o => o.monster === id)).toBe(false)
    G.unblockMonster(id)
    expect(G.slayerCandidates().some(m => m.id === id)).toBe(true)
  })

  it('unlocks perks once', () => {
    strongHero()
    state.slayer.points = 1000
    const before = G.slayerReward({ monster: 'goblin', kind: 'easy', total: 20 }).gold
    expect(G.buyPerk('bounty')).toBe(true)
    expect(G.buyPerk('bounty')).toBe(false)
    expect(G.slayerReward({ monster: 'goblin', kind: 'easy', total: 20 }).gold).toBeGreaterThan(before)
    expect(G.superiorChance()).toBe(SUPERIOR_CHANCE)
    G.buyPerk('superior')
    expect(G.superiorChance()).toBe(SUPERIOR_CHANCE * 2)
  })

  it('brings Superiors only for the task, with sigils', () => {
    strongHero()
    expect(ELITE_IDS).not.toContain('superior')
    G.takeOffer(0)
    const target = state.slayer.task.monster
    fixRandom(0)
    expect(G.rollSuperior({ kind: 'area', target })).toBe(true)
    expect(G.rollSuperior({ kind: 'area', target: 'chicken' === target ? 'cow' : 'chicken' })).toBe(false)
    expect(G.rollSuperior({ kind: 'dungeon', target })).toBe(false)
    const n = G.superiorLoot(MONSTERS[target])
    expect(G.qty('slayer_sigil')).toBe(n)
  })

  it('makes the imbued helm stronger against the task', () => {
    strongHero()
    G.addItem('slayer_helm', 1)
    G.equip('slayer_helm')
    expect(G.taskHelmBonus()).toBe(0.15)
    setLevel('defense', 40); setLevel('slayer', 50)
    G.addItem('slayer_helm_i', 1)
    expect(G.equip('slayer_helm_i')).toBe(true)
    expect(G.taskHelmBonus()).toBe(0.25)
  })
})
