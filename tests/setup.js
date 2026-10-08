import { afterEach, vi } from 'vitest'
import { FEATURES } from '../src/game/features.js'

// The engine saves to localStorage; give it an in-memory one
class MemoryStorage {
  constructor() { this.data = new Map() }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null }
  setItem(k, v) { this.data.set(k, String(v)) }
  removeItem(k) { this.data.delete(k) }
  clear() { this.data.clear() }
}
globalThis.localStorage = new MemoryStorage()

// Real weather changes with the clock; tests that need it switch it back on
FEATURES.weatherEffects = false

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})
