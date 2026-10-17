/* =========================================================
   RECORDS — this week against last week and the best week ever. Most measures are the difference
   from a snapshot of the stats taken when the week began; the tower keeps its own highest floor.
   Beating a best week is announced once per measure and week.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { weekKey } from './meta.js'

// id: measure · icon · counted from stats since the week began (snap) or read as is
export const RECORDS = [
  { id: 'kills', icon: 'crossed-swords', snap: g => g.s.stats.kills || 0 },
  { id: 'gold', icon: 'two-coins', snap: g => g.s.stats.goldEarned || 0 },
  { id: 'actions', icon: 'hourglass', snap: g => g.s.stats.actions || 0 },
  { id: 'slayer', icon: 'death-skull', snap: g => g.s.slayer?.completed || 0 },
  { id: 'floor', icon: 'stone-tower', now: g => g.s.records?.floor || 0 },
  { id: 'damage', icon: 'crowned-skull', now: g => g.s.weekly?.dealt || 0 },
]

const blank = () => Object.fromEntries(RECORDS.map(r => [r.id, 0]))
// week: the week being counted · start: stats when it began · floor: highest tower floor this week
// best: best week for each measure · last: last week's totals · beaten: measures announced this week
export const recordsState = () => ({ records: { week: '', start: {}, floor: 0, best: blank(), last: null, beaten: {} } })

export const records = {
  ensureRecords() {
    const r = (this.s.records ||= recordsState().records)
    r.best = { ...blank(), ...(r.best || {}) }
    const week = weekKey()
    if (r.week !== week) {
      // A new week: last week's totals stay for comparison; a long absence leaves no last week
      if (r.week) r.last = this.recordsThisWeek()
      r.week = week
      r.start = Object.fromEntries(RECORDS.filter(x => x.snap).map(x => [x.id, x.snap(this)]))
      r.floor = 0
      r.beaten = {}
    }
    return r
  },
  // This week's total for every measure
  recordsThisWeek() {
    const r = this.s.records
    return Object.fromEntries(RECORDS.map(x => {
      if (!x.snap) return [x.id, x.now(this)]
      const v = x.snap(this)
      // A count that went back (slayer tasks start over with a new life) counts from zero
      if (r?.start && v < (r.start[x.id] ?? 0)) r.start[x.id] = 0
      return [x.id, Math.max(0, v - (r?.start?.[x.id] ?? v))]
    }))
  },
  recordFloor(floor) { const r = this.s.records; if (r && floor > r.floor) r.floor = floor },
  // Keeps the best weeks up to date and announces a best week beaten (not in a first week, when every number is a record)
  tickRecords() {
    const r = this.ensureRecords(), cur = this.recordsThisWeek()
    for (const x of RECORDS) {
      if (cur[x.id] <= r.best[x.id]) continue
      if (r.best[x.id] > 0 && r.last && !r.beaten[x.id]) {
        r.beaten[x.id] = true
        this.emit('record', { id: x.id, icon: x.icon, value: cur[x.id], before: r.best[x.id] })
      }
      r.best[x.id] = cur[x.id]
    }
  },
}
