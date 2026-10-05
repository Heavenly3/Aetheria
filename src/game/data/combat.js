import { named, cloneNamed } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'

export const PLAYER_ATTACK_SPEED = 2.4

export const COMBAT_STYLES = {
  attack:   { icon: 'crossed-swords',  type: 'melee',  skill: 'attack' },
  strength: { icon: 'biceps',          type: 'melee',  skill: 'strength' },
  defense:  { icon: 'checked-shield',  type: 'melee',  skill: 'defense' },
  ranged:   { icon: 'bow-arrow',       type: 'ranged', skill: 'ranged' },
  magic:    { icon: 'fire-spell-cast', type: 'magic',  skill: 'magic' },
}
Object.entries(COMBAT_STYLES).forEach(([k, s]) => named(s, `styles.${k}.name`, `styles.${k}.desc`))

const spell = (id, lvl, max, runes, xp, el) => named({ id, lvl, max, runes, xp, el }, `spells.${id}`)
export const SPELLS = [
  spell('wind_strike',  1,  2,  { air_rune: 1, mind_rune: 1 }, 5.5, 'air'),
  spell('water_strike', 5,  4,  { air_rune: 1, water_rune: 1, mind_rune: 1 }, 7.5, 'water'),
  spell('earth_strike', 9,  6,  { air_rune: 1, earth_rune: 2, mind_rune: 1 }, 9.5, 'earth'),
  spell('fire_strike',  13, 8,  { air_rune: 2, fire_rune: 3, mind_rune: 1 }, 11.5, 'fire'),
  spell('wind_bolt',    17, 9,  { air_rune: 2, chaos_rune: 1 }, 13.5, 'air'),
  spell('water_bolt',   23, 10, { air_rune: 2, water_rune: 2, chaos_rune: 1 }, 16.5, 'water'),
  spell('earth_bolt',   29, 11, { air_rune: 2, earth_rune: 3, chaos_rune: 1 }, 19.5, 'earth'),
  spell('fire_bolt',    35, 12, { air_rune: 3, fire_rune: 4, chaos_rune: 1 }, 22.5, 'fire'),
  spell('wind_blast',   41, 13, { air_rune: 3, death_rune: 1 }, 25.5, 'air'),
  spell('water_blast',  47, 14, { air_rune: 3, water_rune: 3, death_rune: 1 }, 28.5, 'water'),
  spell('earth_blast',  53, 15, { air_rune: 3, earth_rune: 4, death_rune: 1 }, 31.5, 'earth'),
  spell('fire_blast',   59, 16, { air_rune: 4, fire_rune: 5, death_rune: 1 }, 34.5, 'fire'),
  spell('wind_wave',    62, 17, { air_rune: 5, blood_rune: 1 }, 36, 'air'),
  spell('water_wave',   65, 18, { air_rune: 5, water_rune: 7, blood_rune: 1 }, 37.5, 'water'),
  spell('earth_wave',   70, 19, { air_rune: 5, earth_rune: 7, blood_rune: 1 }, 40, 'earth'),
  spell('fire_wave',    75, 20, { air_rune: 5, fire_rune: 7, blood_rune: 1 }, 42.5, 'fire'),
]

const d = (item, chance, a = 1, b = a) => ({ item, chance, qty: [a, b] })
const mon = (id, icon, hp, att, def, maxHit, speed, gold, drops, extra = {}) =>
  named({ id, icon, hp, att, def, maxHit, speed, gold, drops, ...extra }, `monsters.${id}`)

