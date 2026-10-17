import { expect } from 'vitest'
import { FEATURES } from '../src/game/features.js'

// The engine saves to localStorage; give it an in-memory one. Every test starts with it empty:
// it is cleared the first time a new test touches it (a hook here can fail to register when the
// machine is busy, so none is used; mocks are restored by `restoreMocks` in vitest.config.js)
class MemoryStorage {
  #map = new Map()
  #test
  get data() {
    const name = expect.getState().currentTestName
    if (name !== this.#test) { this.#test = name; this.#map = new Map() }
    return this.#map
  }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null }
  setItem(k, v) { this.data.set(k, String(v)) }
  removeItem(k) { this.data.delete(k) }
  clear() { this.data.clear() }
}
globalThis.localStorage = new MemoryStorage()

// Real weather changes with the clock; tests that need it switch it back on
FEATURES.weatherEffects = false
