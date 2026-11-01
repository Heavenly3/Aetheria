import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { ORIGINS, ROLES, ROLE_RATINGS, RATING_AXES, roleCombat } from '../src/game/data/character.js'
import { SKILLS } from '../src/game/data/skills.js'
import { ITEMS } from '../src/game/data/items.js'
import { ASCEND_MIN_TOTAL } from '../src/game/data/ascension.js'
import { te } from '../src/i18n/index.js'

describe('origins', () => {
  it('give their head start on top of the class', () => {
    newHero({ role: 'mage', origin: 'observatory' })
    expect(state.origin).toBe('observatory')
    expect(G.level('runecrafting')).toBe(4)
    expect(G.level('magic')).toBe(5) // the mage already starts higher
    expect(G.qty('stardust')).toBe(40)
    newHero({ role: 'warrior', origin: 'streets' })
    expect(G.level('thieving')).toBe(5)
    expect(state.gold).toBe(50 + 150)
  })

  it('make an unknown or missing origin a wanderer, with nothing extra', () => {
    newHero({ origin: 'nowhere' })
    expect(state.origin).toBe('wanderer')
    newHero({})
    expect(state.origin).toBe('wanderer')
    expect(state.gold).toBe(50)
  })

  it('stay with the hero through rebirth and give their start again', () => {
    newHero({ role: 'rogue', origin: 'forge' })
    const per = Math.ceil(ASCEND_MIN_TOTAL / Object.keys(SKILLS).length) + 1
    for (const k of Object.keys(SKILLS)) setLevel(k, Math.min(99, per))
    for (const id of Object.keys(state.inventory)) delete state.inventory[id]
    G.ascend()
    expect(state.origin).toBe('forge')
    expect(G.level('smithing')).toBe(5)
    expect(G.qty('bronze_bar')).toBe(6)
  })

  it('have their texts, real items and skills, and a memory for the journal', () => {
    for (const [id, o] of Object.entries(ORIGINS)) {
      for (const k of ['name', 'desc', 'memory']) expect(te(`origins.${id}.${k}`), `${id}.${k}`).toBe(true)
      for (const sk of Object.keys(o.skills || {})) expect(SKILLS[sk], sk).toBeTruthy()
      for (const item of Object.keys(o.items || {})) expect(ITEMS[item], item).toBeTruthy()
    }
  })
})

describe('class sheets', () => {
  it('rate every class on every axis and name how it fights', () => {
    for (const [k, r] of Object.entries(ROLES)) {
      for (const ax of RATING_AXES) expect(ROLE_RATINGS[k][ax]).toBeGreaterThanOrEqual(1)
      expect(['melee', 'ranged', 'magic']).toContain(roleCombat(r))
    }
    expect(roleCombat(ROLES.mage)).toBe('magic')
    expect(roleCombat(ROLES.ranger)).toBe('ranged')
  })
})
