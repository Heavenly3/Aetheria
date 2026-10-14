import { reactive } from 'vue'
import { state } from './engine.js'
import { AREAS } from './data/combat.js'
import { THEMES, THEME_IDS, STINGERS, AREA_AMBIENCE, DUNGEON_AMBIENCE } from './data/audio.js'

/*
  Music and ambient sound, synthesised with WebAudio: no audio files.
  - Music is generative: pad chords, a soft bass and a sparse melody. Each theme has its own key, chord
    progression and pace; night slows it down and darkens it, and bosses and dungeons add drums.
    It can follow the game (automatic) or stay on one theme (locked), in one of three palettes.
  - Ambience follows the weather (rain, wind, thunder, birds, crickets, snow, fog) and the region being
    fought in (brooks, dripping caves, frogs, wind chimes, a dragon breathing…).
  Effects and alerts (sound.js) share the same context. Everything goes through a limiter, so nothing
  peaks, and every node is let go of when its sound ends.
  Browsers only allow audio after the player has clicked or pressed a key, so nothing starts before.
*/

/* ================= scenes ================= */
const AREA_MOOD = {
  meadow: 'adventure', forest: 'adventure', caves: 'dark', swamp: 'dark', ruins: 'dark',
  peaks: 'frozen', lair: 'dragon', abyss: 'ominous', void: 'ominous', celestial: 'celestial',
}
const AREA_OF = {}
AREAS.forEach(a => a.monsters.forEach(m => (AREA_OF[m.id] = a.id)))
// Screens of the town, where the music turns homely
const TOWN = new Set(['tavern', 'guilds', 'shop', 'festival', 'church', 'forge', 'home'])

// What the music should feel like right now: the fight first, then the place, then the sky
export function moodFor(s = state, place = null, weather = null) {
  const a = s.activity
  if (a?.type === 'combat') {
    if (a.kind === 'area') return AREA_MOOD[AREA_OF[a.target]] || 'adventure'
    if (a.kind === 'tower') return 'tower'
    if (a.kind === 'dungeon') return 'dungeon'
    if (a.kind === 'omen') return 'ominous'
    if (a.kind === 'festival') return 'frozen'
    return 'boss' // bosses and the weekly boss
  }
  if (place === 'farming' || (a?.type === 'skill' && a.skill === 'farming')) return 'farm'
  if (place && TOWN.has(place)) return 'town'
  if (weather === 'snow' || weather === 'blizzard') return 'cold'
  return 'calm'
}
// The region being fought in, for its ambience
export function areaFor(s = state) {
  const a = s.activity
  if (a?.type !== 'combat') return null
  if (a.kind === 'area') return AREA_OF[a.target] || null
  if (a.kind === 'dungeon') return 'dungeon'
  return null
}
export const MOOD_IDS = THEME_IDS
const CHORD = { maj: [0, 4, 7], min: [0, 3, 7] }

// Which ambient layers each weather uses (levels 0-1)
const AMBIENCE = {
  clear: { birds: 0.6 }, clearNight: { crickets: 0.7 }, cloudy: { wind: 0.25 }, rain: { rain: 0.8, wind: 0.15 },
  fog: { wind: 0.2, hum: 0.6 }, wind: { wind: 0.8 }, snow: { wind: 0.3, snow: 0.5 }, storm: { rain: 1, wind: 0.5, thunder: 1 },
  heatwave: { insects: 0.6 }, blizzard: { wind: 1, snow: 1 },
}
export const ambienceFor = (weather, night) => AMBIENCE[weather === 'clear' && night ? 'clearNight' : weather] || {}
export const areaAmbienceFor = area => (area === 'dungeon' ? DUNGEON_AMBIENCE : AREA_AMBIENCE[area] || {})

// What is playing and why, for the settings screen
export const nowPlaying = reactive({ theme: 'calm', reason: 'auto', area: null, weather: 'clear', night: false, preview: null })

/* ================= the audio graph ================= */
// buses -> master -> tone (soft treble) -> mono -> limiter -> speakers; music also goes through a ducker
let ctx = null, master, tone, mono, limiter, musicBus, duckGain, ambBus, sfxBus, wet, noise
let unlocked = false, running = false, timer = null
let scene = { mood: 'calm', weather: 'clear', night: false, area: null }
let nextBar = 0, barIndex = 0, lastTheme = null, preview = null
const layers = {}
let captionFn = null
const captionAt = {}

