import { named } from '../../i18n/bind.js'

/*
  The festival calendar, with no server involved.
  - Four big festivals a year, about three weeks each. While one is on its bonus applies, everything earns
    festival tokens (spent in its shop) and festival points (never spent: they climb the festival's track and
    its ranking against the guilds' members).
  - Weekend fairs: the second weekend (Friday to Sunday) of every month without a big festival hosts a fair
    with its own rule and rewards: a fishing derby, a tower rush, a market day or a night of omens.
  Dates are [month (0-11), day]; `end` is exclusive and may fall in the next year.
*/
const festival = (id, icon, tint, start, end, mods, pet, avatar, colour) =>
  named({ id, icon, tint, start, end, mods, pet, avatar, colour, title: festivalTitle[id] }, `festivals.${id}.name`, `festivals.${id}.desc`)
const festivalTitle = { harvest: 'harvest_moon', winter: 'endless_winter', spring: 'first_bloom', summer: 'midsummer_fire' }

export const FESTIVALS = [
  festival('spring', 'strawberry', '#f08fb8', [2, 20], [3, 10], { xp: 0.05, farmSpeed: 0.1 }, 'spring_chick', 'unicorn', '#f08fb8'),
  festival('summer', 'campfire', '#f2b233', [5, 21], [6, 12], { gold: 0.08, 'speed.fishing': 0.1 }, 'sunfox', 'flame', '#f2b233'),
  festival('harvest', 'wheat', '#d9772b', [9, 1], [9, 22], { farmSpeed: 0.15, 'xp.cooking': 0.1 }, 'mushling', 'werewolf', '#d9772b'),
  festival('winter', 'pine-tree', '#8fd0f2', [11, 15], [0, 5], { heal: 0.1, defense: 0.03 }, 'frost_cub', 'ice-golem', '#8fd0f2'),
]
export const FESTIVAL_MAP = Object.fromEntries(FESTIVALS.map(f => [f.id, f]))

// Token income; every token earned is also a festival point
export const TOKENS = {
  actionChance: 0.03,  // per 3 seconds of action time
  killChance: 0.1,     // per monster defeated
  boss: 5,             // per boss defeated
  task: 15,            // per daily or weekly task claimed
}

// Shop: one-off cosmetics and the pet, plus consumables that can be bought again
export const shopFor = f => [
  { id: 'pet', kind: 'pet', ref: f.pet, cost: 1500 },
  { id: 'title', kind: 'title', ref: f.title, cost: 600 },
  { id: 'avatar', kind: 'avatar', ref: f.avatar, cost: 400 },
  { id: 'tint', kind: 'tint', ref: f.colour, cost: 250 },
  { id: 'elixir', kind: 'item', ref: 'wisdom_elixir', qty: 1, cost: 60 },
  { id: 'chest', kind: 'item', ref: 'gem_chest', qty: 1, cost: 120 },
  { id: 'shard', kind: 'item', ref: 'starlight_shard', qty: 1, cost: 300 },
  { id: 'lures', kind: 'item', ref: 'glow_lure', qty: 10, cost: 90 },
  { id: 'pouches', kind: 'item', ref: 'seed_pouch', qty: 3, cost: 70 },
  { id: 'map', kind: 'item', ref: 'treasure_map', qty: 1, cost: 140 },
]

// The festival track: points needed for each step and what it pays
export const TRACK = [
  { pts: 50, reward: { tokens: 50 } },
  { pts: 120, reward: { items: { coin_pouch: 5 } } },
  { pts: 220, reward: { items: { festive_hat: 1 } } },
  { pts: 360, reward: { items: { gem_chest: 1 } } },
  { pts: 550, reward: { tokens: 150 } },
  { pts: 800, reward: { items: { festive_cloak: 1 } } },
  { pts: 1100, reward: { items: { starlight_shard: 1 } } },
  { pts: 1500, reward: { tokens: 300 } },
  { pts: 2000, reward: { items: { festive_coat: 1 } } },
  { pts: 2600, reward: { items: { gem_chest: 3, starlight_shard: 1 } } },
]

/* ---------------- dates ---------------- */
const at = (year, [m, d]) => new Date(year, m, d)

