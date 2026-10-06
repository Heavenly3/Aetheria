import { named } from '../../i18n/bind.js'

/*
  Seasonal festivals run on fixed dates every year, with no server involved. While one is on:
  - its passive bonus (`mods`) applies,
  - actions, kills and daily tasks earn festival tokens,
  - its shop sells a title, a portrait, a colour, an exclusive pet and a few consumables.
  Dates are [month (0-11), day]; `end` is exclusive and may fall in the next year.
*/
const festival = (id, icon, tint, start, end, mods, pet, avatar, colour) =>
  named({ id, icon, tint, start, end, mods, pet, avatar, colour, title: festivalTitle[id] }, `festivals.${id}.name`, `festivals.${id}.desc`)
const festivalTitle = { harvest: 'harvest_moon', winter: 'endless_winter', spring: 'first_bloom', summer: 'midsummer_fire' }

export const FESTIVALS = [
  festival('harvest', 'wheat', '#d9772b', [9, 1], [10, 1], { farmSpeed: 0.15, 'xp.cooking': 0.1 }, 'mushling', 'werewolf', '#d9772b'),
  festival('winter', 'pine-tree', '#8fd0f2', [11, 15], [0, 15], { heal: 0.1, defense: 0.03 }, 'frost_cub', 'ice-golem', '#8fd0f2'),
  festival('spring', 'strawberry', '#f08fb8', [2, 20], [3, 20], { xp: 0.05 }, 'spring_chick', 'unicorn', '#f08fb8'),
  festival('summer', 'campfire', '#f2b233', [5, 21], [6, 21], { gold: 0.1 }, 'sunfox', 'flame', '#f2b233'),
]
export const FESTIVAL_MAP = Object.fromEntries(FESTIVALS.map(f => [f.id, f]))

// Token income
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
]

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
