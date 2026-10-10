import { named } from '../../i18n/bind.js'
import { t, intlLocale } from '../../i18n/index.js'

/* ---------------- Quests ---------------- */
// Objectives: { type: 'item', item, qty } (handed in) | { type: 'kill', monster, qty } | { type: 'level', skill, lvl }
//             { type: 'tower', floor } | { type: 'slayer', tasks }
const item = (i, q) => ({ type: 'item', item: i, qty: q })
const kill = (m, q) => ({ type: 'kill', monster: m, qty: q })
const level = (s, l) => ({ type: 'level', skill: s, lvl: l })

export const QUESTS = [
  { id: 'first_steps', icon: 'mining',
    req: {}, obj: [item('copper_ore', 10), item('tin_ore', 10)], reward: { gold: 150, xp: { mining: 400 }, items: { bronze_sword: 1 }, qp: 1 } },
  { id: 'cook_assistant', icon: 'cooking-pot',
    req: {}, obj: [item('shrimp', 10), item('sardine', 5)], reward: { gold: 200, xp: { cooking: 800, fishing: 400 }, qp: 1 } },
  { id: 'goblin_trouble', icon: 'goblin-head',
    req: {}, obj: [kill('goblin', 15)], reward: { gold: 300, xp: { attack: 900, strength: 900 }, items: { bronze_helm: 1 }, qp: 1 } },
  { id: 'lumberjack', icon: 'wood-axe',
    req: { levels: { woodcutting: 15 } }, obj: [item('oak_logs', 30)], reward: { gold: 500, xp: { woodcutting: 2000 }, qp: 1 } },
  { id: 'smith_apprentice', icon: 'anvil-impact',
    req: { quests: ['first_steps'] }, obj: [item('iron_bar', 10), item('iron_sword', 1)], reward: { gold: 800, xp: { smithing: 3000 }, qp: 1 } },
  { id: 'green_thumb', icon: 'sprout',
    req: { levels: { farming: 5 } }, obj: [item('potato', 30), item('onion', 20)], reward: { gold: 600, xp: { farming: 3500 }, items: { guam_seed: 10, marrentill_seed: 5 }, qp: 1 } },
  { id: 'wolf_hunt', icon: 'wolf-head',
    req: { levels: { attack: 10 } }, obj: [kill('wolf', 25), item('wolf_pelt', 10)], reward: { gold: 1200, xp: { defense: 2500, ranged: 2500 }, items: { oak_bow: 1, iron_arrow: 150 }, qp: 2 } },
  { id: 'arcane_studies', icon: 'spell-book',
    req: { levels: { runecrafting: 5 } }, obj: [item('air_rune', 200), item('mind_rune', 100)], reward: { gold: 800, xp: { magic: 3000, runecrafting: 2500 }, items: { water_rune: 200, earth_rune: 200, fire_rune: 200, wizard_hat: 1 }, qp: 2 } },
  { id: 'thief_guild', icon: 'robber',
    req: { levels: { thieving: 20 } }, obj: [level('thieving', 30), item('coin_pouch', 1)], reward: { gold: 3000, xp: { thieving: 6000, agility: 2000 }, qp: 2 } },
  { id: 'herbalist', icon: 'round-potion',
    req: { levels: { herblore: 8 } }, obj: [item('attack_potion', 5), item('defense_potion', 5)], reward: { gold: 2500, xp: { herblore: 5000 }, items: { vial_water: 50 }, qp: 2 } },
  { id: 'bone_collector', icon: 'crossed-bones',
    req: { levels: { prayer: 15 } }, obj: [item('big_bones', 40)], reward: { gold: 2000, xp: { prayer: 9000 }, qp: 2 } },
  { id: 'undead_menace', icon: 'skeleton',
    req: { quests: ['goblin_trouble'], levels: { attack: 20 } }, obj: [kill('skeleton', 40), kill('golem', 15)], reward: { gold: 4500, xp: { attack: 6000, defense: 6000, hitpoints: 3000 }, items: { steel_body: 1 }, qp: 2 } },
  { id: 'gemcutter', icon: 'cut-diamond',
    req: { levels: { crafting: 27 } }, obj: [item('sapphire', 3), item('emerald', 2)], reward: { gold: 5000, xp: { crafting: 12000 }, items: { gold_bar: 10 }, qp: 2 } },
  { id: 'agile_explorer', icon: 'sprint',
    req: { levels: { agility: 30 } }, obj: [item('mark_of_grace', 10)], reward: { gold: 8000, xp: { agility: 20000 }, qp: 2 } },
  { id: 'slayer_initiate', icon: 'death-skull',
    req: { levels: { slayer: 5 } }, obj: [{ type: 'slayer', tasks: 5 }], reward: { gold: 3000, xp: { slayer: 10000 }, slayerPoints: 50, qp: 2 } },
  { id: 'sea_terror', icon: 'kraken-tentacle',
    req: { levels: { fishing: 40 } }, obj: [item('raw_lobster', 50), kill('troll', 20)], reward: { gold: 6000, xp: { fishing: 12000 }, qp: 3, unlock: 'unlocks.kraken' } },
  { id: 'tower_climber', icon: 'stone-tower',
    req: {}, obj: [{ type: 'tower', floor: 25 }], reward: { gold: 15000, items: { wisdom_elixir: 3 }, qp: 3 } },
  { id: 'dragon_threat', icon: 'dragon-head',
    req: { quests: ['undead_menace', 'wolf_hunt'], levels: { attack: 40, defense: 40 } }, obj: [kill('werewolf', 30), item('ectoplasm', 10)],
    reward: { gold: 12000, xp: { attack: 15000, strength: 15000, defense: 15000 }, qp: 4, unlock: 'unlocks.lair' } },
  { id: 'master_smith', icon: 'anvil',
    req: { quests: ['smith_apprentice'], levels: { smithing: 60 } }, obj: [item('mithril_body', 1), item('adamant_bar', 10)], reward: { gold: 20000, xp: { smithing: 50000 }, qp: 3 } },
  { id: 'abyss_gates', icon: 'magic-portal',
    req: { quests: ['dragon_threat', 'arcane_studies'], levels: { magic: 55 } }, obj: [kill('red_dragon', 25), item('blood_rune', 50)],
    reward: { gold: 50000, xp: { magic: 40000 }, qp: 5, unlock: 'unlocks.abyss' } },
  { id: 'dragon_slayer', icon: 'sea-dragon',
    req: { quests: ['abyss_gates'] }, obj: [kill('demon', 40), kill('wyvern', 30)],
    reward: { gold: 100000, xp: { attack: 50000, strength: 50000, defense: 50000, hitpoints: 50000 }, qp: 6, unlock: 'unlocks.ancient_dragon' } },
  { id: 'void_herald', icon: 'vortex',
    req: { quests: ['dragon_slayer'], levels: { slayer: 70 } }, obj: [kill('demon', 60), kill('hydra', 30), item('blood_rune', 200)],
    reward: { gold: 150000, xp: { slayer: 60000, magic: 40000 }, qp: 6, unlock: 'unlocks.void' } },
  { id: 'heavens_fall', icon: 'sun',
    req: { quests: ['void_herald'] }, obj: [kill('abyssal_titan', 40), item('aether_bar', 20), item('void_essence', 50)],
    reward: { gold: 300000, xp: { attack: 100000, strength: 100000, defense: 100000, ranged: 100000, magic: 100000 }, qp: 8, unlock: 'unlocks.celestial' } },
]
QUESTS.forEach(q => {
  named(q, `quests.${q.id}.name`, `quests.${q.id}.desc`)
  Object.defineProperty(q, 'giver', { get: () => t(`quests.${q.id}.giver`), enumerable: true })
})

