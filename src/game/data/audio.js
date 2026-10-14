/*
  Everything the sound settings are made of, as plain data: the alerts the game can play, the music
  themes, the sound packs and palettes, and the quick profiles. The sound itself lives in music.js
  (music and ambience) and sound.js (effects and the alert manager).
*/

/* ---------------- alerts ---------------- */
// cat: where it is listed · sound: which effect it plays · prio: high alerts duck the music and win a
// crowded moment, low ones give way · gap: shortest time between two of them (ms) · group: a burst
// becomes a single sound · bg: heard with the tab hidden by default · stinger: a short musical phrase
// played instead of the effect while the music is on · caption: a line for sound captions
export const CUE_CATS = ['progress', 'loot', 'combat', 'world', 'town', 'system']
const cue = (id, cat, sound, o = {}) => ({ id, cat, sound, prio: 'normal', gap: 250, group: false, bg: false, ...o })
export const CUES = [
  cue('levelUp', 'progress', 'level', { prio: 'low', gap: 600, group: true }),
  cue('heroLevel', 'progress', 'quest', { prio: 'high', bg: true, stinger: 'rise' }),
  cue('achievement', 'progress', 'quest', { gap: 800 }),
  cue('quest', 'progress', 'quest'),
  cue('chapter', 'progress', 'quest', { prio: 'high', stinger: 'chapter' }),
  cue('dailyStreak', 'progress', 'quest'),
  cue('guildRank', 'progress', 'level'),
  cue('rareDrop', 'loot', 'rare', { gap: 400, group: true }),
  cue('masterwork', 'loot', 'rare'),
  cue('hybrid', 'loot', 'rare'),
  cue('pet', 'loot', 'rare', { prio: 'high', bg: true, stinger: 'rise' }),
  cue('petEgg', 'loot', 'rare', { prio: 'high', bg: true }),
  cue('petLevel', 'loot', 'level', { prio: 'low', gap: 800 }),
  cue('elite', 'combat', 'rare', { gap: 600 }),
  cue('huntStreak', 'combat', 'quest', { prio: 'low' }),
  cue('death', 'combat', 'bad', { prio: 'high', stinger: 'fall' }),
  cue('retreat', 'combat', 'bad'),
  cue('dungeon', 'combat', 'rare', { stinger: 'victory' }),
  cue('guardian', 'combat', 'rare', { stinger: 'victory' }),
  cue('weeklyKill', 'combat', 'quest', { prio: 'high', bg: true, stinger: 'victory' }),
  cue('jailed', 'combat', 'bad'),
  cue('omen', 'world', 'rare', { prio: 'high', bg: true }),
  cue('boon', 'world', 'quest'),
  cue('wish', 'world', 'rare'),
  cue('expedition', 'town', 'quest', { bg: true }),
  cue('unpaid', 'town', 'bad', { bg: true }),
  cue('queueDone', 'system', 'coin', { bg: true }),
  cue('weather', 'system', 'coin', { prio: 'low', gap: 5000 }),
  // Buttons and small actions on screen: buying, claiming, hiring…
  cue('ui', 'system', 'coin', { prio: 'low', gap: 60 }),
]
export const CUE_MAP = Object.fromEntries(CUES.map(c => [c.id, c]))
export const CUE_LIMIT = { desktop: 48, mobile: 24 } // effect voices playing at once
export const GROUP_WINDOW = 700 // ms in which a burst of the same alert counts as one

/* ---------------- packs and palettes ---------------- */
export const PACKS = ['classic', 'crystal', 'minimal']
export const PALETTES = ['soft', 'harp', 'retro']

