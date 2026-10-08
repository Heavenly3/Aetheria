import { t, te } from './index.js'
import { SKILLS } from '../game/data/skills.js'

// Modifiers that are flat values instead of percentages
const FLAT = new Set(['maxHp', 'farmYield', 'offline', 'startSkills', 'startGold'])

// Human-readable text for a modifier key and value, e.g. ('speed.mining', 0.1) -> "+10% Mining speed".
// Negative values (bad weather) flip the sign written in the text
export function modText(key, value) {
  // Some texts read better with their own wording when negative ("Crops grow 40% slower")
  if (value < 0 && te(`mods.${key}Neg`)) return t(`mods.${key}Neg`, { v: +(-value * 100).toFixed(1) })
  return rawModText(key, value).replace('+-', '−').replace('--', '+')
}
function rawModText(key, value) {
  const v = FLAT.has(key) ? +value.toFixed(2) : +(value * 100).toFixed(1)
  if (te(`mods.${key}`)) return t(`mods.${key}`, { v })
  const [kind, skill] = key.split('.')
  if (SKILLS[skill]) return t(`mods.${kind}Skill`, { v, skill: SKILLS[skill].name })
  return t(`mods.${kind}Group`, { v, group: t(`skillCats.${skill}`) })
}
