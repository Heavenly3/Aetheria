import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { ASCEND_MIN_TOTAL } from '../src/game/data/ascension.js'
import { SKILLS } from '../src/game/data/skills.js'
import { MYTHIC_IDS } from '../src/game/mythics.js'

// Enough levels to ascend, with fishing the best skill
function readyToAscend() {
  const per = Math.ceil(ASCEND_MIN_TOTAL / Object.keys(SKILLS).length) + 1
  for (const k of Object.keys(SKILLS)) setLevel(k, Math.min(99, per))
  setLevel('fishing', 90)
}

describe('past lives', () => {
  beforeEach(() => newHero())

  it('writes down each life when the hero is reborn', () => {
    readyToAscend()
    state.stats.playTime = 7200
    state.killsBy.goblin = 12
    G.awardMythic(MYTHIC_IDS[0])
    const shards = G.ascend()
    const [life] = state.ascension.lives
    expect(life).toMatchObject({ n: 1, played: 7200, kills: 12, shards, best: { skill: 'fishing', lvl: 90 }, finds: [MYTHIC_IDS[0]] })
    expect(life.total).toBeGreaterThanOrEqual(ASCEND_MIN_TOTAL)

    // The next life counts from the rebirth on
    readyToAscend()
    state.stats.playTime = 7200 + 1800
    expect(G.lifeSummary()).toMatchObject({ n: 2, played: 1800, kills: 0, finds: [] })
    G.ascend()
    expect(state.ascension.lives.map(l => l.n)).toEqual([1, 2])
    expect(state.ascension.lives[1].played).toBe(1800)
  })

  it('leaves out the length of a life begun before the record existed', () => {
    state.ascension.count = 3
    state.ascension.lifeAt = null
    expect(G.lifeSummary()).toMatchObject({ n: 4, start: null, played: null, finds: [] })
  })

  it('keeps the record within its limit', () => {
    state.ascension.lives = Array.from({ length: 100 }, (_, i) => ({ n: i + 1 }))
    readyToAscend()
    G.ascend()
    expect(state.ascension.lives).toHaveLength(100)
    expect(state.ascension.lives.at(-1).n).toBe(1)
    expect(state.ascension.lives[0].n).toBe(2)
  })
})
