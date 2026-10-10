import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'

describe('daily tasks for the newer systems', () => {
  it('are only offered once the hero can do them', () => {
    newHero()
    const types = () => new Set(Array.from({ length: 60 }, (_, i) => G.makeTasks('t' + i, 10, 1).map(t => t.type)).flat())
    expect(types().has('heists')).toBe(false)
    expect(types().has('contracts')).toBe(false)
    setLevel('fishing', 20); setLevel('farming', 20); setLevel('thieving', 30)
    G.addItem('iron_lockpick', 1); G.equip('iron_lockpick')
    state.guilds.member = state.guilds.list[0].id
    const now = types()
    for (const t of ['fish', 'patrons', 'contracts', 'bountiful', 'heists']) expect(now.has(t), t).toBe(true)
  })

  it('count progress from when they were given', () => {
    newHero()
    setLevel('fishing', 20)
    const task = G.makeTasks('x', 10, 1).find(t => t.type === 'fish') || { type: 'fish', target: 10, base: 0 }
    task.base = state.stats.fish || 0
    state.stats.fish = task.base + 5
    expect(G.taskProgress(task).cur).toBe(5)
  })
})
