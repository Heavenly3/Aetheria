/*
  The "What's new" window: shown once per device after an update, for players who already had a
  hero. It lists every update since the one they last saw. Brand-new players start with everything
  marked as seen.
*/
import { t } from '../i18n/index.js'
import { CHANGELOG, newsKey } from '../game/data/changelog.js'

const STORE = 'aetheria-news'
const latest = CHANGELOG[0]
const lines = () => latest.sections.reduce((n, s) => n + t(`changelog.entries.${latest.id}.${s}`).split('\n').length, 0)
const stored = () => { try { return localStorage.getItem(STORE) } catch { return null } }

export const latestUpdate = () => latest
// Updates the player has not seen yet, newest first (just the latest one if we cannot tell)
export function unseenUpdates() {
  const seenId = (stored() || '').split(':')[0]
  const i = CHANGELOG.findIndex(e => e.id === seenId)
  if (i < 0) return [latest]
  return CHANGELOG.slice(0, Math.max(1, i))
}
export function newsUnseen() {
  try { return localStorage.getItem(STORE) !== newsKey(lines()) } catch { return false }
}
export function markNewsSeen() {
  try { localStorage.setItem(STORE, newsKey(lines())) } catch { /* storage unavailable */ }
}
