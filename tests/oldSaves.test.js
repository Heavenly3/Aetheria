import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { G, state, run } from './helpers.js'
import { ITEMS } from '../src/game/data/items.js'
import { trackedGoals } from '../src/ui/tracker.js'

// Real saves made by every earlier public version, each playing a while with its own engine
// (mining, woodcutting, fishing, smelting, two quests and a fight). The current game must open
// them all, keep what they hold and keep running.
const DIR = new URL('./fixtures/saves/', import.meta.url)
const SAVES = readdirSync(DIR).filter(f => f.endsWith('.json')).sort()

describe('saves from earlier versions', () => {
  it('are all here', () => expect(SAVES.length).toBeGreaterThanOrEqual(11))

  for (const file of SAVES) {
    it(`opens ${file.replace('.json', '')} and keeps playing`, () => {
      const raw = readFileSync(new URL(file, DIR), 'utf8')
      const old = JSON.parse(raw)
      localStorage.setItem('aetheria-slot-1', raw)
      expect(G.listSlots()[1]).toMatchObject({ name: old.name })
      expect(G.loadSlot(1)).toBe(true)

      // Nothing the hero had is lost
      expect(state.name).toBe(old.name)
      expect(state.gold).toBe(old.gold)
      for (const [k, v] of Object.entries(old.skills)) expect(state.skills[k].xp, k).toBe(v.xp)
      for (const [id, n] of Object.entries(old.inventory || {})) if (ITEMS[id]) expect(G.qty(id), id).toBe(n)
      for (const [id, q] of Object.entries(old.quests || {})) expect(state.quests[id].status, id).toBe(q.status)
      expect(Object.keys(state.achievements || {}).length).toBeGreaterThanOrEqual(Object.keys(old.achievements || {}).length)

      // Everything the screens ask for works on it
      expect(() => {
        G.totalLevel(); G.combatLevel(); G.combatProfile(); G.heroLevel(); G.nextGoal(); trackedGoals()
        G.checkAchievements(); G.checkJournal(true); G.checkUnlocks(); G.ensureContracts(); G.tickRecords(); G.tickRealm()
      }).not.toThrow()

      // Playing on: skills, a fight and a long absence
      G.startSkill('mining', 'copper_ore')
      run(300, 1)
      expect(state.activity?.skill).toBe('mining')
      G.startCombat('area', 'chicken')
      run(300, 1)
      expect(state.stats.kills).toBeGreaterThan(old.stats?.kills || 0)
      expect(() => G.simulate(6 * 3600)).not.toThrow()

      // And it saves and opens again
      expect(G.save()).toBe(true)
      expect(G.loadSlot(1)).toBe(true)
      expect(state.name).toBe(old.name)
    }, 30000)
  }
})