/* ---------------- music themes ---------------- */
// key: MIDI root · prog: chord roots in semitones with their quality · scale: melody notes · bar: seconds
// per chord · notes: how busy the melody is · bright: filter cutoff · wave: pad waveform ·
// pulse: a soft heartbeat while fighting · drums: a low drum pattern (bosses, dungeons)
export const THEMES = {
  calm: { root: 50, prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], scale: [0, 2, 4, 7, 9], bar: 6.5, notes: 0.55, bright: 1800, wave: 'triangle' },
  adventure: { root: 52, prog: [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], scale: [0, 2, 4, 7, 9], bar: 4.8, notes: 0.75, bright: 2200, wave: 'sawtooth', pulse: true },
  dark: { root: 45, prog: [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], scale: [0, 3, 5, 7, 10], bar: 5.5, notes: 0.5, bright: 1300, wave: 'sawtooth', pulse: true },
  cold: { root: 47, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [7, 'min']], scale: [0, 2, 3, 7, 10], bar: 7, notes: 0.45, bright: 2600, wave: 'triangle' },
  ominous: { root: 48, prog: [[0, 'min'], [1, 'maj'], [0, 'min'], [8, 'maj']], scale: [0, 1, 3, 6, 7], bar: 6, notes: 0.4, bright: 1100, wave: 'sawtooth', pulse: true },
  celestial: { root: 53, prog: [[0, 'maj'], [4, 'min'], [9, 'min'], [5, 'maj']], scale: [0, 2, 4, 7, 11], bar: 7.5, notes: 0.6, bright: 3800, wave: 'triangle' },
  town: { root: 55, prog: [[0, 'maj'], [5, 'maj'], [7, 'maj'], [0, 'maj']], scale: [0, 2, 4, 5, 7, 9], bar: 4.2, notes: 0.8, bright: 2600, wave: 'triangle' },
  farm: { root: 53, prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], scale: [0, 2, 4, 7, 9], bar: 5.6, notes: 0.6, bright: 2300, wave: 'triangle' },
  dungeon: { root: 43, prog: [[0, 'min'], [3, 'maj'], [5, 'min'], [0, 'min']], scale: [0, 2, 3, 7, 8], bar: 5, notes: 0.35, bright: 1000, wave: 'sawtooth', drums: true },
  tower: { root: 50, prog: [[0, 'min'], [5, 'min'], [10, 'maj'], [3, 'maj']], scale: [0, 2, 3, 5, 7, 10], bar: 4.4, notes: 0.65, bright: 2000, wave: 'sawtooth', pulse: true },
  boss: { root: 41, prog: [[0, 'min'], [1, 'maj'], [5, 'min'], [6, 'maj']], scale: [0, 1, 3, 5, 6], bar: 4, notes: 0.45, bright: 1400, wave: 'sawtooth', drums: true },
  frozen: { root: 49, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [5, 'min']], scale: [0, 2, 3, 7, 9], bar: 7.2, notes: 0.4, bright: 3200, wave: 'triangle' },
  dragon: { root: 44, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [10, 'maj']], scale: [0, 2, 3, 5, 7, 8], bar: 5.2, notes: 0.5, bright: 1500, wave: 'sawtooth', drums: true },
}
export const THEME_IDS = Object.keys(THEMES)
// Short phrases over the current key: degrees from the root, in beats
export const STINGERS = {
  rise: [[0, 0], [4, 0.5], [7, 1], [12, 1.5]],
  victory: [[0, 0], [7, 0.33], [12, 0.66], [16, 1], [19, 1.5]],
  chapter: [[0, 0], [7, 0.75], [5, 1.5], [12, 2.25]],
  fall: [[7, 0], [3, 0.5], [0, 1], [-5, 1.6]],
}

/* ---------------- ambience by area ---------------- */
// What each region of the realm sounds like, on top of the weather
export const AREA_AMBIENCE = {
  meadow: { brook: 0.5, bees: 0.4 }, forest: { leaves: 0.6, owl: 0.5 }, caves: { drip: 0.8 }, swamp: { frogs: 0.7, bubbles: 0.5 },
  ruins: { whisper: 0.5 }, peaks: { chimes: 0.6 }, lair: { breath: 0.7 }, abyss: { drone: 0.7 }, void: { drone: 0.9 },
  celestial: { shimmer: 0.7 },
}
export const DUNGEON_AMBIENCE = { drip: 0.6, whisper: 0.3 }

/* ---------------- profiles ---------------- */
// Quick sets of sound settings; `cues` turns off whole kinds of alerts
const quiet = ['levelUp', 'petLevel', 'huntStreak', 'weather', 'ui', 'achievement', 'rareDrop']
export const PROFILES = {
  classic: { masterVol: 80, music: true, musicVol: 45, ambience: true, ambienceVol: 50, sound: true, sfxVol: 70, sfxPack: 'classic', palette: 'soft', tempo: 100, density: 60, softTone: false, cuesOff: [] },
  night: { masterVol: 45, music: true, musicVol: 30, ambience: true, ambienceVol: 40, sound: true, sfxVol: 45, sfxPack: 'minimal', palette: 'soft', tempo: 85, density: 40, softTone: true, cuesOff: ['ui', 'weather'] },
  focus: { masterVol: 70, music: true, musicVol: 35, ambience: true, ambienceVol: 45, sound: true, sfxVol: 55, sfxPack: 'minimal', palette: 'soft', tempo: 80, density: 30, softTone: false, cuesOff: quiet },
  alerts: { masterVol: 80, music: false, musicVol: 45, ambience: false, ambienceVol: 50, sound: true, sfxVol: 75, sfxPack: 'classic', palette: 'soft', tempo: 100, density: 60, softTone: false, cuesOff: ['ui', 'weather'] },
  cinematic: { masterVol: 85, music: true, musicVol: 65, ambience: true, ambienceVol: 60, sound: true, sfxVol: 70, sfxPack: 'crystal', palette: 'harp', tempo: 100, density: 85, softTone: false, cuesOff: [] },
  minimal: { masterVol: 70, music: false, musicVol: 45, ambience: true, ambienceVol: 30, sound: true, sfxVol: 50, sfxPack: 'minimal', palette: 'soft', tempo: 100, density: 60, softTone: false, cuesOff: quiet },
}
export const PROFILE_IDS = Object.keys(PROFILES)

// Sound settings and their defaults; older saves get them on load
export const AUDIO_DEFAULTS = {
  sfxPack: 'classic', palette: 'soft', tempo: 100, density: 60, musicMode: 'auto', musicTheme: 'calm', areaAmbience: true,
  subtitles: false, visualCues: true, softTone: false, mono: false, cues: {}, audioProfile: 'classic', customProfile: null,
}
// The settings a profile is made of, so a custom one can be saved and compared
export const PROFILE_KEYS = Object.keys(PROFILES.classic).filter(k => k !== 'cuesOff')
