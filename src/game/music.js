import { state } from './engine.js'
import { AREAS } from './data/combat.js'

/*
  Music and ambient sound, synthesised with WebAudio: no audio files.
  - Music is generative: slow pad chords, a soft bass and a sparse bell melody. Each mood has its own
    key, chord progression and pace; night slows it down and darkens it.
  - Ambience follows the weather: rain, wind, thunder, birds by day and crickets by night.
  Sound effects (sound.js) share the same context and the master volume.
  Browsers only allow audio after the player has clicked or pressed a key, so nothing starts before.
*/

/* ================= scenes ================= */
const AREA_MOOD = {
  meadow: 'adventure', forest: 'adventure', caves: 'dark', swamp: 'dark', ruins: 'dark',
  peaks: 'cold', lair: 'ominous', abyss: 'ominous', void: 'ominous', celestial: 'celestial',
}
const AREA_OF = {}
AREAS.forEach(a => a.monsters.forEach(m => (AREA_OF[m.id] = a.id)))

// What the music should feel like right now
export function moodFor(s = state) {
  const a = s.activity
  if (a?.type === 'combat') {
    if (a.kind === 'area') return AREA_MOOD[AREA_OF[a.target]] || 'adventure'
    if (a.kind === 'tower') return 'celestial'
    return 'ominous' // bosses, dungeons, the weekly boss and omen hunts
  }
  return 'calm'
}

// MIDI root, chord roots (semitones from it) with their quality, melody scale, seconds per chord
const MOODS = {
  calm: { root: 50, prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], scale: [0, 2, 4, 7, 9], bar: 6.5, notes: 0.55, bright: 1800, wave: 'triangle' },
  adventure: { root: 52, prog: [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], scale: [0, 2, 4, 7, 9], bar: 4.8, notes: 0.75, bright: 2200, wave: 'sawtooth', pulse: true },
  dark: { root: 45, prog: [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], scale: [0, 3, 5, 7, 10], bar: 5.5, notes: 0.5, bright: 1300, wave: 'sawtooth', pulse: true },
  cold: { root: 47, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [7, 'min']], scale: [0, 2, 3, 7, 10], bar: 7, notes: 0.45, bright: 2600, wave: 'triangle' },
  ominous: { root: 48, prog: [[0, 'min'], [1, 'maj'], [0, 'min'], [8, 'maj']], scale: [0, 1, 3, 6, 7], bar: 6, notes: 0.4, bright: 1100, wave: 'sawtooth', pulse: true },
  celestial: { root: 53, prog: [[0, 'maj'], [4, 'min'], [9, 'min'], [5, 'maj']], scale: [0, 2, 4, 7, 11], bar: 7.5, notes: 0.6, bright: 3800, wave: 'triangle' },
}
export const MOOD_IDS = Object.keys(MOODS)
const CHORD = { maj: [0, 4, 7], min: [0, 3, 7] }

// Which ambient layers each weather uses (levels 0-1)
const AMBIENCE = {
  clear: { birds: 0.6 }, clearNight: { crickets: 0.7 }, cloudy: { wind: 0.25 }, rain: { rain: 0.8, wind: 0.15 },
  fog: { wind: 0.2 }, wind: { wind: 0.8 }, snow: { wind: 0.3 }, storm: { rain: 1, wind: 0.5, thunder: 1 },
  heatwave: { insects: 0.6 }, blizzard: { wind: 1 },
}
export const ambienceFor = (weather, night) => AMBIENCE[weather === 'clear' && night ? 'clearNight' : weather] || {}

/* ================= the audio graph ================= */
let ctx = null, master, musicBus, ambBus, sfxBus, wet, noise
let unlocked = false, running = false, timer = null
let scene = { mood: 'calm', weather: 'clear', night: false }
let nextBar = 0, barIndex = 0
const layers = {}

