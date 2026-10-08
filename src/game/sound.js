import { state } from './engine.js'
import { audioContext, sfxOut } from './music.js'

// Sound effects synthesised with WebAudio (no audio files needed); they share the music's context
const NOTES = {
  level: [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]],
  rare: [[1175, 0], [1568, 0.07], [2093, 0.14]],
  coin: [[988, 0], [1319, 0.06]],
  quest: [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36]],
  bad: [[220, 0], [165, 0.14]],
  dice: [[300, 0], [420, 0.05], [360, 0.1]],
}

export function play(kind, volume = 0.12) {
  if (!state.settings?.sound) return
  try {
    const ctx = audioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    ;(NOTES[kind] || NOTES.coin).forEach(([freq, at]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = kind === 'bad' ? 'sawtooth' : 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + at)
      gain.gain.exponentialRampToValueAtTime(volume, now + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.32)
      osc.connect(gain).connect(sfxOut())
      osc.start(now + at)
      osc.stop(now + at + 0.35)
    })
  } catch { /* audio unavailable */ }
}

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
