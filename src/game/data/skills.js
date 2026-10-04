import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'

export const MAX_LEVEL = 99

// RuneScape-style XP curve (index = level)
export const XP_TABLE = (() => {
  const table = [0, 0]
  let pts = 0
  for (let l = 1; l < 100; l++) {
    pts += Math.floor(l + 300 * Math.pow(2, l / 7))
    table.push(Math.floor(pts / 4))
  }
  return table
})()

export const SKILL_CATS = {}
;['gathering', 'artisan', 'support', 'combat'].forEach(c => Object.defineProperty(SKILL_CATS, c, { get: () => t(`skillCats.${c}`), enumerable: true }))

export const SKILLS = {
  mining:       { icon: 'mining',             cat: 'gathering', color: '#c9a36b' },
  woodcutting:  { icon: 'wood-axe',           cat: 'gathering', color: '#7fb069' },
  fishing:      { icon: 'fishing-pole',       cat: 'gathering', color: '#5fa8d3' },
  farming:      { icon: 'sprout',             cat: 'gathering', color: '#9bc53d' },
  thieving:     { icon: 'robber',             cat: 'gathering', color: '#9d79bc' },
  smithing:     { icon: 'anvil-impact',       cat: 'artisan',   color: '#e07a5f' },
  cooking:      { icon: 'cooking-pot',        cat: 'artisan',   color: '#f2cc8f' },
  firemaking:   { icon: 'campfire',           cat: 'artisan',   color: '#ff8c42' },
  fletching:    { icon: 'arrow-flights',      cat: 'artisan',   color: '#6a994e' },
  crafting:     { icon: 'sewing-needle',      cat: 'artisan',   color: '#c08552' },
  herblore:     { icon: 'round-bottom-flask', cat: 'artisan',   color: '#52b788' },
  runecrafting: { icon: 'rune-stone',         cat: 'artisan',   color: '#8e7dbe' },
  prayer:       { icon: 'prayer',             cat: 'support',   color: '#f1e3b0' },
  agility:      { icon: 'sprint',             cat: 'support',   color: '#4ecdc4' },
  attack:       { icon: 'crossed-swords',     cat: 'combat',    color: '#e63946' },
  strength:     { icon: 'biceps',             cat: 'combat',    color: '#43aa8b' },
  defense:      { icon: 'checked-shield',     cat: 'combat',    color: '#577590' },
  ranged:       { icon: 'bow-arrow',          cat: 'combat',    color: '#90be6d' },
  magic:        { icon: 'wizard-staff',       cat: 'combat',    color: '#4d96ff' },
  hitpoints:    { icon: 'glass-heart',        cat: 'combat',    color: '#d62839' },
  slayer:       { icon: 'death-skull',        cat: 'combat',    color: '#b5179e' },
}
Object.entries(SKILLS).forEach(([id, s]) => named(s, `skills.${id}.name`, `skills.${id}.desc`))
