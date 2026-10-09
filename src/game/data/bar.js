/*
  The tavern's bar. Patrons drop in over time (also while the hero is away), each asking for some
  food or drink from the hero's own stores; serving them pays gold and a tip and builds the tavern's
  reputation, which makes every patron pay more. Now and then a special guest arrives instead, asking
  for more and paying with rare goods. Brews made with Cooking can be drunk instead of bought.
*/
export const PATRON_EVERY = 10 * 60e3 // a new patron about every ten minutes at a humble tavern
export const PATRON_STAY = 60 * 60e3 // and each one waits an hour
export const maxPatrons = level => 2 + Math.floor(level / 2)
export const patronEvery = level => PATRON_EVERY / (1 + 0.15 * (level - 1))
export const PAY_MULT = 2.2 // patrons pay this many times the value of what they get
export const repMult = rep => 1 + Math.min(0.5, rep * 0.002)
export const REP_STEP = 50 // reputation shown in levels of this size

// Special guests: their share of arrivals, and what they pay on top of gold
export const GUEST_CHANCE = 0.07
export const GUESTS = [
  { id: 'faceless', icon: 'hooded-figure', reward: { starlight_shard: 1 } },
  { id: 'bard', icon: 'glass-celebration', reward: { coin_pouch: 4 } },
  { id: 'courier', icon: 'scroll-unfurled', reward: { gem_chest: 1 } },
  { id: 'knight', icon: 'visored-helm', reward: { treasure_map: 1 } },
]
export const GUEST_MAP = Object.fromEntries(GUESTS.map(g => [g.id, g]))
