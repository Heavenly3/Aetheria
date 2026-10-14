/*
  Techniques: a twist of its own for each skill that used to be "pick the best action and wait".
  - Mining strikes rich veins now and then, worth an extra ore for a few swings.
  - Woodcutting fells a tree after enough cuts at it, for a pile of logs and extra XP.
  - Smithing, fletching, cooking and herblore build momentum while they keep working at the same
    skill: each stack helps a little, and stopping or switching skill loses it.
  - Firemaking feeds a bonfire that keeps burning after the hero walks away, warming everyone.
  - Runecrafting resonates with the sky: elemental runes with their weather, dark runes at night.
*/
export const TECH_SKILLS = ['mining', 'woodcutting', 'smithing', 'fletching', 'cooking', 'herblore', 'firemaking', 'runecrafting']

export const VEIN = { chance: 0.04, swings: 8, extra: 1 }
export const FELL = { cuts: 25, logs: 5, xp: 5 }

// stack: bonus per stack · max: stacks · key: the modifier it feeds (speed) or a special effect
export const MOMENTUM = {
  smithing: { per: 0.01, max: 20, mod: 'speed.smithing' },
  fletching: { per: 0.01, max: 20, mod: 'speed.fletching' },
  cooking: { per: 0.015, max: 20, effect: 'burn' },
  herblore: { per: 0.01, max: 20, effect: 'extra' },
}
export const MOMENTUM_COOL = 30e3 // ms without working at it before momentum is lost

// Every log adds this much burning time, up to the cap; while it burns, everyone is warmed
export const BONFIRE = { perLog: 20e3, cap: 30 * 60e3, mods: { xp: 0.03, 'speed.cooking': 0.1 } }

// Runes that resonate: elemental with their weather, dark runes at night
export const RESONANCE = {
  air_rune: { weather: ['wind', 'storm'] }, water_rune: { weather: ['rain', 'storm'] }, earth_rune: { weather: ['clear', 'cloudy'] },
  fire_rune: { weather: ['heatwave'] }, mind_rune: { weather: ['fog'] }, chaos_rune: { night: true }, nature_rune: { weather: ['rain'] },
  death_rune: { night: true }, blood_rune: { night: true }, soul_rune: { night: true },
}
export const RESONANCE_BONUS = 0.5