const midiHz = n => 440 * 2 ** ((n - 69) / 12)
const level = v => Math.max(0, Math.min(100, v ?? 0)) / 100
const curve = v => v * v // volume sliders feel even to the ear
const settings = () => state.settings || {}
const hiddenTab = () => typeof document !== 'undefined' && document.hidden
// With the tab hidden and "silence in the background" on, only the alerts allowed there still sound
export const hiddenQuiet = () => hiddenTab() && settings().muteHidden !== false

export function audioContext() {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  ctx = new AC()
  limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.25
  limiter.connect(ctx.destination)
  mono = ctx.createGain(); mono.connect(limiter)
  tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 20000; tone.connect(mono)
  master = ctx.createGain(); master.connect(tone)
  musicBus = ctx.createGain(); duckGain = ctx.createGain(); ambBus = ctx.createGain(); sfxBus = ctx.createGain()
  musicBus.connect(duckGain).connect(master)
  ambBus.connect(master); sfxBus.connect(master)
  // A soft hall: a generated impulse with a long, dark tail (made once)
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

const previewing = () => !!(preview && ctx && ctx.currentTime < preview.until)
export function applyAudioSettings() {
  if (!ctx) return
  const st = settings(), t = ctx.currentTime
  const quiet = hiddenQuiet()
  master.gain.setTargetAtTime(st.muted ? 0 : curve(level(st.masterVol ?? 80)), t, 0.3)
  const musicOn = (st.music !== false || previewing()) && !quiet
  musicBus.gain.setTargetAtTime(musicOn ? curve(level(st.musicVol ?? 45)) * 0.55 : 0, t, 0.5)
  ambBus.gain.setTargetAtTime(st.ambience !== false && !quiet ? curve(level(st.ambienceVol ?? 50)) * 0.7 : 0, t, 0.5)
  sfxBus.gain.setTargetAtTime(st.sound !== false ? curve(level(st.sfxVol ?? 70)) : 0, t, 0.05)
  // Accessibility: softer treble and mono sound
  tone.frequency.setTargetAtTime(st.softTone ? 4200 : 20000, t, 0.2)
  mono.channelCount = st.mono ? 1 : 2
  mono.channelCountMode = st.mono ? 'explicit' : 'max'
  // Nothing to play at all: the context rests, and wakes again when something is turned back on
  const silentAll = st.muted || (st.music === false && st.ambience === false && st.sound === false && !previewing())
  if (silentAll && ctx.state === 'running') ctx.suspend?.()
  else if (!silentAll && ctx.state === 'suspended' && unlocked) ctx.resume?.()
}

/* ================= voices ================= */
// Every node is let go of once its sound has ended
function release(src, ...nodes) { src.onended = () => { src.disconnect(); nodes.forEach(n => n.disconnect()) } }
function voice({ freq, at, dur, type, gain, attack, release: rel, cutoff, send = 0.5, detune = 0, bus = musicBus }) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter()
  o.type = type; o.frequency.value = freq; o.detune.value = detune
  f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.4
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + attack)
  g.gain.setValueAtTime(gain, at + Math.max(attack, dur - rel))
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(f).connect(g)
  g.connect(bus)
  let s = null
  if (send) { s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(wet) }
  release(o, f, g, ...(s ? [s] : []))
  o.start(at); o.stop(at + dur + 0.05)
}
// A plucked string: a bright attack that dulls as it rings
function pluck(freq, at, gain) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), s = ctx.createGain()
  o.type = 'triangle'; o.frequency.value = freq
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 8, at); f.frequency.exponentialRampToValueAtTime(freq * 1.5, at + 0.6)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6)
  s.gain.value = 0.5
  o.connect(f).connect(g).connect(musicBus); g.connect(s).connect(wet)
  release(o, f, g, s)
  o.start(at); o.stop(at + 1.7)
}
function pulse(at, freq, gain = 0.14) {
  // A soft heartbeat: a low thump made of a falling sine
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.frequency.setValueAtTime(freq * 2, at); o.frequency.exponentialRampToValueAtTime(freq, at + 0.12)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
  o.connect(g).connect(musicBus); release(o, g); o.start(at); o.stop(at + 0.4)
}
// A big low drum with a little skin noise on top
function drum(at, gain = 0.2) {
  pulse(at, 46, gain)
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noise; f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.2
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain * 0.25, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)
  src.connect(f).connect(g).connect(musicBus); release(src, f, g); src.start(at, Math.random()); src.stop(at + 0.15)
}