// weak: combat style against which the monster's defence is 35% lower
export const AREAS = [
  {
    id: 'meadow', icon: 'wheat', recLvl: 1,
    monsters: [
      mon('chicken', 'chicken', 3, 1, 1, 1, 3, [0, 1], [d('feathers', 1, 5, 12), d('bones', 1)]),
      mon('goblin', 'goblin-head', 5, 3, 1, 1, 2.4, [1, 6], [d('bones', 1), d('bronze_sword', 0.03), d('copper_ore', 0.2, 1, 3), d('air_rune', 0.15, 2, 6)]),
      mon('cow', 'cow', 8, 1, 1, 1, 3, [0, 2], [d('cowhide', 1), d('bones', 1)]),
    ],
  },
  {
    id: 'forest', icon: 'pine-tree', recLvl: 10,
    monsters: [
      mon('rat', 'rat', 10, 8, 5, 2, 2.4, [1, 4], [d('bones', 1), d('raw_shrimp', 0.2, 1, 2)]),
      mon('wolf', 'wolf-head', 15, 12, 8, 3, 2.4, [2, 8], [d('wolf_pelt', 0.6), d('bones', 1)], { weak: 'ranged' }),
      mon('bandit', 'bandit', 22, 16, 14, 4, 2.4, [8, 25], [d('bones', 1), d('iron_sword', 0.02), d('uncut_sapphire', 0.02), d('raw_trout', 0.25, 1, 3), d('potato_seed', 0.1, 1, 3)], { weak: 'magic' }),
    ],
  },
  {
    id: 'caves', icon: 'stone-block', recLvl: 22,
    monsters: [
      mon('skeleton', 'skeleton', 29, 26, 22, 5, 2.4, [10, 35], [d('bones', 1, 1, 2), d('iron_ore', 0.3, 1, 4), d('coal', 0.2, 1, 3), d('steel_helm', 0.015), d('mind_rune', 0.2, 4, 10)], { weak: 'melee' }),
      mon('golem', 'rock-golem', 40, 30, 40, 6, 3, [15, 40], [d('coal', 0.5, 2, 5), d('gold_ore', 0.15, 1, 2), d('uncut_emerald', 0.02)], { weak: 'magic' }),
      mon('troll', 'troll', 48, 36, 36, 7, 3, [20, 60], [d('troll_tusk', 0.4), d('big_bones', 1), d('uncut_emerald', 0.02), d('mithril_ore', 0.15, 1, 2)], { weak: 'ranged' }),
    ],
  },
  {
    id: 'swamp', icon: 'mushroom', recLvl: 32,
    monsters: [
      mon('snake', 'snake', 35, 38, 30, 6, 2.4, [12, 40], [d('venom_sac', 0.35), d('bones', 1), d('harralander_seed', 0.04)], { weak: 'magic' }),
      mon('scorpion', 'scorpion', 45, 44, 48, 7, 2.6, [20, 55], [d('venom_sac', 0.5), d('uncut_ruby', 0.01), d('chaos_rune', 0.15, 2, 6)], { weak: 'melee' }),
      mon('werewolf', 'werewolf', 60, 50, 42, 9, 2.4, [30, 80], [d('wolf_pelt', 0.8, 1, 2), d('big_bones', 1), d('ranarr_seed', 0.03)], { weak: 'ranged' }),
    ],
  },
  {
    id: 'ruins', icon: 'castle-ruins', recLvl: 45,
    monsters: [
      mon('specter', 'floating-ghost', 65, 52, 50, 10, 2.4, [40, 110], [d('ectoplasm', 0.5, 1, 2), d('mithril_sword', 0.015), d('uncut_ruby', 0.015), d('adamantite_ore', 0.12, 1, 2)], { weak: 'magic' }),
      mon('vampire', 'vampire-dracula', 80, 60, 55, 11, 2.4, [50, 130], [d('death_rune', 0.1, 1, 3), d('irit_seed', 0.03), d('big_bones', 1)], { weak: 'melee' }),
      mon('gargoyle', 'gargoyle', 105, 70, 80, 13, 3, [80, 180], [d('adamantite_ore', 0.25, 1, 3), d('runite_ore', 0.03), d('uncut_diamond', 0.008)], { weak: 'melee', slayer: 40 }),
    ],
  },
  {
    id: 'peaks', icon: 'crystal-cluster', recLvl: 55,
    monsters: [
      mon('bear', 'polar-bear', 100, 66, 60, 12, 2.6, [40, 100], [d('big_bones', 1), d('raw_shark', 0.2, 1, 2)], { weak: 'ranged' }),
      mon('ice_golem', 'ice-golem', 110, 70, 85, 13, 3, [60, 150], [d('ice_shard', 0.5, 1, 2), d('uncut_diamond', 0.006), d('water_rune', 0.3, 10, 30)], { weak: 'magic' }),
      mon('ogre', 'ogre', 130, 78, 70, 15, 3, [70, 160], [d('big_bones', 1, 2, 3), d('kwuarm_seed', 0.03), d('runite_ore', 0.03)], { weak: 'magic' }),
    ],
  },
  {
    id: 'lair', icon: 'dragon-head', recLvl: 65, reqQuest: 'dragon_threat',
    monsters: [
      mon('green_dragon', 'dragon-head', 85, 68, 68, 12, 2.8, [80, 220], [d('green_dhide', 1), d('dragon_bones', 1), d('runite_ore', 0.05), d('uncut_diamond', 0.01)], { weak: 'ranged' }),
      mon('red_dragon', 'spiked-dragon-head', 140, 90, 90, 18, 2.8, [200, 500], [d('dragon_bones', 1, 1, 2), d('rune_bar', 0.08, 1, 2), d('rune_sword', 0.01), d('uncut_diamond', 0.03)], { weak: 'magic' }),
      mon('wyvern', 'wyvern', 170, 95, 105, 20, 3, [250, 600], [d('dragon_bones', 1, 1, 2), d('blood_rune', 0.15, 2, 6), d('torstol_seed', 0.02)], { weak: 'ranged', slayer: 60 }),
    ],
  },
  {
    id: 'abyss', icon: 'magic-portal', recLvl: 80, reqQuest: 'abyss_gates',
    monsters: [
      mon('minotaur', 'minotaur', 190, 105, 100, 22, 2.8, [300, 700], [d('big_bones', 1, 2, 4), d('rune_body', 0.008), d('blood_rune', 0.12, 2, 5)], { weak: 'magic' }),
      mon('hydra', 'hydra', 240, 115, 120, 24, 3, [400, 900], [d('dragon_bones', 1, 2, 3), d('snapdragon_seed', 0.04), d('uncut_diamond', 0.03)], { weak: 'ranged', slayer: 80 }),
      mon('demon', 'devil-mask', 220, 120, 110, 26, 2.6, [450, 1000], [d('demon_ashes', 1), d('death_rune', 0.3, 5, 15), d('gem_chest', 0.01)], { weak: 'melee', slayer: 85 }),
    ],
  },
  {
    id: 'void', icon: 'vortex', recLvl: 90, reqQuest: 'void_herald',
    monsters: [
      mon('void_stalker', 'shadow-follower', 300, 150, 130, 29, 2.4, [500, 1100], [d('void_essence', 0.35), d('aetherium_ore', 0.25, 1, 2), d('blood_rune', 0.2, 3, 8), d('eternity_amulet', 0.002)], { weak: 'magic' }),
      mon('star_wraith', 'spectre', 340, 158, 145, 31, 2.6, [600, 1300], [d('void_essence', 0.5), d('starlight_shard', 0.05), d('death_rune', 0.3, 10, 20), d('uncut_diamond', 0.04)], { weak: 'melee' }),
      mon('abyssal_titan', 'daemon-skull', 420, 165, 160, 34, 3, [800, 1700], [d('aetherium_ore', 0.6, 2, 4), d('void_essence', 0.6, 1, 2), d('gem_chest', 0.02), d('void_blade', 0.003)], { weak: 'ranged', slayer: 90 }),
    ],
  },
  {
    id: 'celestial', icon: 'sun', recLvl: 105, reqQuest: 'heavens_fall',
    monsters: [
      mon('seraph', 'angel-outfit', 450, 180, 165, 36, 2.6, [1000, 2200], [d('starlight_shard', 0.3), d('void_essence', 0.4, 1, 2), d('astral_bow', 0.003)], { weak: 'ranged' }),
      mon('astral_golem', 'golem-head', 560, 175, 195, 35, 3, [1100, 2400], [d('aetherium_ore', 0.8, 2, 5), d('starlight_shard', 0.25), d('celestial_aegis', 0.003)], { weak: 'magic' }),
      mon('elder_wyrm', 'dragon-spiral', 520, 192, 175, 39, 2.8, [1400, 3000], [d('dragon_bones', 1, 3, 5), d('starlight_shard', 0.4, 1, 2), d('eclipse_staff', 0.003), d('gem_chest', 0.04)], { weak: 'ranged', slayer: 95 }),
    ],
  },
]
AREAS.forEach(a => named(a, `areas.${a.id}.name`, `areas.${a.id}.desc`))

