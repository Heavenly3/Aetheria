/* =========================================================
   SAVE GUARD — keeping saves whole and kept.
   JSON writes NaN and Infinity as null, and a null where a number belongs breaks whatever reads it
   on the next load (and in every backup made after). Before each save, any number that is not a
   real number goes back to its default, or 0; on load, a null where the default is a number does too.
   Browsers may also clear a site's storage when space runs low; asking to keep it makes that far
   less likely.
   ========================================================= */

// Puts every bad number in obj back to its value in defaults (or 0) and returns where they were.
// nulls: also repair a null where the default is a number (saves written before this guard)
export function repairNumbers(obj, defaults, nulls = false, path = '', found = []) {
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    const d = defaults && typeof defaults === 'object' ? defaults[k] : undefined
    const at = path ? `${path}.${k}` : k
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) { obj[k] = Number.isFinite(d) ? d : 0; found.push(at) }
    } else if (v === null) {
      if (nulls && typeof d === 'number') { obj[k] = d; found.push(at) }
    } else if (typeof v === 'object') repairNumbers(v, d, nulls, at, found)
  }
  return found
}

// 'persistent', 'best-effort' or 'unknown'; shown in the feedback report
export const storage = { mode: 'unknown' }

// Asks the browser to keep the saves when it clears space. Chrome, Edge and Safari decide on their
// own without asking; Firefox would show the player a prompt out of nowhere, so it is left alone there
export async function keepStorage(nav = typeof navigator !== 'undefined' ? navigator : null) {
  const api = nav?.storage
  if (!api?.persisted) return storage.mode
  try {
    let kept = await api.persisted()
    if (!kept && api.persist && !/firefox/i.test(nav.userAgent || '')) kept = await api.persist()
    storage.mode = kept ? 'persistent' : 'best-effort'
  } catch { /* not allowed here, e.g. in some embedded pages */ }
  return storage.mode
}