const midiHz = n => 440 * 2 ** ((n - 69) / 12)
const level = v => Math.max(0, Math.min(100, v ?? 0)) / 100
const curve = v => v * v // volume sliders feel even to the ear

export function audioContext() {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.connect(ctx.destination)
  musicBus = ctx.createGain(); ambBus = ctx.createGain(); sfxBus = ctx.createGain()
  ;[musicBus, ambBus, sfxBus].forEach(b => b.connect(master))
  // A soft hall: a generated impulse with a long, dark tail
  wet = ctx.createConvolver()
  const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6
  }
  wet.buffer = ir
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.55
  wet.connect(wetGain).connect(musicBus)
  // Two seconds of noise, looped by the ambient layers
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  applyAudioSettings()
  return ctx
}
// Where sound effects go, so they follow the effects and master volume
export const sfxOut = () => (audioContext() ? sfxBus : null)

export function applyAudioSettings() {
  if (!ctx) return
  const st = state.settings || {}, t = ctx.currentTime
  const hidden = typeof document !== 'undefined' && document.hidden && st.muteHidden !== false
  master.gain.setTargetAtTime(hidden || st.muted ? 0 : curve(level(st.masterVol ?? 80)), t, 0.3)
  musicBus.gain.setTargetAtTime(st.music !== false ? curve(level(st.musicVol ?? 45)) * 0.55 : 0, t, 0.5)
  ambBus.gain.setTargetAtTime(st.ambience !== false ? curve(level(st.ambienceVol ?? 50)) * 0.7 : 0, t, 0.5)
  sfxBus.gain.setTargetAtTime(st.sound !== false ? curve(level(st.sfxVol ?? 70)) : 0, t, 0.05)
  if (!hidden && ctx.state === 'suspended' && unlocked) ctx.resume?.()
}

/* ================= music ================= */
function voice({ freq, at, dur, type, gain, attack, release, cutoff, send = 0.5, detune = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter()
  o.type = type; o.frequency.value = freq; o.detune.value = detune
  f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.4
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + attack)
  g.gain.setValueAtTime(gain, at + Math.max(attack, dur - release))
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(f).connect(g)
  g.connect(musicBus)
  if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(wet) }
  o.start(at); o.stop(at + dur + 0.05)
}
function pulse(at, freq) {
  // A soft heartbeat: a low thump made of a falling sine
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.frequency.setValueAtTime(freq * 2, at); o.frequency.exponentialRampToValueAtTime(freq, at + 0.12)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.14, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
  o.connect(g).connect(musicBus); o.start(at); o.stop(at + 0.4)
}
function scheduleBar(at) {
  const m = MOODS[scene.mood] || MOODS.calm
  const night = scene.night ? 1 : 0
  const bar = m.bar * (night ? 1.25 : 1)
  const cutoff = m.bright * (night ? 0.65 : 1)
  const [step, quality] = m.prog[barIndex % m.prog.length]
  const root = m.root + step
  // Pad: the chord, each note doubled and slightly detuned
  CHORD[quality].forEach(iv => {
    const freq = midiHz(root + iv)
    for (const d of [-7, 7]) voice({ freq, at, dur: bar + 1.6, type: m.wave, gain: 0.03, attack: 1.8, release: 2.2, cutoff, send: 0.6, detune: d })
  })
  // Bass under it
  voice({ freq: midiHz(root - 12), at, dur: bar + 0.8, type: 'sine', gain: 0.07, attack: 0.6, release: 1.5, cutoff: 400, send: 0.2 })
  // A few bell notes from the scale, placed on a gentle grid
  const beats = 8, beat = bar / beats
  for (let b = 0; b < beats; b++) {
    if (Math.random() > m.notes * (night ? 0.55 : 1) * (b % 2 ? 0.45 : 1)) continue
    const deg = m.scale[Math.floor(Math.random() * m.scale.length)]
    const oct = Math.random() < 0.3 ? 24 : 12
    voice({ freq: midiHz(m.root + deg + oct), at: at + b * beat + Math.random() * 0.04, dur: 2.6, type: 'sine', gain: 0.045, attack: 0.012, release: 2.4, cutoff: 5000, send: 0.9 })
  }
  if (m.pulse && state.activity?.type === 'combat') for (let b = 0; b < 4; b++) pulse(at + b * (bar / 4), midiHz(root - 24))
  barIndex++
  return bar
}

