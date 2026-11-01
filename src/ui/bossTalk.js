import { BOSS_VOICES, BOSS_LINE_COOLDOWN } from '../game/data/bossLines.js'

// Which boss line may be said now. Remembered for the session only: after a reload a boss greets again
const said = new Map()

// The boss a creature speaks as (an echo speaks as the boss it echoes), or null for one with no lines
export const speakerOf = m => {
  const id = m?.echoOf || m?.id
  return id && BOSS_VOICES[id] ? id : null
}

export function mayTalk(boss, kind, now = Date.now()) {
  const key = boss + ':' + kind
  if (now - (said.get(key) ?? -Infinity) < BOSS_LINE_COOLDOWN) return false
  said.set(key, now)
  return true
}

export function forgetTalk() { said.clear() }
