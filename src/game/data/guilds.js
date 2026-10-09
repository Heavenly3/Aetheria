import { AREAS, monsterLevel } from './combat.js'
import { ACTIONS } from './actions.js'
import { ITEMS } from './items.js'
import { XP_TABLE } from './skills.js'
import { rollName } from './journal.js'

/*
  Guilds: a dozen of them are founded with every new game, each with its own name, crest, motto,
  leader, members, standing (tier 1–5) and focus (one role, a few roles, or open to all).
  Joining takes the guild's requirements, a fee and an entry trial (a task and a puzzle); members take
  contracts for marks and reputation, climb its ranks, earn its perk and spend marks in its shop.
  Names are stored as ids and read from `guilds.*` in the locales.
*/

export const GUILD_COUNT = 12
export const ROLE_IDS = ['warrior', 'ranger', 'mage', 'artisan', 'rogue', 'paladin']
// Tiers of the twelve guilds, weakest first; a tier 1 guild only asks for its fee
const TIER_SPREAD = [1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5]
export const MAX_TIER = 5

// The skills a guild of each role cares about
export const ROLE_SKILLS = {
  warrior: ['attack', 'strength'],
  ranger: ['ranged', 'fletching'],
  mage: ['magic', 'runecrafting'],
  artisan: ['smithing', 'crafting'],
  rogue: ['thieving', 'agility'],
  paladin: ['defense', 'prayer'],
}
export const ROLE_ICONS = { warrior: 'crossed-swords', ranger: 'bow-arrow', mage: 'wizard-staff', artisan: 'anvil-impact', rogue: 'robber', paladin: 'holy-symbol' }

// Words for the name: "<group> of <emblem>"; each focus prefers some of them
export const GROUPS = ['order', 'brotherhood', 'circle', 'company', 'lodge', 'pact', 'guild', 'house', 'hand', 'watch', 'conclave', 'legion', 'league', 'temple']
const GROUPS_BY = {
  warrior: ['legion', 'company', 'order', 'watch'],
  ranger: ['lodge', 'watch', 'company', 'circle'],
  mage: ['circle', 'conclave', 'order'],
  artisan: ['guild', 'house', 'league'],
  rogue: ['hand', 'brotherhood', 'pact'],
  paladin: ['order', 'temple', 'watch'],
  multi: ['company', 'brotherhood', 'league', 'pact', 'house'],
  open: ['league', 'house', 'company', 'guild'],
}
export const EMBLEMS = {
  silver_wolf: 'wolf-head', ashen_crown: 'crown', hidden_blade: 'hooded-assassin', golden_anvil: 'anvil-impact',
  fallen_star: 'falling-star', iron_oak: 'oak', black_raven: 'raven', crimson_sun: 'sun', seven_flames: 'flame',
  endless_eclipse: 'eclipse', open_eye: 'all-seeing-eye', grey_storm: 'tornado', twin_serpents: 'snake', white_owl: 'owl',
  red_fox: 'fox-head', great_bear: 'bear-head', pale_spectre: 'spectre', last_dragon: 'dragon-head', open_book: 'open-book',
  shining_sword: 'shining-sword', dawn_sigil: 'holy-symbol', deep_crystal: 'crystal-cluster', golden_coin: 'two-coins', laurel: 'laurel-crown',
}
const EMBLEMS_BY = {
  warrior: ['silver_wolf', 'great_bear', 'shining_sword', 'crimson_sun', 'last_dragon'],
  ranger: ['red_fox', 'white_owl', 'iron_oak', 'grey_storm', 'black_raven'],
  mage: ['open_eye', 'endless_eclipse', 'fallen_star', 'open_book', 'deep_crystal', 'seven_flames'],
  artisan: ['golden_anvil', 'deep_crystal', 'iron_oak', 'seven_flames', 'golden_coin'],
  rogue: ['hidden_blade', 'black_raven', 'pale_spectre', 'twin_serpents', 'golden_coin'],
  paladin: ['dawn_sigil', 'shining_sword', 'crimson_sun', 'laurel', 'white_owl'],
}
export const MOTTOS = ['steel', 'together', 'patience', 'shadows', 'stars', 'forge', 'oath', 'hunt', 'coin', 'dawn', 'roots', 'storm', 'silence', 'glory', 'craft', 'road']
const COLORS = ['#c0392b', '#2e8b57', '#2f6fdf', '#c9a04a', '#9d3fbf', '#3fb6c6', '#d35400', '#7a8a9a', '#e84393', '#16a085', '#8e44ad', '#b8862e']
export const PUZZLES = ['riddle', 'sequence', 'lock']

