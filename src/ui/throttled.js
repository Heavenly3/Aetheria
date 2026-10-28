import { effect, shallowRef, getCurrentScope, onScopeDispose } from 'vue'
import { G } from '../game/engine.js'

// Runners due together are refreshed in one go, so they share the engine's modifier cache
const due = new Map()
function schedule(run, ms) {
  let batch = due.get(ms)
  if (!batch) {
    due.set(ms, (batch = new Set()))
    setTimeout(() => { due.delete(ms); G.withCache(() => batch.forEach(run => run())) }, ms)
  }
  batch.add(run)
}

// A value worked out from the game state and refreshed at most once every `ms` after something it
// reads changes. For panels that read state the loop touches ten times a second (timers, HP, XP)
// but only need to look current to a person, so they are not rebuilt on every tick
export function throttled(fn, ms = 1000) {
  const value = shallowRef()
  let stopped = false
  const run = () => { if (!stopped) runner() }
  const runner = effect(() => { value.value = G.withCache(fn) }, { scheduler: () => schedule(run, ms) })
  if (getCurrentScope()) onScopeDispose(() => { stopped = true; runner.effect.stop() })
  return value
}
