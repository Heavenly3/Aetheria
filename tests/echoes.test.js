import { describe, it, expect } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { BOSSES } from '../src/game/data/combat.js'
import { ECHOES, ECHO_MAP, ECHO_BONUS } from '../src/game/data/echoes.js'
import { i18n } from '../src/i18n/index.js'

describe('echoes of the bosses', () => {
  it('makes every world boss an echo that is stronger, richer and named after it', () => {
    expect(ECHOES).toHaveLength(BOSSES.length)
    for (const b of BOSSES) {
      const e = ECHO_MAP['echo_' + b.id]
      expect(e.hp).toBeGreaterThan(b.hp)
      expect(e.maxHit).toBeGreaterThan(b.maxHit)
      expect(e.gold[1]).toBeGreaterThan(b.gold[1])
      expect(e.name).toContain(b.name)
      expect(G.bossMechs(e)).toEqual(G.bossMechs(b))
    }
    expect(i18n.global.te('ach.allEchoes.name', 'en')).toBe(true)
  })

  it('stays silent until the story has an ending', () => {
    newHero()
    expect(G.echoesOpen()).toBe(false)
    G.startCombat('boss', 'echo_goblin_king')
    expect(state.activity).toBe(null)
    state.legacy.endings.sky = Date.now()
    expect(G.echoesOpen()).toBe(true)
    G.startCombat('boss', 'echo_goblin_king')
    expect(state.activity?.target).toBe('echo_goblin_king')
  })

  it('remembers each echo beaten for good, with a lasting bonus that survives ascension', () => {
    newHero()
    state.legacy.endings.sky = Date.now()
    const xp = G.mod('xp')
    const seen = []
    const off = G.on('echo', e => seen.push(e.id))
    G.startCombat('boss', 'echo_goblin_king')
    G.killMonster(ECHO_MAP.echo_goblin_king)
    G.killMonster(ECHO_MAP.echo_goblin_king)
    off()
    expect(seen).toEqual(['echo_goblin_king'])
    expect(G.echoesBeaten()).toBe(1)
    expect(G.mod('xp')).toBeCloseTo(xp + ECHO_BONUS.xp)
    for (const k of Object.keys(state.skills)) state.skills[k].xp = 1e6
    G.ascend()
    expect(G.echoBeaten('goblin_king')).toBe(true)
    expect(G.echoesOpen()).toBe(true)
  })
})