/* ================= music ================= */
export function currentTheme() {
  if (previewing()) return preview.id
  const st = settings()
  if (st.musicMode === 'locked' && THEMES[st.musicTheme]) return st.musicTheme
  return THEMES[scene.mood] ? scene.mood : 'calm'
}
const fighting = () => state.activity?.type === 'combat'
function scheduleBar(at) {
  const id = currentTheme(), m = THEMES[id], st = settings()
  const night = scene.night ? 1 : 0
  const palette = st.palette || 'soft'
  const bar = m.bar * (night ? 1.25 : 1) * (100 / Math.max(60, Math.min(140, st.tempo || 100)))
  const busy = Math.max(0, Math.min(100, st.density ?? 60)) / 60
  const cutoff = m.bright * (night ? 0.65 : 1)
  const [step, quality] = m.prog[barIndex % m.prog.length]
  const root = m.root + step
  // A new theme fades in on a chord boundary, never in the middle of one
  const fresh = id !== lastTheme
  lastTheme = id
  nowPlaying.theme = id
  nowPlaying.reason = previewing() ? 'preview' : st.musicMode === 'locked' ? 'locked' : 'auto'
  // Pad: the chord, each note doubled and slightly detuned
  const padWave = palette === 'retro' ? 'square' : m.wave
  CHORD[quality].forEach(iv => {
    const freq = midiHz(root + iv)
    const detunes = palette === 'retro' ? [0] : [-7, 7]
    for (const d of detunes) voice({ freq, at, dur: bar + 1.6, type: padWave, gain: palette === 'retro' ? 0.016 : palette === 'harp' ? 0.022 : 0.03, attack: fresh ? 3 : 1.8, release: 2.2, cutoff: palette === 'retro' ? cutoff * 0.6 : cutoff, send: palette === 'retro' ? 0.1 : 0.6, detune: d })
  })
  // Bass under it
  voice({ freq: midiHz(root - 12), at, dur: bar + 0.8, type: palette === 'retro' ? 'triangle' : 'sine', gain: 0.07, attack: 0.6, release: 1.5, cutoff: 400, send: 0.2 })
  // The melody, placed on a gentle grid
  const beats = 8, beat = bar / beats
  if (palette === 'harp') CHORD[quality].concat(12).forEach((iv, i) => pluck(midiHz(root + iv + 12), at + i * beat, 0.03))
  for (let b = 0; b < beats; b++) {
    if (Math.random() > Math.min(1, m.notes * busy) * (night ? 0.55 : 1) * (b % 2 ? 0.45 : 1)) continue
    const deg = m.scale[Math.floor(Math.random() * m.scale.length)]
    const oct = Math.random() < 0.3 ? 24 : 12
    const f = midiHz(m.root + deg + oct), t = at + b * beat + Math.random() * 0.04
    if (palette === 'harp') pluck(f, t, 0.05)
    else if (palette === 'retro') voice({ freq: f, at: t, dur: 0.28, type: 'square', gain: 0.022, attack: 0.005, release: 0.2, cutoff: 3200, send: 0 })
    else voice({ freq: f, at: t, dur: 2.6, type: 'sine', gain: 0.045, attack: 0.012, release: 2.4, cutoff: 5000, send: 0.9 })
  }
  // A heartbeat while fighting, and drums against bosses and in dungeons
  const inFight = fighting() || previewing()
  if (m.pulse && inFight) for (let b = 0; b < 4; b++) pulse(at + b * (bar / 4), midiHz(root - 24))
  if (m.drums && inFight) for (const b of [0, 3, 4, 6]) drum(at + b * beat, b === 0 ? 0.24 : 0.16)
  barIndex++
  return bar
}
// Short phrases for big moments, in the key of what is playing
export function playStinger(kind, vol = 1) {
  if (!ctx || !running || ctx.state !== 'running' || settings().music === false || hiddenQuiet()) return false
  const m = THEMES[currentTheme()], notes = STINGERS[kind]
  if (!notes) return false
  const at = ctx.currentTime + 0.02, beat = 0.22 * (100 / (settings().tempo || 100))
  for (const [deg, b] of notes) {
    voice({ freq: midiHz(m.root + 12 + deg), at: at + b * beat, dur: 1.6, type: 'triangle', gain: 0.07 * vol, attack: 0.01, release: 1.4, cutoff: 4200, send: 0.7 })
    voice({ freq: midiHz(m.root + deg), at: at + b * beat, dur: 1.2, type: 'sine', gain: 0.04 * vol, attack: 0.02, release: 1, cutoff: 2000, send: 0.4 })
  }
  return true
}
// Big alerts lower the music for a moment
export function duckMusic() {
  if (!ctx) return
  const t = ctx.currentTime
  duckGain.gain.cancelScheduledValues(t)
  duckGain.gain.setTargetAtTime(0.7, t, 0.04)
  duckGain.gain.setTargetAtTime(1, t + 0.4, 0.25)
}
export const musicPlaying = () => !!(running && ctx && ctx.state === 'running' && settings().music !== false && !hiddenQuiet())
// Hear a theme for a while, whatever the hero is doing; the game itself is not touched
export function previewTheme(id, seconds = 15) {
  if (!THEMES[id]) return
  unlockNow()
  if (!audioContext()) return
  preview = { id, until: ctx.currentTime + seconds }
  nowPlaying.preview = id
  nextBar = ctx.currentTime + 0.1
  applyAudioSettings()
  setTimeout(() => { if (preview?.id === id && !previewing()) stopPreview() }, seconds * 1000 + 200)
}
export function stopPreview() {
  preview = null
  nowPlaying.preview = null
  applyAudioSettings()
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
function toneLayer(id, freqs) {
  if (layers[id]) return layers[id]
  const g = ctx.createGain(); g.gain.value = 0
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220
  lp.connect(g).connect(ambBus)
  for (const f of freqs) { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(lp); o.start() }
  return (layers[id] = { g })
}
const LAYER_LEVEL = { rain: 0.22, wind: 0.3, snow: 0.12, hum: 0.05, brook: 0.08, drone: 0.07 }
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
  // Snow and blizzards hiss softly; fog hums low
  noiseLayer('snow', src => { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; src.connect(hp); return hp })
  toneLayer('hum', [62, 93])
  // Regions: a brook in the meadows, a deep drone in the Abyss and the Void
  noiseLayer('brook', src => {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.6
    const lfo = ctx.createOscillator(), depth = ctx.createGain()
    lfo.frequency.value = 0.31; depth.gain.value = 300
    lfo.connect(depth).connect(bp.frequency); lfo.start()
    src.connect(bp); return bp
  })
  toneLayer('drone', [41, 55.2, 61.7])
}
function wantedAmbience() {
  const want = { ...ambienceFor(scene.weather, scene.night) }
  if (settings().areaAmbience !== false) Object.assign(want, areaAmbienceFor(scene.area))
  return want
}
function setLayers() {
  const want = wantedAmbience(), t = ctx.currentTime
  for (const id in LAYER_LEVEL) layers[id]?.g.gain.setTargetAtTime((want[id] || 0) * LAYER_LEVEL[id], t, 2)
}
function chirp(at, from, to, dur, gain, type = 'sine') {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + dur)
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(ambBus); release(o, g); o.start(at); o.stop(at + dur + 0.02)
}
function noiseBurst(at, dur, freq, q, gain, rise = 0.2) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + dur * rise); g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(f).connect(g).connect(ambBus); release(src, f, g); src.start(at, Math.random()); src.stop(at + dur + 0.05)
}
// Thunder at a random distance: the further away, the duller, the later and with more echo
function thunder(at) {
  const far = Math.random()
  for (const [delay, share] of [[0, 1], [0.6 + far * 0.8, 0.35]]) {
    const src = ctx.createBufferSource(); src.buffer = noise
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260 - far * 140
    const g = ctx.createGain(), t = at + far * 0.8 + delay
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((0.9 - far * 0.4) * share, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5)
    src.connect(lp).connect(g).connect(ambBus); release(src, lp, g); src.start(t); src.stop(t + 3.6)
  }
  caption('thunder')
}
// Sound captions, at most one of a kind every few seconds
export function setCaptionHandler(fn) { captionFn = fn }
function caption(key) {
  if (!settings().subtitles || !captionFn) return
  const now = Date.now()
  if (now - (captionAt[key] || 0) < 12000) return
  captionAt[key] = now
  captionFn(key)
}
const PENTA = [0, 2, 4, 7, 9]
// Little sounds that come and go: birds, crickets, insects, thunder, and each region's own
function ambientEvents(t) {
  const want = wantedAmbience()
  const r = Math.random
  if (want.birds && r() < 0.05 * want.birds) {
    const base = 2200 + r() * 1600, n = 2 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) chirp(t + i * 0.13, base, base * (1.2 + r() * 0.3), 0.09, 0.05)
  }
  if (want.crickets && r() < 0.18 * want.crickets) for (let i = 0; i < 3; i++) chirp(t + i * 0.06, 4300, 4250, 0.035, 0.02)
  if (want.insects && r() < 0.12 * want.insects) for (let i = 0; i < 6; i++) chirp(t + i * 0.03, 5200, 5000, 0.025, 0.012)
  if (want.thunder && r() < 0.012 * want.thunder) thunder(t + 0.1)
  if (want.bees && r() < 0.03 * want.bees) chirp(t, 210 + r() * 40, 230 + r() * 40, 0.9, 0.012, 'sawtooth')
  if (want.leaves && r() < 0.05 * want.leaves) noiseBurst(t, 0.5, 3200, 0.7, 0.05, 0.4)
  if (want.owl && scene.night && r() < 0.012 * want.owl) { chirp(t, 390, 350, 0.35, 0.05); chirp(t + 0.5, 390, 340, 0.5, 0.05); caption('owl') }
  if (want.drip && r() < 0.07 * want.drip) { const f = 1400 + r() * 900; chirp(t, f, f * 0.55, 0.08, 0.04); chirp(t + 0.28, f, f * 0.55, 0.08, 0.012) }
  if (want.frogs && r() < 0.05 * want.frogs) for (let i = 0; i < 3; i++) chirp(t + i * 0.09, 170, 150, 0.06, 0.03, 'square')
  if (want.bubbles && r() < 0.05 * want.bubbles) chirp(t, 280 + r() * 120, 900, 0.07, 0.025)
  if (want.whisper && r() < 0.02 * want.whisper) { noiseBurst(t, 1.6, 1500, 4, 0.04, 0.5); caption('whisper') }
  if (want.chimes && r() < 0.04 * want.chimes) for (let i = 0; i < 2 + Math.floor(r() * 3); i++) chirp(t + i * 0.18, midiHz(84 + PENTA[Math.floor(r() * 5)]), midiHz(84 + PENTA[0]) * 1.001, 1.8, 0.02)
  if (want.breath && r() < 0.015 * want.breath) { noiseBurst(t, 3, 280, 0.8, 0.12, 0.5); caption('breath') }
  if (want.shimmer && r() < 0.05 * want.shimmer) chirp(t, 3000 + r() * 2000, 3100 + r() * 2000, 1.2, 0.012)
}

