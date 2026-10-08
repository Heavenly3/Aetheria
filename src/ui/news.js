/*
  The "What's new" window: shown once per device after an update, for players who already had a
  hero. Brand-new players start with everything marked as seen.
*/
import { t } from '../i18n/index.js'
import { CHANGELOG, newsKey } from '../game/data/changelog.js'

const STORE = 'aetheria-news'
const latest = CHANGELOG[0]
const lines = () => latest.sections.reduce((n, s) => n + t(`changelog.entries.${latest.id}.${s}`).split('\n').length, 0)

export const latestUpdate = () => latest
export function newsUnseen() {
  try { return localStorage.getItem(STORE) !== newsKey(lines()) } catch { return false }
}
export function markNewsSeen() {
  try { localStorage.setItem(STORE, newsKey(lines())) } catch { /* storage unavailable */ }
}
