import { state } from './engine.js'
import { PROFILES, PROFILE_KEYS, AUDIO_DEFAULTS, CUES } from './data/audio.js'

/*
  Quick sets of sound settings. A profile sets the volumes, the pack, the palette and pace of the music,
  and which kinds of alerts stay quiet. The player can also keep one profile of their own, which travels
  with the save like every other setting.
*/
const pick = s => Object.fromEntries(PROFILE_KEYS.map(k => [k, s[k]]))

export function applyProfile(id) {
  const p = id === 'custom' ? state.settings.customProfile : PROFILES[id]
  if (!p) return false
  const st = state.settings
  Object.assign(st, pick(p))
  // Alerts the profile keeps quiet; the rest go back on
  const off = new Set(p.cuesOff || [])
  st.cues ||= {}
  for (const c of CUES) st.cues[c.id] = { ...(st.cues[c.id] || {}), on: !off.has(c.id) }
  st.audioProfile = id
  return true
}
// Keep the current sound settings as the player's own profile
export function saveCustomProfile() {
  const st = state.settings
  st.customProfile = { ...pick(st), cuesOff: CUES.filter(c => st.cues?.[c.id]?.on === false).map(c => c.id) }
  st.audioProfile = 'custom'
}
// The profile the current settings match, or null once something was changed by hand
export function matchingProfile(st = state.settings) {
  const same = p => PROFILE_KEYS.every(k => p[k] === st[k])
    && CUES.every(c => (st.cues?.[c.id]?.on !== false) === !(p.cuesOff || []).includes(c.id))
  if (st.audioProfile && st.audioProfile !== 'custom' && PROFILES[st.audioProfile] && same(PROFILES[st.audioProfile])) return st.audioProfile
  if (st.customProfile && same(st.customProfile)) return 'custom'
  return Object.keys(PROFILES).find(id => same(PROFILES[id])) || null
}
// Every sound setting back to how the game starts, keeping the player's own profile
export function resetAudio() {
  const st = state.settings, keep = st.customProfile
  Object.assign(st, pick(PROFILES.classic), { ...AUDIO_DEFAULTS, cues: {}, customProfile: keep }, { muteHidden: true, muted: false })
}
