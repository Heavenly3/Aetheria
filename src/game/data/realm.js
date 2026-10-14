import { AREAS } from './combat.js'

/*
  A realm that reacts: every region has a threat level that grows with time, also while the game is
  closed, and falls as the hero hunts there.
  - Above "restless", its creatures grow stronger but carry more gold and loot, and elites show up
    more often (the effects grow until the region is overrun).
  - Bringing an overrun region back down to calm earns King Edmund's bounty.
*/
export const THREAT = { rise: 3, perKill: 0.4, perElite: 1.5, start: [10, 40], max: 100 } // rise: points per hour
export const THREAT_LEVELS = [
  { id: 'calm', at: 0, color: '#62c17e' },
  { id: 'restless', at: 25, color: '#e2b65a' },
  { id: 'dangerous', at: 50, color: '#ff9a3c' },
  { id: 'overrun', at: 75, color: '#e0554b' },
]
// What a region does at full threat; nothing below "restless", growing in between
export const THREAT_EFFECT = { monster: 0.2, loot: 0.3, gold: 0.3, elite: 0.03 }
export const CLEANSE = { from: 75, to: 15, gold: lvl => 500 + 150 * lvl }

export const REGION_OF = {}
AREAS.forEach(a => a.monsters.forEach(m => (REGION_OF[m.id] = a.id)))
export const threatLevel = v => [...THREAT_LEVELS].reverse().find(l => v >= l.at) || THREAT_LEVELS[0]
// 0 below restless, 1 when overrun or worse
export const threatShare = v => Math.max(0, Math.min(1, (v - THREAT_LEVELS[1].at) / (THREAT_LEVELS[3].at - THREAT_LEVELS[1].at)))
