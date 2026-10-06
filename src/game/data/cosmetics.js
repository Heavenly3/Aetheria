import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'

/*
  Cosmetics: titles shown next to the hero's name, extra portraits and colours.
  `ach`      -> unlocked by that achievement (achievements survive ascension, so cosmetics do too)
  `festival` -> sold in that festival's shop (see festivals.js)
  Titles with `of: true` read as "Name of …" instead of "Name, …".
*/
const title = (id, unlock, of = false) => named({ id, of, ...unlock }, `cosmetics.titles.${id}`)

export const TITLES = [
  title('apprentice', {}),
  title('goblin_hunter', { ach: 'boss_goblin_king' }),
  title('dragonslayer', { ach: 'boss_ancient_dragon' }),
  title('voidwalker', { ach: 'boss_void_emperor' }),
  title('unbound', { ach: 'boss_aether_sovereign' }),
  title('spire_climber', { ach: 'tower_50' }),
  title('naturalist', { ach: 'beasts_all' }),
  title('beastbane', { ach: 'hunted_10' }),
  title('wild_heart', { ach: 'pets_10' }),
  title('twice_born', { ach: 'ascend_1' }),
  title('many_lives', { ach: 'ascend_5' }, true),
  title('goldhand', { ach: 'gold_10000000' }),
  title('hope', { ach: 'quests_21' }),
  title('ten_runes', { ach: 'enchant_10' }, true),
  title('unfailing', { ach: 'streak_30' }),
  title('polymath', { ach: 'total_1500' }),
  title('harvest_moon', { festival: 'harvest' }, true),
  title('endless_winter', { festival: 'winter' }, true),
  title('first_bloom', { festival: 'spring' }, true),
  title('midsummer_fire', { festival: 'summer' }, true),
]

// Portraits beyond the ones offered at character creation
export const EXTRA_AVATARS = [
  { id: 'goblin-head', ach: 'boss_goblin_king' },
  { id: 'floating-ghost', ach: 'hunted_1' },
  { id: 'orc-head', ach: 'dungeon_50' },
  { id: 'black-knight-helm', ach: 'slayer_50' },
  { id: 'crowned-skull', ach: 'boss_necromancer' },
  { id: 'dragon-head', ach: 'boss_ancient_dragon' },
  { id: 'hooded-figure', ach: 'ascend_1' },
  { id: 'sun-priest', ach: 'boss_aether_sovereign' },
  { id: 'werewolf', festival: 'harvest' },
  { id: 'ice-golem', festival: 'winter' },
  { id: 'unicorn', festival: 'spring' },
  { id: 'flame', festival: 'summer' },
]

export const EXTRA_TINTS = [
  { id: '#e2b65a', ach: 'gold_1000000' },
  { id: '#7d3cff', ach: 'boss_void_emperor' },
  { id: '#f5e6a8', ach: 'boss_aether_sovereign' },
  { id: '#d9772b', festival: 'harvest' },
  { id: '#8fd0f2', festival: 'winter' },
  { id: '#f08fb8', festival: 'spring' },
  { id: '#f2b233', festival: 'summer' },
]

// Cosmetics that an achievement unlocks, for the unlock notice
export const cosmeticsForAch = id => [...TITLES, ...EXTRA_AVATARS, ...EXTRA_TINTS].filter(c => c.ach === id).length

export const TITLE_MAP = Object.fromEntries(TITLES.map(x => [x.id, x]))

// "Lyra, Dragonslayer" or "Lyra of Many Lives"
export const titled = (name, title) => (title ? t(title.of ? 'cosmetics.titledOf' : 'cosmetics.titled', { name, title: title.name }) : name)