/* ---------------- Achievements ---------------- */
// Names and descriptions come from `ach.<group>` templates that receive the threshold `n`
const ach = (id, group, n, icon, check, gold) => {
  const a = { id, icon, check, gold }
  const num = () => (typeof n === 'number' ? n.toLocaleString(intlLocale()) : n)
  return named(a, () => t(`ach.${group}.name`, { n: num() }), () => t(`ach.${group}.desc`, { n: num() }))
}
const tiers = (group, list, icon, check) => list.map(([n, g]) => ach(`${group}_${n}`, group, n, icon, G => check(G, n), g))
export const ACHIEVEMENTS = [
  ...tiers('total', [[50, 100], [100, 300], [250, 1000], [500, 5000], [1000, 25000], [1500, 100000]], 'star-medal', (G, n) => G.totalLevel() >= n),
  ...tiers('skill', [[10, 100], [50, 3000], [99, 50000]], 'laurels-trophy', (G, n) => G.maxSkillLevel() >= n),
  ...tiers('kills', [[10, 50], [100, 500], [1000, 5000], [10000, 50000]], 'crossed-swords', (G, n) => G.s.stats.kills >= n),
  ...tiers('gold', [[1000, 100], [100000, 5000], [1000000, 50000], [10000000, 250000]], 'coins-pile', (G, n) => G.s.stats.goldEarned >= n),
  ...tiers('actions', [[100, 50], [1000, 500], [10000, 5000], [100000, 40000]], 'hourglass', (G, n) => G.s.stats.actions >= n),
  ...tiers('quests', [[1, 100], [5, 2000], [10, 10000]], 'scroll-unfurled', (G, n) => G.questsDone() >= n),
  ach('quests_21', 'questsAll', QUESTS.length, 'scroll-unfurled', G => G.questsDone() >= QUESTS.length, 100000),
  ...tiers('tower', [[10, 1000], [50, 10000], [100, 50000]], 'stone-tower', (G, n) => G.s.tower.best >= n),
  ...tiers('slayer', [[1, 200], [10, 3000], [50, 25000]], 'death-skull', (G, n) => G.s.slayer.completed >= n),
  ...tiers('hero', [[10, 1000], [25, 10000], [50, 75000], [100, 1000000]], 'laurel-crown', (G, n) => G.heroLevel() >= n),
  ...tiers('mastery', [[25, 1000], [50, 10000], [99, 200000]], 'laurels-trophy', (G, n) => G.maxMastery() >= n),
  ...tiers('harvest', [[10, 200], [100, 3000], [1000, 30000]], 'sickle', (G, n) => (G.s.stats.harvests || 0) >= n),
  ach('hire_1', 'hire', 1, 'beer-horn', G => G.s.tavern.workers.length >= 1, 300),
  ach('tavern_5', 'tavernMax', 5, 'beer-horn', G => G.s.tavern.level >= 5, 100000),
  ...tiers('exp', [[1, 200], [25, 5000], [100, 30000]], 'treasure-map', (G, n) => (G.s.stats.expeditions || 0) >= n),
  ...tiers('orders', [[1, 100], [30, 8000], [100, 40000]], 'scroll-unfurled', (G, n) => (G.s.stats.orders || 0) >= n),
  ...tiers('dungeon', [[1, 500], [50, 20000], [250, 120000]], 'open-treasure-chest', (G, n) => (G.s.stats.dungeons || 0) >= n),
  ach('grace_max', 'graceMax', 7, 'star-swirl', G => G.s.grace >= 7, 50000),
  ach('dice_100', 'dice', 100, 'perspective-dice-six-faces-random', G => G.s.tavern.dice.played >= 100, 2000),
  ach('prestige_1', 'prestige1', 1, 'sparkles', G => G.totalPrestige() >= 1, 50000),
  ach('prestige_5', 'prestige5', 5, 'sparkles', G => G.totalPrestige() >= 5, 250000),
  ach('first_death', 'firstDeath', 1, 'broken-skull', G => G.s.stats.deaths >= 1, 50),
  ach('burnt', 'burnt', 1, 'fishbone', G => G.s.stats.burnt >= 1, 25),
  ach('rare_drop', 'rareDrop', 1, 'open-treasure-chest', G => G.s.stats.rares >= 1, 5000),
  ach('full_gear', 'fullGear', 8, 'chest-armor', G => Object.values(G.s.equipment).every(Boolean), 2500),
  ach('house_10', 'house', 10, 'family-house', G => Object.values(G.s.rooms).reduce((a, b) => a + b, 0) >= 10, 10000),
  ...['goblin_king', 'troll_lord', 'kraken', 'necromancer', 'ancient_dragon', 'void_emperor', 'aether_sovereign'].map((b, i) =>
    ach('boss_' + b, 'boss_' + b, 1, 'trophy', G => (G.s.killsBy[b] || 0) >= 1, [1000, 5000, 15000, 30000, 100000, 250000, 500000][i])),
  ...tiers('pets', [[1, 1000], [5, 10000], [10, 50000]], 'paw-print', (G, n) => G.petCount() >= n),
  ach('pets_all', 'petsAll', 'all', 'paw-print', G => G.petsComplete(), 250000),
  ...tiers('petLevel', [[10, 5000], [20, 50000]], 'paw-print', (G, n) => G.maxPetLevel() >= n),
  ach('weekly_1', 'weeklyFirst', 1, 'crowned-skull', G => G.weeklySlainCount() >= 1, 25000),
  ach('weekly_all', 'weeklyAll', 6, 'crowned-skull', G => G.weeklySlainCount() >= 6, 300000),
  ach('forge_mythic', 'forgeMythic', 1, 'anvil-impact', G => (G.s.relicForge?.forgedMythic || 0) >= 1, 100000),
  ...tiers('reforge', [[25, 5000], [100, 30000]], 'anvil', (G, n) => (G.s.relicForge?.reforged || 0) >= n),
  ach('pet_soulbound', 'petSoulbound', 100, 'glass-heart', G => G.maxPetBond() >= 100, 50000),
  ...tiers('enchant', [[5, 2000], [10, 50000]], 'upgrade', (G, n) => G.maxEnchant() >= n),
  ...tiers('streak', [[3, 1000], [7, 5000], [30, 50000]], 'flame', (G, n) => (G.s.daily?.bestStreak || 0) >= n),
  ...tiers('dailies', [[10, 2000], [100, 25000]], 'calendar', (G, n) => (G.s.daily?.claimed || 0) >= n),
  ...tiers('beasts', [[10, 2000], [25, 20000]], 'open-book', (G, n) => G.bestiaryProgress().seen >= n),
  ach('beasts_all', 'beastsAll', 'all', 'open-book', G => G.bestiaryProgress().seen >= G.bestiaryProgress().total, 150000),
  ...tiers('hunted', [[1, 2500], [10, 40000]], 'archery-target', (G, n) => G.huntedCount() >= n),
  ...tiers('ascend', [[1, 5000], [5, 100000]], 'ankh', (G, n) => (G.s.ascension?.count || 0) >= n),
  ...tiers('omens', [[5, 2000], [25, 20000], [100, 100000]], 'crystal-ball', (G, n) => G.omensSeen() >= n),
  ach('omens_all', 'omensAll', 'all', 'all-seeing-eye', G => G.omensSeenKinds() >= G.omenKinds(), 250000),
  ...tiers('wishes', [[1, 5000], [10, 50000]], 'burning-meteor', (G, n) => G.wishCount() >= n),
  ach('relic_mythic', 'relicMythic', 1, 'floating-crystal', G => (G.s.omens.relics.mythic || 0) >= 1, 50000),
  ach('set_full', 'setFull', 1, 'breastplate', G => G.activeSets().some(x => x.worn === x.set.pieces.length), 3000),
]