export const MONSTERS = {}
AREAS.forEach(a => a.monsters.forEach(m => (MONSTERS[m.id] = cloneNamed(m, { area: a.id }))))
export const monsterLevel = m => Math.max(1, Math.round(0.25 * (m.def + m.hp) + 0.65 * m.att))

/* ---------- Bosses ---------- */
export const BOSSES = [
  mon('goblin_king', 'goblin-head', 160, 28, 25, 6, 2.6, [300, 600],
    [d('goblin_crown', 0.1), d('coin_pouch', 0.5, 1, 2), d('uncut_sapphire', 0.3, 1, 2)], { recLvl: 15, weak: 'magic', respawn: 8 }),
  mon('troll_lord', 'troll', 420, 58, 60, 11, 3, [800, 1600],
    [d('troll_hammer', 0.05), d('big_bones', 1, 3, 5), d('uncut_emerald', 0.3, 1, 2), d('gem_chest', 0.05)], { recLvl: 35, weak: 'ranged', respawn: 10 }),
  mon('kraken', 'kraken-tentacle', 800, 82, 80, 16, 3, [1800, 3500],
    [d('tide_bow', 0.04), d('raw_shark', 1, 5, 10), d('uncut_ruby', 0.3, 1, 2), d('gem_chest', 0.08)], { recLvl: 55, weak: 'magic', respawn: 12, reqQuest: 'sea_terror' }),
  mon('necromancer', 'skull-staff', 1200, 100, 95, 21, 2.8, [3000, 6000],
    [d('night_staff', 0.04), d('death_rune', 1, 20, 40), d('uncut_diamond', 0.25), d('gem_chest', 0.1)], { recLvl: 70, weak: 'melee', respawn: 14 }),
  mon('ancient_dragon', 'sea-dragon', 2500, 130, 130, 30, 3, [8000, 15000],
    [d('dragon_blade', 0.03), d('dragon_shield', 0.03), d('dragon_bones', 1, 5, 10), d('gem_chest', 0.2, 1, 2)], { recLvl: 90, weak: 'ranged', respawn: 18, reqQuest: 'dragon_slayer' }),
  mon('void_emperor', 'evil-wings', 4000, 170, 160, 37, 2.8, [15000, 30000],
    [d('crown_of_ages', 0.03), d('void_blade', 0.02), d('void_essence', 1, 5, 10), d('gem_chest', 0.3, 1, 2)], { recLvl: 100, weak: 'magic', respawn: 20, reqQuest: 'void_herald' }),
  mon('aether_sovereign', 'sun-priest', 6500, 210, 195, 45, 3, [30000, 60000],
    [d('sovereign_cape', 0.03), d('astral_bow', 0.02), d('eclipse_staff', 0.02), d('celestial_aegis', 0.02), d('starlight_shard', 1, 5, 10)], { recLvl: 115, weak: 'melee', respawn: 24, reqQuest: 'heavens_fall' }),
]
BOSSES.forEach(b => (b.boss = true))

