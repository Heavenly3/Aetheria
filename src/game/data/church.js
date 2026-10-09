/*
  The church and the Order of the Dawn. Brother {priest} asks for one offering a day; offerings earn
  favour with the Order, and each level of favour makes blessings last longer, opens a blessing slot
  or makes them cheaper. Holy water, brewed with Herblore, renews every active blessing at once.
*/
// Favour needed for each level, and what the level brings
export const FAVOUR_LEVELS = [
  { favour: 0 },
  { favour: 60, duration: 0.1 },
  { favour: 180, duration: 0.2 },
  { favour: 400, duration: 0.3, slot: 1 },
  { favour: 750, duration: 0.4, slot: 1 },
  { favour: 1300, duration: 0.5, slot: 1, discount: 0.25 },
]
export const favourLevel = f => FAVOUR_LEVELS.reduce((l, x, i) => (f >= x.favour ? i : l), 0)

// What the Order may ask for: an item, how many for each step of the hero's level, and the favour it pays
export const OFFERINGS = [
  { item: 'bones', per: 6, favour: 18 },
  { item: 'big_bones', per: 3, favour: 26 },
  { item: 'ashes', per: 6, favour: 16 },
  { item: 'guam', per: 3, favour: 20 },
  { item: 'baked_potato', per: 3, favour: 18 },
  { item: 'trout', per: 3, favour: 24 },
  { item: 'holy_water', per: 1, favour: 34 },
  { item: 'linen_cloth', per: 2, favour: 28 },
]
// How many of the item: grows slowly with the hero's level
export const offeringQty = (o, heroLevel) => o.per * (2 + Math.floor(heroLevel / 15))
export const OFFERING_XP = 60 // Prayer XP per point of favour paid
