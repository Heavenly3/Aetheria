/* =========================================================
   UNLOCKS — which screens of the menu the hero has found, and which are new to them.
   Mixed into G (engine.js); `this` is the engine. Rules live in data/unlocks.js.
   ========================================================= */
import { UNLOCKS, UNLOCK_MAP } from './data/unlocks.js'

// open: screen -> when it opened · seen: screens visited since. null means a save from before
// unlocks existed, which gets everything open when it loads (see openAllScreens)
export const unlocksState = () => ({ unlocks: null })

export const unlocks = {
  openAllScreens() {
    const now = Date.now()
    this.s.unlocks = { open: Object.fromEntries(UNLOCKS.map(u => [u.to, now])), seen: Object.fromEntries(UNLOCKS.map(u => [u.to, true])) }
  },
  // Set by the tutorial when it loads: whether it has reached a step
  tutorialReached(id) { return !!this.s.tutorial?.done || !!this.tutorialAt?.(id) },
  screenOpen(to) {
    const u = UNLOCK_MAP[to]
    if (!u) return true
    const un = this.s.unlocks
    if (!un || un.open[to]) return true
    return (u.tut && this.tutorialReached(u.tut)) || !!u.check(this)
  },
  screenNew(to) { const un = this.s.unlocks; return !!un && !!un.open[to] && !un.seen[to] },
  markScreenSeen(to) { const un = this.s.unlocks; if (un?.open[to] && !un.seen[to]) un.seen[to] = true },
  // The screens still closed, with what opens them
  closedScreens() { return UNLOCKS.filter(u => !this.screenOpen(u.to)) },
  // Records screens that just opened and announces them together (quietly for the tutorial's own)
  checkUnlocks() {
    const un = this.s.unlocks
    if (!un) return
    const fresh = []
    for (const u of UNLOCKS) {
      if (un.open[u.to] || !this.screenOpen(u.to)) continue
      un.open[u.to] = Date.now()
      if (!(u.tut && this.tutorialReached(u.tut) && !this.s.tutorial?.done)) fresh.push(u)
    }
    if (fresh.length) this.emit('unlock', { list: fresh.map(u => ({ to: u.to, key: u.key, icon: u.icon })) })
  },
}