/* ---------------- Home ---------------- */
// cost(l) -> { gold, items } needed to build level l + 1
const scale = (base, mult, l) => Math.floor(base * Math.pow(mult, l))
const roomDesc = (id, value) => l => t(`rooms.${id}.desc`, { v: value(l) })
export const ROOMS = [
  { id: 'tools', icon: 'gears', max: 5, desc: roomDesc('tools', l => l * 6),
    cost: l => ({ gold: scale(400, 3, l), items: { logs: 20 * (l + 1), iron_bar: 4 * l } }) },
  { id: 'workshop', icon: 'anvil', max: 5, desc: roomDesc('workshop', l => l * 6),
    cost: l => ({ gold: scale(600, 3, l), items: { oak_logs: 15 * (l + 1), iron_bar: 5 * (l + 1) } }) },
  { id: 'library', icon: 'bookshelf', max: 5, desc: roomDesc('library', l => l * 4),
    cost: l => ({ gold: scale(1000, 3, l), items: { willow_logs: 10 * (l + 1), leather: 5 * (l + 1) } }) },
  { id: 'vault', icon: 'locked-chest', max: 5, desc: roomDesc('vault', l => l * 6),
    cost: l => ({ gold: scale(1500, 3, l), items: { steel_bar: 5 * (l + 1), gold_bar: 2 * l } }) },
  { id: 'garden', icon: 'plant-watering', max: 3, desc: roomDesc('garden', l => l),
    cost: l => ({ gold: scale(2000, 4, l), items: { oak_logs: 30 * (l + 1), potato: 20 * (l + 1) } }) },
  { id: 'kitchen', icon: 'cooking-pot', max: 3, desc: l => t('rooms.kitchen.desc', { burn: l * 30, heal: l * 10 }),
    cost: l => ({ gold: scale(1200, 3, l), items: { iron_bar: 8 * (l + 1), stew: 5 * l } }) },
  { id: 'trophy', icon: 'trophy-cup', max: 5, desc: roomDesc('trophy', l => l * 4),
    cost: l => ({ gold: scale(2500, 3, l), items: { wolf_pelt: 5 * (l + 1), troll_tusk: 2 * l } }) },
  { id: 'armory', icon: 'swords-emblem', max: 5, desc: roomDesc('armory', l => l * 5),
    cost: l => ({ gold: scale(2500, 3, l), items: { steel_bar: 6 * (l + 1), mithril_bar: 2 * l } }) },
  { id: 'chapel', icon: 'candle-light', max: 3, desc: roomDesc('chapel', l => l * 25),
    cost: l => ({ gold: scale(3000, 3, l), items: { big_bones: 10 * (l + 1), gold_bar: 2 * (l + 1) } }) },
  { id: 'bedroom', icon: 'wood-cabin', max: 4, desc: roomDesc('bedroom', l => 8 + l * 2),
    cost: l => ({ gold: scale(2000, 3.5, l), items: { maple_logs: 10 * (l + 1), cowhide: 10 * (l + 1) } }) },
]
ROOMS.forEach(r => named(r, `rooms.${r.id}.name`))

