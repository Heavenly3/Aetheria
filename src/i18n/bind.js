import { t } from './index.js'

// Define localized, reactive `name` (and optionally `desc`) getters on a data object.
// Getters read the active locale, so templates re-render when the language changes.
export function named(obj, name, desc) {
  const def = (prop, val) => Object.defineProperty(obj, prop, {
    get: typeof val === 'function' ? val : () => t(val),
    enumerable: true,
    configurable: true,
  })
  if (name) def('name', name)
  if (desc) def('desc', desc)
  return obj
}

// Copy an object while keeping its localized getters live
export function cloneNamed(src, extra = {}) {
  const out = { ...src, ...extra }
  const desc = Object.getOwnPropertyDescriptor(src, 'name')
  if (desc?.get) Object.defineProperty(out, 'name', { get: desc.get, enumerable: true, configurable: true })
  const d2 = Object.getOwnPropertyDescriptor(src, 'desc')
  if (d2?.get) Object.defineProperty(out, 'desc', { get: d2.get, enumerable: true, configurable: true })
  return out
}
