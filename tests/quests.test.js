import { describe, it, expect } from 'vitest'
import { G, state, newHero, setLevel } from './helpers.js'
import { QUESTS, QUEST_STATS } from '../src/game/data/progression.js'
import { ITEMS } from '../src/game/data/items.js'
import { MONSTERS } from '../src/game/data/combat.js'
import { i18n } from '../src/i18n/index.js'

describe('quests', () => {
  it('only use objectives, rewards and texts that exist', () => {
    for (const q of QUESTS) {
      for (const o of q.obj) {
        if (o.type === 'item') expect(ITEMS[o.item], `${q.id} ${o.item}`).toBeTruthy()
        if (o.type === 'kill') expect(MONSTERS[o.monster], `${q.id} ${o.monster}`).toBeTruthy()
        if (o.type === 'stat' || o.type === 'reach') {
          expect(QUEST_STATS[o.key], `${q.id} ${o.key}`).toBeTruthy()
          expect(i18n.global.te(`quests.obj.${o.key}`), o.key).toBe(true)
        }
      }
      Object.keys(q.reward.items || {}).forEach(id => expect(ITEMS[id], `${q.id} reward ${id}`).toBeTruthy())
      for (const r of q.req.quests || []) expect(QUESTS.some(x => x.id === r), r).toBe(true)
      expect(q.name).not.toMatch(/^quests\./)
    }
  })

  it('count stat objectives only from when the quest starts', () => {
    newHero()
    setLevel('fishing', 20)
    state.stats.fish = 500
    G.startQuest('angler_tales')
    const q = QUESTS.find(x => x.id === 'angler_tales')
    expect(G.objProgress(q, q.obj[0]).cur).toBe(0)
    state.stats.fish = 650
    G.addItem('raw_salmon', 20)
    expect(G.questReady(q)).toBe(true)
    expect(G.completeQuest('angler_tales')).toBe(true)
    expect(G.qty('feather_fly')).toBe(60)
  })

  it('read totals for reach objectives', () => {
    newHero()
    G.startQuest('guild_initiation')
    const q = QUESTS.find(x => x.id === 'guild_initiation')
    expect(G.objProgress(q, q.obj[0]).cur).toBe(0)
    state.guilds.member = state.guilds.list[0].id
    expect(G.objProgress(q, q.obj[0]).cur).toBe(1)
  })
})