// The window of festival `f` that starts in `year`
function windowOf(f, year) {
  const start = at(year, f.start)
  const end = at(f.end[0] < f.start[0] ? year + 1 : year, f.end)
  return { festival: f, start, end, key: `${f.id}-${year}` }
}

// The festival running at `now`, or null
export function festivalAt(now = new Date()) {
  const y = now.getFullYear()
  for (const f of FESTIVALS) for (const year of [y - 1, y]) {
    const w = windowOf(f, year)
    if (now >= w.start && now < w.end) return w
  }
  return null
}

// The running or next window of festival `f`
export function windowFor(f, now = new Date()) {
  const y = now.getFullYear()
  return [y - 1, y, y + 1].map(year => windowOf(f, year)).find(w => w.end > now)
}

// The next festival to start after `now`
export function nextFestival(now = new Date()) {
  const y = now.getFullYear()
  return FESTIVALS.flatMap(f => [windowOf(f, y), windowOf(f, y + 1)]).filter(w => w.start > now).sort((a, b) => a.start - b.start)[0]
}

/* ---------------- weekend fairs ---------------- */
// Each fair: what it does while it runs. `rewards`: fair points needed and what they pay
export const FAIRS = {
  derby:      { icon: 'fishing',      tint: '#4d9fb0' },
  tower_rush: { icon: 'stone-tower',  tint: '#c9a04a' },
  market:     { icon: 'shop',         tint: '#7aa83a' },
  omen_night: { icon: 'crystal-ball', tint: '#9d79bc' },
}
export const FAIR_IDS = Object.keys(FAIRS)
export const FAIR_REWARDS = [
  { pts: 40, reward: { gold: 3000, items: { coin_pouch: 3 } } },
  { pts: 120, reward: { items: { gem_chest: 1, treasure_map: 1 } } },
  { pts: 300, reward: { items: { starlight_shard: 1 } } },
]
export const TOWER_RUSH_MULT = 2 // tower tokens during a tower rush
export const OMEN_NIGHT_MULT = 3 // omen chance during a night of omens
// The market day's stall: limited stock, paid in gold
export const MARKET = [
  { id: 'shard', item: 'starlight_shard', qty: 1, gold: 9000, stock: 1 },
  { id: 'chest', item: 'gem_chest', qty: 1, gold: 2500, stock: 3 },
  { id: 'map', item: 'treasure_map', qty: 1, gold: 1800, stock: 2 },
  { id: 'lures', item: 'glow_lure', qty: 10, gold: 1200, stock: 2 },
  { id: 'torstol', item: 'torstol_seed', qty: 2, gold: 3000, stock: 2 },
  { id: 'sigils', item: 'slayer_sigil', qty: 5, gold: 2000, stock: 2 },
]

// The second Friday of a month, at midnight
function secondFriday(year, month) {
  const first = new Date(year, month, 1).getDay()
  return new Date(year, month, 1 + ((5 - first + 7) % 7) + 7)
}
function fairOf(year, month) {
  const start = secondFriday(year, month)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 3)
  // No fair while a big festival is on
  if (festivalAt(start) || festivalAt(new Date(end - 1))) return null
  const id = FAIR_IDS[month % FAIR_IDS.length]
  return { fair: id, start, end, key: `${id}-${year}-${month}` }
}
export function fairAt(now = new Date()) {
  const f = fairOf(now.getFullYear(), now.getMonth())
  return f && now >= f.start && now < f.end ? f : null
}
// The next few fairs from `now` on (the running one included)
export function upcomingFairs(now = new Date(), n = 3) {
  const out = []
  for (let i = 0; i < 14 && out.length < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const f = fairOf(d.getFullYear(), d.getMonth())
    if (f && f.end > now) out.push(f)
  }
  return out
}

/* ---------------- rivals ---------------- */
// How many festival points a rival from a guild has after `days` of the festival
export function rivalPoints(member, tier, days, seed) {
  // About 40 to 90 points a day: an active hero can catch the best of them
  const pace = 10 + member.level * 0.5 + tier * 5 + (seed % 13)
  return Math.round(pace * days)
}