export const MERCENARIES = [
  { id: 'squire', icon: 'checked-shield', cost: 250,  maxHit: 5 },
  { id: 'archer', icon: 'bowman',         cost: 1500, maxHit: 11 },
  { id: 'mage',   icon: 'wizard-face',    cost: 6000, maxHit: 20 },
]
MERCENARIES.forEach(m => named(m, `mercs.${m.id}.name`, `mercs.${m.id}.desc`))

/* ---------- Slayer ---------- */
export const SLAYER_SHOP = [
  { id: 'skip',        icon: 'cross-mark',        cost: 20 },
  { id: 'slayer_helm', icon: 'black-knight-helm', cost: 300, item: 'slayer_helm' },
  { id: 'slayer_cape', icon: 'vampire-cape',      cost: 800, item: 'slayer_cape' },
  { id: 'death_runes', icon: 'death-skull',       cost: 60,  items: { death_rune: 50 } },
  { id: 'herb_pack',   icon: 'plant-seed',        cost: 90,  items: { ranarr_seed: 3, kwuarm_seed: 2 } },
]
SLAYER_SHOP.forEach(s => named(s, `slayerShop.${s.id}.name`, `slayerShop.${s.id}.desc`))

/* ---------- Endless tower ---------- */
const TOWER_ICONS = ['goblin-head', 'skeleton', 'orc-head', 'troll', 'ghost', 'werewolf', 'cyclops', 'gargoyle', 'minotaur', 'wyvern', 'hydra', 'devil-mask', 'spiked-dragon-head']
const TOWER_TITLES = 7
export function towerMonster(floor) {
  const icon = TOWER_ICONS[Math.floor((floor - 1) / 5) % TOWER_ICONS.length]
  const title = Math.min(TOWER_TITLES - 1, Math.floor((floor - 1) / 15))
  const isBoss = floor % 10 === 0
  const hpMult = isBoss ? 1.5 : 1
  return named({
    id: 'tower_' + floor, icon,
    hp: Math.round((8 + floor * 5 + Math.pow(floor, 1.35)) * hpMult),
    att: Math.round((2 + floor * 1.4) * (isBoss ? 1.15 : 1)),
    def: Math.round((2 + floor * 1.4) * (isBoss ? 1.15 : 1)),
    maxHit: Math.max(1, Math.round((1 + floor * 0.3) * (isBoss ? 1.2 : 1))),
    speed: 2.4, gold: [floor * 2, floor * 4], drops: [], tower: true, floor,
    weak: ['melee', 'ranged', 'magic'][floor % 3],
  }, () => t('tower.monster', { title: t(`tower.titles.${title}`), floor }) + (isBoss ? ' ★' : ''))
}
export const TOWER_SHOP = [
  { id: 'tower_cape',    icon: 'cape',                cost: 120, item: 'tower_cape' },
  { id: 'tower_cape2',   icon: 'cape',                cost: 900, item: 'tower_cape2' },
  { id: 'gem_chest',     icon: 'open-treasure-chest', cost: 35,  items: { gem_chest: 1 } },
  { id: 'wisdom_elixir', icon: 'bubbling-flask',      cost: 25,  items: { wisdom_elixir: 1 } },
]
TOWER_SHOP.forEach(s => named(s, `towerShop.${s.id}.name`, `towerShop.${s.id}.desc`))

