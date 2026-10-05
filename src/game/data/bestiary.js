import { named } from '../../i18n/bind.js'
import { AREAS, BOSSES, DUNGEONS } from './combat.js'

/*
  The bestiary records every creature the hero has fought. Kills raise how much is known about it:
    seen     -> name, stats and weakness
    studied  -> drop chances are revealed
    hunted   -> +5% accuracy and damage against it
  Bosses need fewer kills. A group is complete when every creature in it is studied; completing a
  group can be claimed once for gold and a small permanent bonus.
*/
export const HUNT_BONUS = 0.05
export const KNOWLEDGE = ['seen', 'studied', 'hunted']
const KILLS = { normal: [1, 25, 250], boss: [1, 10, 50] }

export const killsFor = (entry, tier) => KILLS[entry.boss ? 'boss' : 'normal'][KNOWLEDGE.indexOf(tier)]

const group = (id, icon, monsters, reward, name) => named({ id, icon, monsters, reward }, name || `bestiary.groups.${id}`)
const areaReward = {
  meadow:    { gold: 500,    mods: { gold: 0.01 } },
  forest:    { gold: 2000,   mods: { rangedAcc: 0.02 } },
  caves:     { gold: 5000,   mods: { defense: 0.01 } },
  swamp:     { gold: 9000,   mods: { heal: 0.03 } },
  ruins:     { gold: 14000,  mods: { meleeAcc: 0.02 } },
  peaks:     { gold: 20000,  mods: { maxHp: 2 } },
  lair:      { gold: 30000,  mods: { meleeDmg: 0.02 } },
  abyss:     { gold: 45000,  mods: { magicDmg: 0.02 } },
  void:      { gold: 70000,  mods: { loot: 0.02 } },
  celestial: { gold: 100000, mods: { xp: 0.02 } },
}

export const BESTIARY = [
  ...AREAS.map(a => group(a.id, a.icon, a.monsters, areaReward[a.id], `areas.${a.id}.name`)),
  group('dungeons', 'castle-ruins', DUNGEONS.map(dg => dg.boss), { gold: 40000, mods: { gold: 0.03 } }),
  group('bosses', 'crowned-skull', BOSSES, { gold: 120000, mods: { loot: 0.03 } }),
]

// Monster id -> its bestiary group
export const BEAST_GROUP = {}
BESTIARY.forEach(g => g.monsters.forEach(m => (BEAST_GROUP[m.id] = g)))
