import { state } from './engine.js'
import { audioContext, sfxOut, duckMusic, playStinger, musicPlaying, hiddenQuiet } from './music.js'
import { CUE_MAP, CUE_LIMIT, GROUP_WINDOW } from './data/audio.js'

/*
  Sound effects and the alerts that play them, synthesised with WebAudio (no audio files).
  Every alert can be turned off, given its own volume, heard with the tab hidden or sent as a browser
  notification. The manager keeps an idle game from turning into a wall of beeps: each alert waits a
  little before it can sound again, bursts become a single sound, and crowded moments drop the least
  important ones. Big alerts lower the music for a moment, and some play a short musical phrase.
*/
const NOTES = {
  level: [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]],
  rare: [[1175, 0], [1568, 0.07], [2093, 0.14]],
  coin: [[988, 0], [1319, 0.06]],
  quest: [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36]],
  bad: [[220, 0], [165, 0.14]],
  dice: [[300, 0], [420, 0.05], [360, 0.1]],
  burst: [[784, 0], [988, 0.04], [1175, 0.08], [1568, 0.12]],
}

/* ---------------- voices ---------------- */
let voices = 0
const voiceLimit = () => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? CUE_LIMIT.mobile : CUE_LIMIT.desktop)
function tone(ctx, out, freq, at, dur, type, vol) {
  const osc = ctx.createOscillator(), gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(out)
  voices++
  osc.onended = () => { voices--; osc.disconnect(); gain.disconnect() }
  osc.start(at)
  osc.stop(at + dur + 0.03)
}
// One effect in one of the packs: classic (the original), crystal (bright bells) or minimal (soft clicks)
function render(kind, pack, volume) {
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const out = sfxOut(), now = ctx.currentTime
  const notes = NOTES[kind] || NOTES.coin
  if (pack === 'minimal') {
    const [freq] = notes[0]
    tone(ctx, out, kind === 'bad' ? freq : freq * 0.75, now, 0.09, 'sine', volume * 0.7)
    return
  }
  notes.forEach(([freq, at]) => {
    if (pack === 'crystal') {
      tone(ctx, out, freq * (kind === 'bad' ? 1 : 2), now + at, 0.6, 'sine', volume * 0.7)
      tone(ctx, out, freq * (kind === 'bad' ? 1.5 : 3), now + at + 0.01, 0.4, 'sine', volume * 0.18)
    } else tone(ctx, out, freq, now + at, 0.32, kind === 'bad' ? 'sawtooth' : 'triangle', volume)
  })
}

/* ---------------- the alert manager ---------------- */
// How a single alert is set up: the catalogue's defaults under the player's own choices
export function cueSettings(id, settings = state.settings) {
  const c = CUE_MAP[id]
  return { on: true, vol: 100, bg: !!c?.bg, notify: !!c?.bg, ...(settings?.cues?.[id] || {}) }
}
export function setCue(id, patch) {
  const cues = (state.settings.cues ||= {})
  cues[id] = { ...cueSettings(id), ...patch }
}
// Whether an alert may sound now: 'play', 'hold' (part of a burst) or 'skip' (too soon after the last)
export function gateCue(memo, cue, now) {
  const m = (memo[cue.id] ||= { last: -Infinity, held: 0 })
  if (cue.group && now - m.last < GROUP_WINDOW) { m.held++; return 'hold' }
  if (now - m.last < cue.gap) return 'skip'
  m.last = now
  m.held = 0
  return 'play'
}
const memo = {}
const flushes = {}
// With the sound off, important alerts can still light up the screen
function flash() {
  if (state.settings?.visualCues === false || state.settings?.reduceMotion || typeof document === 'undefined') return
  const b = document.body
  b.classList.remove('cue-flash')
  void b.offsetWidth
  b.classList.add('cue-flash')
  setTimeout(() => b.classList.remove('cue-flash'), 900)
}
/*
  Play an alert from the catalogue.
  opts.sound: another effect than the alert's own · opts.notify: [title, body] for a browser notification
  when the tab is hidden · opts.force: a preview, which skips every rule
*/
export function cue(id, opts = {}) {
  const c = CUE_MAP[id]
  const st = state.settings
  if (!c || !st) return
  const cs = cueSettings(id)
  const hidden = typeof document !== 'undefined' && document.hidden
  if (opts.notify && hidden && cs.notify) notify(...opts.notify)
  if (!cs.on && !opts.force) return
  const audible = st.sound !== false && !st.muted
  if (!audible) { if (c.prio === 'high' && !opts.force) flash(); if (!opts.force) return }
  if (!opts.force && hiddenQuiet() && !cs.bg) return
  if (!opts.force) {
    if (voices >= voiceLimit() && c.prio !== 'high') return
    const gate = gateCue(memo, c, Date.now())
    if (gate === 'skip') return
    if (gate === 'hold') {
      // The end of a burst plays one quick run, however many there were
      if (!flushes[id]) flushes[id] = setTimeout(() => { flushes[id] = null; if (memo[id]?.held > 0) { memo[id].held = 0; render('burst', st.sfxPack, 0.1 * cs.vol / 100) } }, GROUP_WINDOW)
      return
    }
  }
  try {
    const vol = 0.12 * Math.max(0, Math.min(150, cs.vol)) / 100
    if (c.prio === 'high') duckMusic()
    if (c.stinger && !opts.sound && musicPlaying() && playStinger(c.stinger, cs.vol / 100)) return
    render(opts.sound || c.sound, st.sfxPack || 'classic', vol)
  } catch { /* audio unavailable */ }
}
export function previewCue(id) { cue(id, { force: true }) }
export function previewPack(pack) { try { render('quest', pack, 0.12) } catch { /* audio unavailable */ } }

// Small sounds for buttons and actions on screen; they follow the "Interface" alert
export function play(kind) { cue('ui', { sound: kind }) }

// Browser notifications: only when the player enabled them and the tab is hidden
export async function requestNotify() {
  try {
    if (!('Notification' in window)) return false
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    return perm === 'granted'
  } catch { return false }
}
export function notify(title, body) {
  try {
    if (!state.settings?.notify || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return
    new Notification(title, { body, tag: title })
  } catch { /* notifications unavailable */ }
}
