import { named } from '../../i18n/bind.js'

/*
  Pets are very rare finds. Every pet you own adds its small passive bonus (`mods`).
  source:
    { skill }    -> rolled on every completed action of that skill; the chance scales with action time
    { monster }  -> rolled on every kill of that monster (bosses)
    { slayer }   -> rolled when a slayer task is finished
    { dice }     -> rolled on every game of dice at the tavern
  `chance` is per roll (for skills, per 3 seconds of action time).
*/
const pet = (id, icon, tint, source, chance, mods) => named({ id, icon, tint, source, chance, mods }, `pets.${id}.name`, `pets.${id}.desc`)

export const PETS = [
  pet('rock_golem',   'golem-head',     '#a08a6a', { skill: 'mining' },       1 / 7000, { 'speed.mining': 0.03 }),
  pet('beaver',       'beaver',         '#a0703a', { skill: 'woodcutting' },  1 / 7000, { 'speed.woodcutting': 0.03 }),
  pet('heron',        'seagull',        '#7fb3d9', { skill: 'fishing' },      1 / 7000, { 'speed.fishing': 0.03 }),
  pet('squirrel',     'squirrel',       '#c9853a', { skill: 'farming' },      1 / 400,  { farmSpeed: 0.05 }),
  pet('fox',          'fox-head',       '#e07a3a', { skill: 'thieving' },     1 / 7000, { thieving: 0.02 }),
  pet('anvil_imp',    'imp',            '#e0554b', { skill: 'smithing' },     1 / 7000, { 'speed.smithing': 0.03 }),
  pet('hedgehog',     'hedgehog',       '#b08a5a', { skill: 'cooking' },      1 / 7000, { heal: 0.05 }),
  pet('ember_sprite', 'flame',          '#ff8c42', { skill: 'firemaking' },   1 / 7000, { 'xp.firemaking': 0.05 }),
  pet('owl',          'owl',            '#c2a77a', { skill: 'fletching' },    1 / 7000, { 'xp.fletching': 0.05 }),
  pet('butterfly',    'butterfly',      '#d98bd9', { skill: 'crafting' },     1 / 7000, { 'xp.crafting': 0.05 }),
  pet('herb_snail',   'snail',          '#8fbf5a', { skill: 'herblore' },     1 / 7000, { 'xp.herblore': 0.05 }),
  pet('rune_fairy',   'fairy',          '#b38cff', { skill: 'runecrafting' }, 1 / 7000, { 'xp.runecrafting': 0.05 }),
  pet('hummingbird',  'hummingbird',    '#4ecdc4', { skill: 'agility' },      1 / 5000, { speed: 0.01 }),
  pet('bone_raven',   'raven',          '#6a6a8a', { skill: 'prayer' },       1 / 7000, { 'xp.prayer': 0.05 }),
  pet('goblin_whelp', 'imp-laugh',      '#7fbf3a', { monster: 'goblin_king' },      1 / 300, { gold: 0.03 }),
  pet('troll_pup',    'bear-head',      '#9a8a6a', { monster: 'troll_lord' },       1 / 300, { defense: 0.03 }),
  pet('baby_kraken',  'fish-monster',   '#2fa8c6', { monster: 'kraken' },           1 / 300, { rangedDmg: 0.03 }),
  pet('little_lich',  'evil-minion',    '#7a3ae0', { monster: 'necromancer' },      1 / 300, { magicDmg: 0.03 }),
  pet('hatchling',    'dragon-head',    '#e0402a', { monster: 'ancient_dragon' },   1 / 300, { meleeDmg: 0.03 }),
  pet('void_wisp',    'cosmic-egg',     '#8a5cff', { monster: 'void_emperor' },     1 / 300, { loot: 0.04 }),
  pet('star_cub',     'unicorn',        '#ffe08a', { monster: 'aether_sovereign' }, 1 / 300, { xp: 0.03 }),
  pet('slayer_bat',   'bat',            '#b5179e', { slayer: true },                1 / 150, { 'xp.slayer': 0.08 }),
  pet('lucky_cat',    'cat',            '#f0c040', { dice: true },                  1 / 400, { double: 0.01 }),
  // Omen pets: only rolled while their omen is on (or by defeating its creature)
  pet('astral_wisp',   'sparkles',        '#9db8ff', { omen: 'stars' },          1 / 2500, { xp: 0.02 }),
  pet('gilded_imp',    'goblin',          '#f0c040', { omen: 'gilded_goblin' },  1 / 12,   { gold: 0.04 }),
  pet('crimson_pup',   'wolf-head',       '#c0152f', { omen: 'blood_moon' },     1 / 400,  { meleeDmg: 0.02, rangedDmg: 0.02, magicDmg: 0.02 }),
  pet('eclipse_orb',   'crystal-ball',    '#7b4dff', { omen: 'eclipse' },        1 / 1500, { runeSave: 0.05 }),
  pet('rift_gargoyle', 'gargoyle',        '#5d6b8a', { omen: 'rift' },           1 / 60,   { defense: 0.04 }),
  pet('comet_sprite',  'angel-wings',     '#ffb347', { omen: 'comet' },          1 / 600,  { loot: 0.03 }),
  pet('wandering_eye', 'eye-target',      '#3fe0c5', { omen: 'eye' },            0,        { xp: 0.03, gold: 0.03, loot: 0.03 }),
  // Festival pets are bought in the festival shop, never rolled
  pet('mushling',     'mushroom',       '#d9772b', { festival: 'harvest' },         0, { loot: 0.02 }),
  pet('frost_cub',    'polar-bear',     '#8fd0f2', { festival: 'winter' },          0, { maxHp: 3 }),
  pet('spring_chick', 'nest-eggs',      '#f08fb8', { festival: 'spring' },          0, { mastery: 0.03 }),
  pet('sunfox',       'fox',            '#f2b233', { festival: 'summer' },          0, { gold: 0.02 }),
]

export const PET_MAP = Object.fromEntries(PETS.map(p => [p.id, p]))

// Roughly how many rolls it takes on average, for the collection screen
export const petOdds = p => (p.chance ? Math.round(1 / p.chance) : 0)