/* ---------- Dungeons: several rooms in a row, a final boss and a chest ---------- */
// Slayer level requirements are ignored inside dungeons
export const DUNGEONS = [
  { id: 'goblin_warren', icon: 'goblin-camp', recLvl: 8,
    rooms: ['goblin', 'rat', 'goblin', 'goblin'],
    boss: mon('warren_chief', 'goblin-head', 45, 16, 14, 4, 2.4, [40, 90], [d('bronze_body', 0.1), d('air_rune', 1, 10, 25)], { boss: true }),
    chest: [d('coin_pouch', 1, 1, 2), d('uncut_sapphire', 0.3), d('iron_sword', 0.12), d('potato_seed', 0.6, 3, 6)] },
  { id: 'crypt', icon: 'castle-ruins', recLvl: 25,
    rooms: ['skeleton', 'skeleton', 'golem', 'skeleton'],
    boss: mon('skeleton_king', 'crowned-skull', 130, 36, 32, 8, 2.6, [150, 320], [d('big_bones', 1, 2, 4), d('steel_body', 0.08)], { boss: true, weak: 'melee' }),
    chest: [d('coin_pouch', 1, 2, 3), d('uncut_emerald', 0.3), d('steel_sword', 0.15), d('death_rune', 0.3, 5, 15), d('gem_chest', 0.05)] },
  { id: 'serpent_temple', icon: 'snake-totem', recLvl: 40,
    rooms: ['snake', 'scorpion', 'snake', 'werewolf'],
    boss: mon('naga', 'snake', 230, 56, 52, 12, 2.6, [300, 650], [d('venom_sac', 1, 2, 4), d('ranarr_seed', 0.3, 1, 2)], { boss: true, weak: 'magic' }),
    chest: [d('coin_pouch', 1, 3, 5), d('uncut_ruby', 0.3), d('mithril_bar', 0.5, 2, 5), d('ranarr_seed', 0.3, 1, 3), d('gem_chest', 0.08)] },
  { id: 'frost_keep', icon: 'ice-golem', recLvl: 58,
    rooms: ['bear', 'ice_golem', 'ogre', 'ice_golem'],
    boss: mon('winter_queen', 'ice-spell-cast', 400, 82, 80, 16, 2.8, [700, 1400], [d('ice_shard', 1, 3, 6), d('uncut_diamond', 0.05)], { boss: true, weak: 'magic' }),
    chest: [d('coin_pouch', 1, 4, 6), d('adamant_bar', 0.5, 2, 5), d('uncut_diamond', 0.12), d('kwuarm_seed', 0.3, 1, 3), d('gem_chest', 0.12)] },
  { id: 'dragon_vault', icon: 'spiked-dragon-head', recLvl: 75, reqQuest: 'dragon_threat',
    rooms: ['green_dragon', 'wyvern', 'red_dragon'],
    boss: mon('bronze_wyrm', 'dragon-breath', 620, 108, 106, 22, 2.8, [1500, 3200], [d('dragon_bones', 1, 3, 5), d('dragon_shield', 0.01)], { boss: true, weak: 'ranged' }),
    chest: [d('coin_pouch', 1, 6, 10), d('rune_bar', 0.4, 1, 3), d('dragon_bones', 1, 3, 6), d('gem_chest', 0.25), d('torstol_seed', 0.15)] },
  { id: 'void_sanctum', icon: 'magic-portal', recLvl: 95, reqQuest: 'void_herald',
    rooms: ['void_stalker', 'star_wraith', 'void_stalker', 'abyssal_titan'],
    boss: mon('rift_warden', 'tentacles-skull', 1500, 165, 155, 34, 2.8, [4000, 8000], [d('void_essence', 1, 3, 6), d('eternity_amulet', 0.02)], { boss: true, weak: 'ranged' }),
    chest: [d('coin_pouch', 1, 8, 12), d('aetherium_ore', 0.6, 3, 6), d('void_essence', 1, 2, 4), d('starlight_shard', 0.2), d('gem_chest', 0.3)] },
]
DUNGEONS.forEach(dg => {
  dg.boss.dungeon = dg.id
  named(dg, `dungeons.${dg.id}.name`, `dungeons.${dg.id}.desc`)
})