/* ================= running ================= */
function tick() {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  if (preview && !previewing()) stopPreview()
  if ((settings().music !== false || previewing()) && !hiddenQuiet()) {
    // After a while in the background the clock may have run ahead: pick up on the next chord
    if (nextBar < t) nextBar = t + 0.2
    while (nextBar < t + 1.2) nextBar += scheduleBar(nextBar)
  }
  if (settings().ambience !== false && !hiddenQuiet()) ambientEvents(t)
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
  wantRunning = false
  clearInterval(timer)
  if (ctx) for (const id in layers) layers[id].g.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
}
function unlockNow() {
  if (unlocked) return
  unlocked = true
  if (typeof window !== 'undefined') { window.removeEventListener('pointerdown', onUnlock); window.removeEventListener('keydown', onUnlock) }
  audioContext()?.resume?.()
}
let wantRunning = false
function onUnlock() { unlockNow(); if (wantRunning) start() }
export function startAmbient() {
  if (typeof window === 'undefined') return
  wantRunning = true
  if (unlocked) return start()
  // Wait for the first click or key press, as browsers require
  window.addEventListener('pointerdown', onUnlock); window.addEventListener('keydown', onUnlock)
}
// The game tells the music where the hero is; theme changes land on the next chord
export function setScene(next) {
  scene = { ...scene, ...next }
  Object.assign(nowPlaying, { area: scene.area, weather: scene.weather, night: scene.night })
  if (!previewing()) nowPlaying.theme = currentTheme()
  if (running && ctx) setLayers()
}
export const audioUnlocked = () => unlocked
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', applyAudioSettings)
