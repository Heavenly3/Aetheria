import { vi } from 'vitest'
import { G, state } from '../src/game/engine.js'
import { XP_TABLE } from '../src/game/data/skills.js'

export { G, state, XP_TABLE }

// A fresh hero in slot 0
export function newHero(profile = {}) {
  G.newGame(0, { name: 'Tester', role: 'warrior', difficulty: 'normal', ...profile })
  return state
}

export function setLevel(skill, lvl) { state.skills[skill].xp = XP_TABLE[lvl] }

// Run the game loop for `seconds` of game time
export function run(seconds, step = 0.5) {
  for (let t = 0; t < seconds; t += step) G.update(Math.min(step, seconds - t))
}

// Make every random roll return `value` (0 = always succeed, 0.999 = always fail)
export function fixRandom(value) { return vi.spyOn(Math, 'random').mockReturnValue(value) }
