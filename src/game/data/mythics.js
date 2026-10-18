/*
  Mythic finds: where the ultra rare items of items.js turn up and how often.
  - on 'skill': rolled for every action of that skill (any skill when none is given); the chance is
    per 3 seconds of action, so slow actions are not worse off
  - on 'kill': rolled for every creature defeated, narrowed to some creatures, areas, bosses or the tower
  Luck helps a little: the loot bonus raises the chance by a quarter of itself.
*/
export const MYTHIC_TIERS = {
  epic:      { color: '#c77dff' },
  legendary: { color: '#ffb347' },
  mythic:    { color: '#ff4d6d' },
}
export const MYTHIC_LUCK = 0.25
const EPIC = 1 / 5000, LEGENDARY = 1 / 50000, MYTHIC = 1 / 1e6

const DRAGONS = ['green_dragon', 'red_dragon', 'wyvern', 'elder_wyrm', 'ancient_dragon', 'bronze_wyrm']

export const MYTHIC_DROPS = [
  { item: 'worldheart_pickaxe', on: 'skill', skill: 'mining', chance: EPIC },
  { item: 'evergreen_axe', on: 'skill', skill: 'woodcutting', chance: EPIC },
  { item: 'moontide_rod', on: 'skill', skill: 'fishing', chance: EPIC },
  { item: 'golden_harvest_sickle', on: 'skill', skill: 'farming', chance: EPIC },
  { item: 'forgefather_ember', on: 'skill', skill: 'smithing', chance: EPIC },
  { item: 'eternal_hearth', on: 'skill', skill: 'cooking', chance: EPIC },
  { item: 'weavers_needle', on: 'skill', skill: 'crafting', chance: EPIC },
  { item: 'windsong_feather', on: 'skill', skill: 'fletching', chance: EPIC },
  { item: 'philosophers_flask', on: 'skill', skill: 'herblore', chance: EPIC },
  { item: 'primordial_rune', on: 'skill', skill: 'runecrafting', chance: EPIC },
  { item: 'undying_flame', on: 'skill', skill: 'firemaking', chance: EPIC },
  { item: 'shadow_kings_mask', on: 'skill', skill: 'thieving', chance: EPIC },
  { item: 'zephyr_sigil', on: 'skill', skill: 'agility', chance: EPIC },
  { item: 'saints_relic', on: 'skill', skill: 'prayer', chance: EPIC },

  { item: 'hourglass_of_ages', on: 'skill', chance: LEGENDARY },
  { item: 'forgotten_kings_crown', on: 'kill', boss: true, chance: 1 / 5000 },
  { item: 'starfall_cloak', on: 'kill', tower: true, chance: 1 / 20000 },
  { item: 'titans_aegis', on: 'kill', areas: ['void', 'celestial'], chance: 1 / 40000 },
  { item: 'eternal_dragonplate', on: 'kill', monsters: DRAGONS, chance: 1 / 25000 },
  { item: 'voidwalker_greaves', on: 'kill', areas: ['abyss'], chance: 1 / 40000 },

  { item: 'doomsday_edge', on: 'kill', chance: MYTHIC },
  { item: 'horizon_breaker', on: 'kill', chance: MYTHIC },
  { item: 'first_dawn_staff', on: 'kill', chance: MYTHIC },
  { item: 'amulet_of_endless_fortune', on: 'kill', chance: MYTHIC },
  { item: 'amulet_of_endless_fortune', on: 'skill', chance: MYTHIC },
  { item: 'heart_of_aetheria', on: 'skill', chance: MYTHIC },
]
export const SKILL_DROPS = MYTHIC_DROPS.filter(d => d.on === 'skill')
export const KILL_DROPS = MYTHIC_DROPS.filter(d => d.on === 'kill')
