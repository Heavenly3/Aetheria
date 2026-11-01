import { describe, it, expect } from 'vitest'
import { seeded } from '../src/game/data/guilds.js'
import {
  makeDeduction, deductionSolutions, makeCipher, shiftText, plain, cipherSolved, makeBeam, traceBeam, beamSolved, turnMirror,
  makeAstrolabe, turnRing, astrolabeSolved, makeBalance, weigh, BALANCE, makeEcho, ECHO,
} from '../src/game/data/enigmas.js'

const SEEDS = Array.from({ length: 25 }, (_, i) => 1000 + i * 7919)

describe('deduction', () => {
  it('always leaves exactly one answer, with no clue to spare', () => {
    for (const level of [0, 1, 2]) for (const seed of SEEDS.slice(0, 8)) {
      const pz = makeDeduction(seeded(seed), level)
      const sols = deductionSolutions(pz.n, pz.clues)
      expect(sols).toHaveLength(1)
      expect(sols[0].place[pz.answer]).toBe(pz.crime.place)
      for (let i = 0; i < pz.clues.length; i++) expect(deductionSolutions(pz.n, pz.clues.filter((_, j) => j !== i)).length).toBeGreaterThan(1)
    }
  })
  it('has more suspects the harder it is', () => {
    expect([0, 1, 2].map(l => makeDeduction(seeded(5), l).n)).toEqual([3, 4, 5])
  })
})

describe('cipher', () => {
  it('turns back to the plain letter with the right dials, in either language', () => {
    for (const seed of SEEDS) for (const level of [0, 1, 2]) {
      const pz = makeCipher(seeded(seed), level)
      const text = plain('Meet me at the old Chapel when the moon is high')
      const coded = shiftText(text, pz.key)
      expect(coded).not.toBe(text)
      expect(shiftText(coded, pz.key, -1)).toBe(text)
      expect(pz.key).toHaveLength(level === 2 ? 3 : 1)
    }
    expect(plain('La campaña está en la CAPILLA vieja')).toBe('LA CAMPANA ESTA EN LA CAPILLA VIEJA')
    expect(cipherSolved({}, ' capílla ', 'Capilla')).toBe(true)
  })
})

describe('beam', () => {
  it('starts unsolved and the mirrors can always be turned to reach the crystal', () => {
    for (const level of [0, 1, 2]) for (const seed of SEEDS) {
      const pz = makeBeam(seeded(seed), level)
      expect(beamSolved(pz)).toBe(false)
      expect(beamSolved(pz, pz.solution)).toBe(true)
      // Turning the mirrors that differ from the solution solves it
      for (let r = 0; r < pz.size; r++) for (let c = 0; c < pz.size; c++) if (pz.grid[r][c] !== pz.solution[r][c]) expect(turnMirror(pz, r, c)).toBe(true)
      expect(beamSolved(pz)).toBe(true)
      expect(traceBeam(pz).exit).toEqual(pz.target)
    }
  })
})

describe('astrolabe', () => {
  it('starts out of line, and every scramble can be turned back', () => {
    for (const level of [0, 1, 2]) for (const seed of SEEDS) {
      const pz = makeAstrolabe(seeded(seed), level)
      expect(pz.rings).toHaveLength(3 + level)
      expect(astrolabeSolved(pz)).toBe(false)
      // Solve ring by ring from the first: each turn of ring i only moves rings after it
      for (let i = 0; i < pz.rings.length; i++) {
        let n = 0
        while (pz.rings[i][pz.at[i]] !== pz.target[i] && n++ < 8) turnRing(pz, i, 1)
      }
      expect(astrolabeSolved(pz)).toBe(true)
    }
  })
  it('drags the next rings along from level 1', () => {
    const pz = makeAstrolabe(seeded(9), 1)
    const before = [...pz.at]
    turnRing(pz, 0, 1)
    expect(pz.at[1]).toBe((before[1] + 1) % 8)
    expect(pz.at[2]).toBe(before[2])
  })
})

describe('balance', () => {
  it('tips toward the false coin and allows only so many weighings', () => {
    for (const level of [0, 1, 2]) {
      const pz = makeBalance(seeded(3 + level), level)
      const others = [...Array(pz.coins).keys()].filter(c => c !== pz.fake)
      expect(weigh(pz, [pz.fake], [others[0]])).toBe(pz.heavy ? -1 : 1)
      expect(weigh(pz, [others[1]], [others[2]])).toBe(0)
      expect(weigh(pz, [0, 1], [1, 2])).toBe(null)
      while (pz.log.length < BALANCE[level].weighs) weigh(pz, [others[0]], [others[1]])
      expect(weigh(pz, [others[0]], [others[1]])).toBe(null)
    }
  })
  it('can always be solved in its weighings: nine coins in two', () => {
    for (let fake = 0; fake < 9; fake++) {
      const pz = { ...makeBalance(seeded(1), 1), fake }
      const r1 = weigh(pz, [0, 1, 2], [3, 4, 5])
      const group = r1 === -1 ? [0, 1, 2] : r1 === 1 ? [3, 4, 5] : [6, 7, 8]
      const r2 = weigh(pz, [group[0]], [group[1]])
      expect(r2 === -1 ? group[0] : r2 === 1 ? group[1] : group[2]).toBe(fake)
    }
  })
})

describe('echo', () => {
  it('grows to its full length with runes from its set', () => {
    for (const level of [0, 1, 2]) {
      const pz = makeEcho(seeded(level), level)
      expect(pz.seq).toHaveLength(ECHO[level].length)
      expect(pz.seq.every(r => r >= 0 && r < ECHO[level].runes)).toBe(true)
    }
  })
})
