import { t, te } from './index.js'
import { SKILLS } from '../game/data/skills.js'

// Modifiers that are flat values instead of percentages
const FLAT = new Set(['maxHp', 'farmYield', 'offline', 'startSkills', 'startGold'])

// Human-readable text for a modifier key and value, e.g. ('speed.mining', 0.1) -> "+10% Mining speed"
export function modText(key, value) {
  const v = FLAT.has(key) ? +value.toFixed(2) : +(value * 100).toFixed(1)
  if (te(`mods.${key}`)) return t(`mods.${key}`, { v })
  const [kind, skill] = key.split('.')
  if (SKILLS[skill]) return t(`mods.${kind}Skill`, { v, skill: SKILLS[skill].name })
  return t(`mods.${kind}Group`, { v, group: t(`skillCats.${skill}`) })
}
