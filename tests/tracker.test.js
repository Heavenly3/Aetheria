import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { trackedGoals, whereToGet, whereToKill, whereToTrain, whereToHunt } from '../src/ui/tracker.js'

describe('the tracker', () => {
  it('lists the open objectives of active quests and leads to where each is done', () => {
    newHero()
    G.startQuest('first_steps')
    G.startQuest('goblin_trouble')
    const goals = trackedGoals()
    const ore = goals.find(g => g.item === 'copper_ore')
    expect(ore.go).toEqual({ to: '/skill/mining', focus: 'action:copper_ore' })
    expect(ore.max).toBe(10)
    expect(goals.find(g => g.text.includes('Goblin')).go).toEqual({ to: { path: '/combat', query: { tab: 'areas' } }, focus: 'monster:goblin' })
  })

  it('turns a finished quest into one line to hand it in', () => {
    newHero()
    G.startQuest('first_steps')
    G.addItem('copper_ore', 10)
    G.addItem('tin_ore', 10)
    const goals = trackedGoals().filter(g => g.source === 'quest')
    expect(goals).toHaveLength(1)
    expect(goals[0]).toMatchObject({ ready: true, go: { to: '/quests', focus: 'quest:first_steps' } })
  })

  it('finds how to get an item: an action the hero can do, with what is missing for it', () => {
    newHero()
    setLevel('smithing', 20)
    // Too low to mine iron, and the creatures that drop it are too strong: train Mining up to it
    expect(whereToGet('iron_ore')).toMatchObject({ to: '/skill/mining', level: { skill: 'mining', lvl: 15 } })
    // Strong enough for them: the creature
    for (const k of ['attack', 'strength', 'defense', 'hitpoints']) setLevel(k, 30)
    expect(whereToGet('iron_ore').focus).toMatch(/^monster:/)
    setLevel('mining', 20)
    const bar = whereToGet('iron_bar')
    expect(bar).toMatchObject({ to: '/skill/smithing', focus: 'action:iron_bar' })
    expect(bar.need.map(n => n.item)).toContain('iron_ore')
    expect(bar.need.find(n => n.item === 'iron_ore').go.focus).toBe('action:iron_ore')
    // Not makeable by the hero: a creature that drops it, or the shop
    expect(whereToGet('feathers').focus).toMatch(/^(monster|shop):/)
    expect(whereToGet('potato').focus).toBe('crop:potato')
  })

  it('knows the tab of every kind of foe and the best action to train', () => {
    newHero()
    expect(whereToKill('goblin_king').to.query.tab).toBe('bosses')
    expect(whereToKill('naga')).toMatchObject({ focus: 'dungeon:serpent_temple' })
    expect(whereToTrain('mining')).toMatchObject({ to: '/skill/mining', focus: expect.stringMatching(/^action:/) })
    expect(whereToHunt().focus).toMatch(/^monster:/)
  })

  it('includes the slayer task, tavern orders and daily tasks', () => {
    newHero()
    state.slayer.task = { monster: 'cow', kind: 'easy', left: 8, total: 10 }
    state.tavern.orders = [{ item: 'logs', qty: 5, done: false }]
    const goals = trackedGoals()
    expect(goals.find(g => g.source === 'slayer')).toMatchObject({ cur: 2, max: 10, go: { focus: 'monster:cow' } })
    expect(goals.find(g => g.source === 'order').go.focus).toBe('action:logs')
  })

  it('stays quick enough to work out on every change', () => {
    newHero()
    for (const q of ['first_steps', 'goblin_trouble', 'cook_assistant']) G.startQuest(q)
    const t0 = performance.now()
    for (let i = 0; i < 50; i++) trackedGoals()
    expect((performance.now() - t0) / 50).toBeLessThan(5)
  })
})