/* ---------------- Church ---------------- */
export const BLESSING_DURATION = 1800
export const BLESSINGS = [
  { id: 'wisdom',     icon: 'open-book',    lvl: 1,  cost: 200 },
  { id: 'protection', icon: 'magic-shield', lvl: 10, cost: 500 },
  { id: 'fortune',    icon: 'two-coins',    lvl: 20, cost: 1000 },
  { id: 'vigor',      icon: 'muscle-up',    lvl: 35, cost: 2500 },
  { id: 'diligence',  icon: 'hourglass',    lvl: 50, cost: 5000 },
  { id: 'grace',      icon: 'angel-wings',  lvl: 70, cost: 15000 },
]
BLESSINGS.forEach(b => named(b, `blessings.${b.id}.name`, `blessings.${b.id}.desc`))

/* ---------------- Shop ---------------- */
export const SHOP = [
  { cat: 'supplies', items: [['vial_water', 6], ['guam', 28], ['feathers', 3], ['rune_essence', 6], ['raw_shrimp', 4], ['bait_worms', 3]] },
  { cat: 'seeds', items: [['potato_seed', 5], ['flax_seed', 7], ['onion_seed', 10], ['tomato_seed', 18], ['guam_seed', 30], ['marrentill_seed', 50], ['tarromin_seed', 85], ['strawberry_seed', 75]] },
  { cat: 'runes', items: [['air_rune', 5], ['mind_rune', 5], ['water_rune', 6], ['earth_rune', 6], ['fire_rune', 7], ['chaos_rune', 55]] },
  { cat: 'tools', items: [['bronze_pickaxe', 40], ['bronze_axe', 40], ['rod', 35], ['iron_pickaxe', 160], ['iron_axe', 160], ['oak_rod', 140], ['steel_pickaxe', 600], ['steel_axe', 600], ['willow_rod', 500]] },
  { cat: 'gear', items: [['bronze_sword', 40], ['bronze_shield', 70], ['bow', 60], ['bronze_arrow', 3], ['apprentice_staff', 80], ['wizard_hat', 150], ['wizard_robe', 300], ['leather_body', 90]] },
]
SHOP.forEach(c => named(c, `shop.cats.${c.cat}`))

/* ---------------- Prestige ---------------- */
export const PRESTIGE = { xpPerLevel: 0.10, speedPerLevel: 0.05, globalXp: 0.01 }