// Ranks inside a guild, by reputation
export const RANKS = [
  { id: 'initiate', rep: 0 },
  { id: 'member', rep: 120 },
  { id: 'adept', rep: 350 },
  { id: 'veteran', rep: 800 },
  { id: 'officer', rep: 1600 },
  { id: 'master', rep: 3000 },
]
export const rankIndex = rep => { let i = 0; RANKS.forEach((r, j) => { if (rep >= r.rep) i = j }); return i }

/* ---------------- requirements ---------------- */
const HERO_REQ = [0, 1, 12, 30, 55, 75]
const SKILL_REQ = [0, 1, 20, 40, 60, 80]
const TOTAL_REQ = [0, 0, 200, 450, 800, 1150]
export const FEES = [0, 100, 2500, 20000, 120000, 500000]

export function guildRequirements(g) {
  const out = [{ kind: 'hero', n: HERO_REQ[g.tier] }]
  if (g.focus === 'open') out.push({ kind: 'total', n: TOTAL_REQ[g.tier] })
  else if (g.focus === 'multi') g.roles.forEach(r => out.push({ kind: 'skill', skill: ROLE_SKILLS[r][0], n: Math.round(SKILL_REQ[g.tier] * 0.8) }))
  else ROLE_SKILLS[g.focus].forEach(skill => out.push({ kind: 'skill', skill, n: SKILL_REQ[g.tier] }))
  return out.filter(r => r.n > 1)
}
// Whose heroes a guild takes: open guilds take everyone
export const acceptsRole = (g, role) => g.focus === 'open' || g.roles.includes(role)

/* ---------------- perks ---------------- */
// The perk at the top rank of a tier 3 guild; lower ranks and tiers get a share of it
const ROLE_PERKS = {
  warrior: { meleeDmg: 0.1, meleeAcc: 0.06 },
  ranger: { rangedDmg: 0.1, rangedAcc: 0.06 },
  mage: { magicDmg: 0.12, runeSave: 0.1 },
  artisan: { 'speed.artisan': 0.08, preserve: 0.05 },
  rogue: { gold: 0.1, thieving: 0.08, loot: 0.04 },
  paladin: { defense: 0.1, heal: 0.15 },
}
const OPEN_PERK = { xp: 0.05, gold: 0.06 }
const TIER_PERK = [0, 0.6, 0.8, 1, 1.2, 1.4]
export function guildPerk(g, rank) {
  const base = {}
  if (g.focus === 'open') Object.assign(base, OPEN_PERK)
  else {
    const share = g.focus === 'multi' ? 0.55 : 1
    for (const r of g.roles) for (const [k, v] of Object.entries(ROLE_PERKS[r])) base[k] = (base[k] || 0) + v * share
  }
  const f = ((rank + 1) / RANKS.length) * TIER_PERK[g.tier]
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * f * 1000) / 1000]))
}

