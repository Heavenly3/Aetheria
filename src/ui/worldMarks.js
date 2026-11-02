/* =========================================================
   WORLD MARKS — what waits in each region of the map: the next page of the story, quest
   objectives, the slayer task, guild work and daily tasks, read from the tracker so the map and
   the tracker always agree.
   ========================================================= */
import { G, state } from '../game/engine.js'
import { AREAS } from '../game/data/combat.js'
import { REGION_OF, regionDungeon, regionBosses } from '../game/data/world.js'
import { trackedGoals } from './tracker.js'

const SOURCE_MARK = { story: 'story', quest: 'quest', companion: 'quest', slayer: 'slayer', guild: 'guild', daily: 'task', weekly: 'task' }
export const MARK_ICONS = { story: 'quill-ink', quest: 'scroll-unfurled', slayer: 'death-skull', guild: 'swords-emblem', task: 'calendar' }
export const MARK_ORDER = ['story', 'quest', 'slayer', 'guild', 'task']

// region id -> { story: 1, quest: 2, … } for everything still to be done there
export function regionMarks() {
  const out = {}
  const add = (region, kind) => {
    if (!region) return
    const r = (out[region] ||= {})
    r[kind] = (r[kind] || 0) + 1
  }
  for (const g of trackedGoals()) {
    const kind = SOURCE_MARK[g.source]
    if (!kind || g.ready) continue
    const path = typeof g.go?.to === 'string' ? g.go.to : g.go?.to?.path
    const m = /^\/combat\/(\w+)/.exec(path || '')
    if (m) add(m[1], kind)
  }
  // Leads of the guild affair being followed up: the creatures it asks for
  const a = G.affair()
  if (a?.status === 'active') for (const l of a.leads) if (l.monster && !G.taskMet(l)) add(REGION_OF[l.monster], 'guild')
  return out
}

// How far the hero has got in a region: creatures defeated, its dungeon cleared, its bosses beaten
export function regionProgress(id) {
  const kills = state.bestiary.kills
  const area = AREAS.find(a => a.id === id)
  const met = area.monsters.filter(m => (kills[m.id] || 0) > 0).length
  const dg = regionDungeon(id)
  const bosses = regionBosses(id)
  return {
    met, total: area.monsters.length,
    cleared: dg ? (state.dungeonsBy[dg.id] || 0) > 0 : null,
    beaten: bosses.length ? bosses.filter(b => (kills[b.id] || 0) > 0).length : null, bosses: bosses.length,
    visited: met > 0,
  }
}
