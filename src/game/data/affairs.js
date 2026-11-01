/*
  Guild affairs: now and then a member of the hero's guild brings a matter that is not a plain
  contract. It is followed up out in the realm (leads: creatures to defeat, skills to work, people of
  the journal to ask), and every lead found tells a little more. It ends with an enigma (data/enigmas.js)
  that only the hero can settle. Texts live in the locales under `affairs.*`.
*/
export const AFFAIRS = {
  theft: { enigma: 'deduction', icon: 'locked-chest' },
  letter: { enigma: 'cipher', icon: 'scroll-quill' },
  lens: { enigma: 'beam', icon: 'crystal-ball' },
  stars: { enigma: 'astrolabe', icon: 'star-swirl' },
  coins: { enigma: 'balance', icon: 'two-coins' },
  rite: { enigma: 'echo', icon: 'rune-stone' },
}
// The affairs each kind of guild tends to bring; open and mixed guilds bring any of them
export const AFFAIRS_BY = {
  warrior: ['theft', 'coins', 'lens', 'rite'],
  ranger: ['stars', 'lens', 'theft', 'letter'],
  mage: ['letter', 'stars', 'rite', 'lens'],
  artisan: ['lens', 'coins', 'theft', 'stars'],
  rogue: ['theft', 'letter', 'coins', 'rite'],
  paladin: ['rite', 'theft', 'stars', 'letter'],
}

// What the deductions are about: places of the realm and the things suspects carried
export const AFFAIR_ITEMS = ['coin_pouch', 'rod', 'bronze_pickaxe', 'iron_bar', 'silver_goblet', 'gem_chest', 'bronze_axe', 'uncut_sapphire']

export const AFFAIR_PERIOD = 6 * 3600e3 // a new affair this long after the last one ended
export const AFFAIR_FIRST = 20 * 60e3 // the first one, after joining a guild
export const AFFAIR_WAIT = [3, 5, 8].map(m => m * 60e3) // after a wrong answer, by level
export const AFFAIR_TRIES = [3, 2, 2] // accusations, guesses and attempts before the affair is lost, by level
export const LEAD_SIZE = [6, 9, 12] // minutes of play each lead takes, by level
export const HINT_COST = 6 // marks for the first hint; each one after costs as much again
export const HINT_CUT = 0.25 // the reward loses this share for every hint
export const LEVEL_PAY = [1, 1.4, 1.9]

// The reward, like a long contract several times over
export function affairReward(G, g, level, hints = 0) {
  const f = 3.2 * LEVEL_PAY[level] * Math.max(0.25, 1 - hints * HINT_CUT)
  return {
    marks: Math.round((3 + g.tier * 2) * 2 * f),
    rep: Math.round((15 + g.tier * 4) * 2 * f),
    gold: Math.round((150 + G.heroLevel() * 60) * g.tier * 2 * f),
  }
}