/* ---------------- founding the guilds ---------------- */
export function seeded(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
export function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const pick = (rng, a) => a[Math.floor(rng() * a.length)]

// The focus of every guild: each role gets one guild of its own, the rest are shared or open.
// The hero's own role always has a tier 1 guild, so there is somewhere to start
function focuses(rng, heroRole) {
  const roles = [...ROLE_IDS].sort(() => rng() - 0.5)
  const list = roles.map(r => ({ focus: r, roles: [r] }))
  for (let i = 0; i < 3; i++) {
    const a = [...ROLE_IDS].sort(() => rng() - 0.5).slice(0, 2 + (rng() < 0.3 ? 1 : 0))
    list.push({ focus: 'multi', roles: a })
  }
  list.push({ focus: 'open', roles: [] }, { focus: 'open', roles: [] }, { focus: heroRole, roles: [heroRole] })
  return list
}

export function foundGuilds(seed, heroRole = 'warrior') {
  const rng = seeded(seed)
  const shapes = focuses(rng, heroRole).sort(() => rng() - 0.5)
  // The hero's role needs a guild in tier 1: swap one of theirs into the first slot
  const own = shapes.findIndex(s => s.focus === heroRole)
  ;[shapes[0], shapes[own]] = [shapes[own], shapes[0]]
  const used = new Set(), usedEmblems = new Set(), usedNames = new Set()
  return shapes.map((shape, i) => {
    const tier = TIER_SPREAD[i]
    const flavour = shape.focus === 'multi' || shape.focus === 'open' ? pick(rng, ROLE_IDS) : shape.focus
    let group, emblem
    for (let tries = 0; tries < 40; tries++) {
      group = pick(rng, GROUPS_BY[shape.focus])
      emblem = pick(rng, tries < 20 ? EMBLEMS_BY[flavour] : Object.keys(EMBLEMS))
      if (!used.has(group + emblem) && !usedEmblems.has(emblem)) break
    }
    used.add(group + emblem); usedEmblems.add(emblem)
    let leader
    do leader = rollName(rng, rng() < 0.5 ? 'he' : 'she')
    while (usedNames.has(leader))
    usedNames.add(leader)
    return {
      id: 'g' + i, tier, focus: shape.focus, roles: shape.roles, group, emblem,
      color: COLORS[i % COLORS.length], motto: pick(rng, MOTTOS), puzzle: pick(rng, PUZZLES),
      leader, leaderRole: shape.roles.length ? pick(rng, shape.roles) : pick(rng, ROLE_IDS),
      // renown at founding and how much it grows a day; members at founding
      renown: Math.round(tier * 900 + rng() * 700), growth: Math.round(tier * 30 + rng() * 60),
      members: Math.round(6 + tier * 5 + rng() * 14), seed: Math.floor(rng() * 1e9),
    }
  }).sort((a, b) => a.tier - b.tier)
}

// The guild's renown on a given day, with a little noise so the table moves
export function renownOn(g, day, founded) {
  const days = Math.max(0, day - founded)
  const wobble = seeded(g.seed + day)() * g.growth
  return Math.round(g.renown + g.growth * days + wobble)
}

// Members of a guild (the leader first); rolled from the guild's seed so they stay the same
const SHE = ['she', 'he']
export function guildRoster(g, day, founded) {
  const rng = seeded(g.seed)
  const days = Math.max(0, day - founded)
  const n = g.members + Math.floor(days / 3)
  const out = [{ name: g.leader, role: g.leaderRole, rank: RANKS.length - 1, level: Math.min(99, 20 + g.tier * 15 + Math.floor(rng() * 10)), contrib: Math.round(g.renown * 0.4), leader: true }]
  const names = new Set([g.leader])
  for (let i = 1; i < n; i++) {
    let name
    do name = rollName(rng, pick(rng, SHE))
    while (names.has(name))
    names.add(name)
    const rank = Math.min(RANKS.length - 2, Math.floor(rng() * rng() * (RANKS.length - 1) + (g.tier > 3 ? 1 : 0)))
    out.push({
      name, role: g.roles.length ? pick(rng, g.roles) : pick(rng, ROLE_IDS), rank,
      level: Math.max(1, Math.min(99, Math.round(g.tier * 12 + rank * 6 + rng() * 20 - 8))),
      contrib: Math.round(RANKS[rank].rep * (0.8 + rng() * 0.6) + days * rng() * 4),
    })
  }
  return out
}

/* ---------------- tasks: trials and contracts ---------------- */
// type -> how to read its counter; `deliver` hands in items instead
export const TASK_TYPES = {
  kill: { read: (G, t) => G.s.bestiary.kills[t.monster] || 0, icon: 'crossed-swords' },
  kills: { read: G => G.s.stats.kills, icon: 'crossed-swords' },
  elite: { read: G => G.s.stats.elites || 0, icon: 'crowned-skull' },
  xp: { read: (G, t) => G.s.skills[t.skill].xp, icon: 'upgrade' },
  dungeon: { read: G => G.s.stats.dungeons || 0, icon: 'castle-ruins' },
  slayer: { read: G => G.s.slayer.completed || 0, icon: 'death-skull' },
  deliver: { read: (G, t) => G.qty(t.item), icon: 'knapsack', deliver: true },
  gold: { read: G => G.s.gold, icon: 'two-coins', deliver: true },
}

const levelGap = lvl => XP_TABLE[Math.min(99, lvl + 1)] - XP_TABLE[Math.min(98, lvl)]

// What each focus asks for; an entry per possible task, picked at random
const ASKS = {
  warrior: ['kill', 'kill', 'kills', 'elite', 'dungeon', 'xp:attack', 'xp:strength', 'xp:defense'],
  ranger: ['kill', 'kill', 'xp:ranged', 'xp:fletching', 'deliver:woodcutting', 'deliver:fishing'],
  mage: ['kill', 'xp:magic', 'xp:magic', 'xp:runecrafting', 'deliver:runecrafting'],
  artisan: ['xp:smithing', 'xp:crafting', 'xp:cooking', 'xp:herblore', 'deliver:mining', 'deliver:smithing', 'deliver:woodcutting'],
  rogue: ['xp:thieving', 'xp:thieving', 'xp:agility', 'gold', 'elite', 'kill'],
  paladin: ['kill', 'kills', 'xp:prayer', 'xp:defense', 'slayer', 'dungeon'],
}
const openAsks = () => Object.values(ASKS).flat()
export const asksOf = g => (g.focus === 'open' ? openAsks() : g.roles.flatMap(r => ASKS[r]))

// The toughest creature the hero can sensibly hunt
function huntTarget(G, rng) {
  const cl = G.combatLevel()
  const ok = AREAS.filter(a => G.areaUnlocked(a)).flatMap(a => a.monsters).filter(m => !m.slayer && monsterLevel(m) <= cl + 4)
  if (!ok.length) return 'chicken'
  ok.sort((a, b) => monsterLevel(b) - monsterLevel(a))
  return pick(rng, ok.slice(0, 3)).id
}
// Something the hero can already gather or make in a skill
function deliverTarget(G, skill, rng) {
  const lvl = G.level(skill)
  const acts = (ACTIONS[skill] || []).filter(a => a.lvl <= lvl && Object.keys(a.out).length === 1)
    .filter(a => { const id = Object.keys(a.out)[0]; return ITEMS[id] && !ITEMS[id].type || ITEMS[id]?.type === 'rune' })
  if (!acts.length) return null
  acts.sort((a, b) => b.lvl - a.lvl)
  const a = pick(rng, acts.slice(0, 3))
  return { item: Object.keys(a.out)[0], time: a.time }
}

// One task; `size` is about how many minutes of play it should take
export function makeTask(G, ask, size, rng) {
  const [type, arg] = ask.split(':')
  const t = { type }
  if (type === 'kill') { t.monster = huntTarget(G, rng); t.target = Math.max(5, Math.round(size * 2.2)) }
  else if (type === 'kills') t.target = Math.max(8, Math.round(size * 3))
  else if (type === 'elite') t.target = Math.max(1, Math.round(size / 25))
  else if (type === 'dungeon') t.target = Math.max(1, Math.round(size / 20))
  else if (type === 'slayer') t.target = Math.max(1, Math.round(size / 25))
  else if (type === 'xp') { t.skill = arg; t.target = Math.max(200, Math.round(levelGap(G.level(arg)) * size / 60)) }
  else if (type === 'gold') t.target = Math.max(200, Math.round((300 + G.heroLevel() * 120) * size / 15))
  else if (type === 'deliver') {
    const d = deliverTarget(G, arg, rng)
    if (!d) return makeTask(G, 'kills', size, rng)
    t.item = d.item
    t.target = Math.max(5, Math.round((size * 60) / d.time))
  }
  t.base = TASK_TYPES[t.type].deliver ? 0 : TASK_TYPES[t.type].read(G, t)
  return t
}

/* ---------------- contracts ---------------- */
export const CONTRACT_SLOTS = 3
export const CONTRACT_PERIOD = 4 * 3600e3 // new contracts every four hours
export const SWAP_COST = 3 // marks to swap one contract for another
export const CONTRACT_SIZES_LIST = [10, 18, 30] // minutes of play: quick, normal, long

export function contractReward(G, g, size) {
  const f = size / 15
  return {
    marks: Math.round((3 + g.tier * 2) * f),
    rep: Math.round((15 + g.tier * 4) * f),
    gold: Math.round((150 + G.heroLevel() * 60) * g.tier * f),
  }
}

/* ---------------- the trial ---------------- */
export const TRIAL_SIZE = [0, 6, 10, 15, 20, 25] // minutes of the entry task by tier
export const PUZZLE_COOLDOWN = 5 * 60e3 // after a wrong answer

// Riddles: question ids with their answer; the wrong options come from other answers
export const RIDDLES = [
  { id: 'shadow', a: 'shadow' }, { id: 'echo', a: 'echo' }, { id: 'map', a: 'map' }, { id: 'candle', a: 'candle' },
  { id: 'key', a: 'key' }, { id: 'silence', a: 'silence' }, { id: 'time', a: 'time' }, { id: 'footsteps', a: 'footsteps' },
  { id: 'river', a: 'river' }, { id: 'anvil', a: 'anvil' }, { id: 'egg', a: 'egg' }, { id: 'secret', a: 'secret' },
  { id: 'moon', a: 'moon' }, { id: 'fire', a: 'fire' }, { id: 'name', a: 'name' }, { id: 'arrow', a: 'arrow' },
]
const ANSWERS = RIDDLES.map(r => r.a)

const shuffle = (rng, a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

// Number sequences; higher tiers get the trickier rules
const SEQUENCES = [
  rng => { const a = 2 + Math.floor(rng() * 9), d = 2 + Math.floor(rng() * 8); return [0, 1, 2, 3, 4, 5].map(i => a + d * i) },
  rng => { const a = 1 + Math.floor(rng() * 4), r = 2 + Math.floor(rng() * 2); return [0, 1, 2, 3, 4, 5].map(i => a * r ** i) },
  rng => { const a = 1 + Math.floor(rng() * 5); return [0, 1, 2, 3, 4, 5].map(i => (a + i) ** 2) },
  rng => { const s = [1 + Math.floor(rng() * 3), 2 + Math.floor(rng() * 3)]; while (s.length < 6) s.push(s[s.length - 1] + s[s.length - 2]); return s },
  rng => { const a = 3 + Math.floor(rng() * 6), p = 2 + Math.floor(rng() * 5), q = 1 + Math.floor(rng() * 3); const s = [a]; for (let i = 1; i < 6; i++) s.push(s[i - 1] + (i % 2 ? p : -q)); return s },
  rng => { const a = 1 + Math.floor(rng() * 4); const s = [a]; for (let i = 1; i < 6; i++) s.push(s[i - 1] + i * (1 + Math.floor(a / 2))); return s },
]

export const LOCK_DIGITS = 3 // digits in the lock's code
export const LOCK_FACES = 6 // each digit is 1–6
export const LOCK_TRIES = [0, 8, 8, 7, 6, 6]

export function makePuzzle(kind, tier, rng) {
  if (kind === 'riddle') {
    const r = pick(rng, RIDDLES)
    const wrong = shuffle(rng, ANSWERS.filter(a => a !== r.a)).slice(0, 3)
    return { kind, riddle: r.id, options: shuffle(rng, [r.a, ...wrong]), answer: r.a }
  }
  if (kind === 'sequence') {
    const rules = SEQUENCES.slice(0, Math.min(SEQUENCES.length, 2 + tier))
    const s = pick(rng, rules)(rng)
    const answer = s[5]
    const options = new Set([answer])
    while (options.size < 4) options.add(answer + (Math.floor(rng() * 9) - 4 || 5) * (1 + Math.floor(answer / 30)))
    return { kind, shown: s.slice(0, 5), options: shuffle(rng, [...options]), answer }
  }
  const code = Array.from({ length: LOCK_DIGITS }, () => 1 + Math.floor(rng() * LOCK_FACES))
  return { kind: 'lock', code, guesses: [], tries: LOCK_TRIES[tier] }
}
// Feedback for a lock guess: digits in the right place, and right digits in the wrong place
export function lockFeedback(code, guess) {
  let exact = 0
  const restC = {}, restG = {}
  code.forEach((c, i) => { if (guess[i] === c) exact++; else { restC[c] = (restC[c] || 0) + 1; restG[guess[i]] = (restG[guess[i]] || 0) + 1 } })
  let near = 0
  for (const d in restG) near += Math.min(restG[d], restC[d] || 0)
  return { exact, near }
}

/* ---------------- guild shop ---------------- */
// `tier`: the guild's tier needed to stock it · `rank`: rank needed to buy it
export const GUILD_SHOP = [
  { id: 'pouches', items: { coin_pouch: 3 }, cost: 8, tier: 1, rank: 0 },
  { id: 'potions', items: { strength_potion: 3, attack_potion: 3 }, cost: 10, tier: 1, rank: 0 },
  { id: 'runes', items: { nature_rune: 40 }, cost: 14, tier: 2, rank: 1 },
  { id: 'stardust', items: { stardust: 60 }, cost: 16, tier: 1, rank: 1 },
  { id: 'chest', items: { gem_chest: 1 }, cost: 28, tier: 2, rank: 2 },
  { id: 'supers', items: { super_attack: 2, super_strength: 2, super_defense: 2 }, cost: 32, tier: 3, rank: 2 },
  { id: 'shard', items: { starlight_shard: 1 }, cost: 70, tier: 3, rank: 3 },
  { id: 'overload', items: { overload: 2 }, cost: 90, tier: 4, rank: 4 },
]

export const LEAVE_COOLDOWN = 3600e3 // before joining another guild