/* ================= ambience ================= */
function noiseLayer(id, build) {
  if (layers[id]) return layers[id]
  const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true
  const g = ctx.createGain(); g.gain.value = 0
  const tail = build(src)
  tail.connect(g).connect(ambBus)
  src.start()
  return (layers[id] = { g })
}
function ensureLayers() {
  noiseLayer('rain', src => {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000
    src.connect(hp).connect(lp); return lp
  })
  noiseLayer('wind', src => {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.8
    // The wind rises and falls on its own
    const lfo = ctx.createOscillator(), depth = ctx.createGain()
    lfo.frequency.value = 0.07; depth.gain.value = 260
    lfo.connect(depth).connect(bp.frequency); lfo.start()
    src.connect(bp); return bp
  })
}
function setLayers() {
  const want = ambienceFor(scene.weather, scene.night), t = ctx.currentTime
  for (const id of ['rain', 'wind']) layers[id].g.gain.setTargetAtTime((want[id] || 0) * (id === 'rain' ? 0.22 : 0.3), t, 2)
}
function chirp(at, from, to, dur, gain) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'sine'; o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + dur)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(ambBus); o.start(at); o.stop(at + dur + 0.02)
}
function thunder(at) {
  const src = ctx.createBufferSource(); src.buffer = noise
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.9, at + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, at + 3.5)
  src.connect(lp).connect(g).connect(ambBus); src.start(at); src.stop(at + 3.6)
}
// Little sounds that come and go: birds, crickets, insects and distant thunder
function ambientEvents(t) {
  const want = ambienceFor(scene.weather, scene.night)
  if (want.birds && Math.random() < 0.05 * want.birds) {
    const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) chirp(t + i * 0.13, base, base * (1.2 + Math.random() * 0.3), 0.09, 0.05)
  }
  if (want.crickets && Math.random() < 0.18 * want.crickets) for (let i = 0; i < 3; i++) chirp(t + i * 0.06, 4300, 4250, 0.035, 0.02)
  if (want.insects && Math.random() < 0.12 * want.insects) for (let i = 0; i < 6; i++) chirp(t + i * 0.03, 5200, 5000, 0.025, 0.012)
  if (want.thunder && Math.random() < 0.012 * want.thunder) thunder(t + 0.1)
}

/* ================= running ================= */
const silent = () => typeof document !== 'undefined' && document.hidden && state.settings?.muteHidden !== false
function tick() {
  if (!ctx || ctx.state !== 'running' || silent()) return
  const t = ctx.currentTime
  if (state.settings?.music !== false) {
    if (nextBar < t) nextBar = t + 0.2
    while (nextBar < t + 1.2) nextBar += scheduleBar(nextBar)
  }
  if (state.settings?.ambience !== false) ambientEvents(t)
}
function start() {
  if (running || !unlocked || !audioContext()) return
  running = true
  ensureLayers(); setLayers()
  if (ctx.state === 'suspended') ctx.resume?.()
  timer = setInterval(tick, 250)
}
export function stopAmbient() {
  running = false
  clearInterval(timer)
  if (ctx) for (const id in layers) layers[id].g.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
}
export function startAmbient() {
  if (typeof window === 'undefined') return
  if (unlocked) return start()
  // Wait for the first click or key press, as browsers require
  const unlock = () => {
    unlocked = true
    window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock)
    start()
  }
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock)
}
// The game tells the music where the hero is; mood changes land on the next chord
export function setScene(next) {
  scene = { ...scene, ...next }
  if (running && ctx) setLayers()
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', applyAudioSettings)
