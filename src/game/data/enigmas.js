/*
  Enigmas: the hard thinking a guild affair ends with. Each kind is made from a seeded random source
  and a difficulty level (0 to 2), always has a solution, and is checked here, so the screens only
  draw and send moves. Texts live in the locales under `affairs.*`.

  - deduction  who did it: suspects, where each was and what each carried, and clues that leave one answer
  - cipher     a letter in a shifting alphabet; one or more dials turn the letters back, the answer is typed
  - beam       mirrors on a grid that turn to lead a beam of aether from the lens to the crystal
  - astrolabe  rings of constellations that turn, some dragging the next one, until the pointer reads right
  - balance    one false coin among many, found with a few weighings on the scales
  - echo       a row of runes that sounds and grows, repeated from memory
*/

const shuffle = (rng, a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const pick = (rng, a) => a[Math.floor(rng() * a.length)]
const int = (rng, n) => Math.floor(rng() * n)

export const ENIGMA_KINDS = ['deduction', 'cipher', 'beam', 'astrolabe', 'balance', 'echo']

/* ================= deduction ================= */
function permutations(n) {
  const out = []
  const go = (a, rest) => { if (!rest.length) out.push(a); else rest.forEach((x, i) => go([...a, x], rest.filter((_, j) => j !== i))) }
  go([], [...Array(n).keys()])
  return out
}
// Whether one assignment (place and item of every suspect) agrees with a clue
function holds(c, place, item) {
  const who = s => ({ place: place[s], item: item[s] })
  switch (c.t) {
    case 'at': return who(c.s).place === c.place
    case 'notAt': return who(c.s).place !== c.place
    case 'had': return who(c.s).item === c.item
    case 'notHad': return who(c.s).item !== c.item
    case 'pair': return place.some((p, s) => p === c.place && item[s] === c.item)
    case 'notPair': return !place.some((p, s) => p === c.place && item[s] === c.item)
    default: return true
  }
}
export function deductionSolutions(n, clues) {
  const perms = permutations(n)
  const out = []
  for (const place of perms) {
    if (!clues.every(c => !['at', 'notAt'].includes(c.t) || holds(c, place, place))) continue
    for (const item of perms) if (clues.every(c => holds(c, place, item))) out.push({ place, item })
  }
  return out
}
// The suspects are indexes into `names`; places and items are indexes into the lists the affair gives
export function makeDeduction(rng, level) {
  const n = 3 + level
  const place = shuffle(rng, [...Array(n).keys()])
  const item = shuffle(rng, [...Array(n).keys()])
  const culprit = int(rng, n)
  const pool = []
  for (let s = 0; s < n; s++) {
    for (let p = 0; p < n; p++) pool.push(place[s] === p ? { t: 'at', s, place: p } : { t: 'notAt', s, place: p })
    for (let i = 0; i < n; i++) pool.push(item[s] === i ? { t: 'had', s, item: i } : { t: 'notHad', s, item: i })
  }
  for (let p = 0; p < n; p++) for (let i = 0; i < n; i++) {
    const together = place.some((pp, s) => pp === p && item[s] === i)
    pool.push(together ? { t: 'pair', place: p, item: i } : { t: 'notPair', place: p, item: i })
  }
  // The harder the level, the fewer direct answers ("was in", "had") among the clues
  const direct = c => c.t === 'at' || c.t === 'had'
  const order = level === 0 ? shuffle(rng, pool) : [...shuffle(rng, pool.filter(c => !direct(c))), ...shuffle(rng, pool.filter(direct))]
  const clues = []
  for (const c of order) {
    clues.push(c)
    if (deductionSolutions(n, clues).length === 1) break
  }
  // Drop clues that are not needed, so every one of them matters
  for (let i = clues.length - 1; i >= 0; i--) {
    const without = clues.filter((_, j) => j !== i)
    if (deductionSolutions(n, without).length === 1) clues.splice(i, 1)
  }
  return { kind: 'deduction', n, place, item, culprit, crime: { place: place[culprit], item: item[culprit] }, clues: shuffle(rng, clues), answer: culprit }
}

/* ================= cipher ================= */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
// Letters only, in capitals and without accents, so both languages use the same 26 letters
export const plain = str => String(str).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim()
// Shifts each letter by the dial of its place in the row of letters (spaces do not count)
export function shiftText(text, key, sign = 1) {
  let k = 0
  return [...text].map(ch => {
    const i = ALPHABET.indexOf(ch)
    if (i < 0) return ch
    const s = key[k++ % key.length]
    return ALPHABET[(i + sign * s + 26 * 26) % 26]
  }).join('')
}
export const CIPHER_MESSAGES = ['meeting', 'vault', 'rival', 'buried', 'watch', 'traitor']
export const CIPHER_WORDS = ['lantern', 'bridge', 'well', 'mill', 'chapel', 'oak', 'tower', 'harbour']
// level 0: one dial and its setting among the clues · 1: one dial, a clue gives one letter · 2: three dials
export function makeCipher(rng, level) {
  const len = level === 2 ? 3 : 1
  const key = Array.from({ length: len }, () => 1 + int(rng, 25))
  return { kind: 'cipher', message: pick(rng, CIPHER_MESSAGES), word: pick(rng, CIPHER_WORDS), key, dials: len }
}
export const cipherSolved = (pz, typed, word) => plain(typed) === plain(word)

/* ================= beam ================= */
// Directions: 0 right, 1 down, 2 left, 3 up. A mirror '/' or '\' bends the beam
const STEP = [[0, 1], [1, 0], [0, -1], [-1, 0]]
const BEND = { '/': [3, 2, 1, 0], '\\': [1, 0, 3, 2] }
// Follows the beam from the lens on the left edge; returns the cells it crosses and where it ends
export function traceBeam(pz, grid = pz.grid) {
  let r = pz.source, c = -1, d = 0
  const path = []
  for (let steps = 0; steps < pz.size * pz.size * 4; steps++) {
    r += STEP[d][0]; c += STEP[d][1]
    if (r < 0 || c < 0 || r >= pz.size || c >= pz.size) return { path, exit: { r, c } }
    const cell = grid[r][c]
    path.push([r, c])
    if (cell === '#') return { path, blocked: true }
    if (cell === '/' || cell === '\\') d = BEND[cell][d]
  }
  return { path, loop: true }
}
export const beamSolved = (pz, grid = pz.grid) => { const t = traceBeam(pz, grid); return !!t.exit && t.exit.r === pz.target.r && t.exit.c === pz.target.c }
export function makeBeam(rng, level) {
  const size = 5 + level
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill('.'))
    const source = int(rng, size)
    let r = source, c = 0, d = 0
    const seen = new Set()
    let turns = 0
    let ok = true
    // Walk from the lens, bending now and then, until the beam leaves the grid
    for (;;) {
      const key = r * size + c
      if (seen.has(key)) { ok = false; break }
      seen.add(key)
      const canTurn = c > 0 || d !== 0
      if (canTurn && rng() < 0.4 && turns < 3 + level * 2) {
        const nd = rng() < 0.5 ? (d + 1) % 4 : (d + 3) % 4
        grid[r][c] = BEND['/'][d] === nd ? '/' : '\\'
        d = nd; turns++
      }
      r += STEP[d][0]; c += STEP[d][1]
      if (r < 0 || c < 0 || r >= size || c >= size) break
    }
    // A target on the left edge, next to the lens, or too few bends make a dull puzzle
    if (!ok || turns < 2 + level || c < 0) continue
    const target = { r, c }
    const mirrors = []
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (grid[i][j] !== '.') mirrors.push([i, j])
    // Decoy mirrors and stones off the path
    const free = []
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (!seen.has(i * size + j)) free.push([i, j])
    shuffle(rng, free).slice(0, 2 + level * 2).forEach(([i, j], k) => { grid[i][j] = k % 3 === 2 ? '#' : rng() < 0.5 ? '/' : '\\' })
    const solved = grid.map(row => [...row])
    // Turn every mirror at random; make sure it does not start solved
    const pz = { kind: 'beam', size, source, target, grid }
    for (let tries = 0; tries < 20; tries++) {
      for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (grid[i][j] === '/' || grid[i][j] === '\\') grid[i][j] = rng() < 0.5 ? '/' : '\\'
      if (!beamSolved(pz)) break
    }
    if (beamSolved(pz)) continue
    return { ...pz, solution: solved }
  }
  throw new Error('No beam puzzle')
}
// Turning a mirror; stones and empty floor do not turn
export function turnMirror(pz, r, c) {
  const cell = pz.grid[r]?.[c]
  if (cell === '/') pz.grid[r][c] = '\\'
  else if (cell === '\\') pz.grid[r][c] = '/'
  else return false
  return true
}

/* ================= astrolabe ================= */
export const STARS = ['wolf', 'crown', 'eye', 'serpent', 'tower', 'flame', 'raven', 'anvil']
export const RING_FACES = STARS.length
// Turning ring i moves it one step; from level 1 it drags the next ring with it, from level 2 the next two
export function turnRing(pz, i, dir = 1) {
  const reach = Math.min(pz.rings.length - 1, i + pz.drag)
  for (let k = i; k <= reach; k++) pz.at[k] = (pz.at[k] + dir + RING_FACES) % RING_FACES
  pz.turns = (pz.turns || 0) + 1
}
export const ringShows = (pz, i) => pz.rings[i][pz.at[i]]
export const astrolabeSolved = pz => pz.rings.every((_, i) => ringShows(pz, i) === pz.target[i])
export function makeAstrolabe(rng, level) {
  const n = 3 + level
  const rings = Array.from({ length: n }, () => shuffle(rng, STARS))
  const pz = { kind: 'astrolabe', rings, drag: level, at: Array.from({ length: n }, () => int(rng, RING_FACES)), turns: 0 }
  pz.target = rings.map((_, i) => ringShows(pz, i))
  // Scramble with moves the hero can make, so it can always be turned back
  do { for (let k = 0; k < 6 + level * 6; k++) turnRing(pz, int(rng, n), rng() < 0.5 ? 1 : -1) } while (astrolabeSolved(pz))
  pz.turns = 0
  return pz
}

/* ================= balance ================= */
// level 0: 8 coins, the false one is heavier, 3 weighings · 1: 9 coins, heavier, 2 weighings
// level 2: 12 coins, heavier or lighter, 3 weighings
export const BALANCE = [{ coins: 8, weighs: 3, either: false }, { coins: 9, weighs: 2, either: false }, { coins: 12, weighs: 3, either: true }]
export function makeBalance(rng, level) {
  const b = BALANCE[level]
  return { kind: 'balance', coins: b.coins, weighs: b.weighs, either: b.either, fake: int(rng, b.coins), heavy: b.either ? rng() < 0.5 : true, log: [] }
}
// -1: the left pan goes down · 1: the right pan goes down · 0: level
export function weigh(pz, left, right) {
  if (pz.log.length >= pz.weighs || !left.length || left.length !== right.length) return null
  if (left.some(c => right.includes(c))) return null
  const w = c => (c === pz.fake ? (pz.heavy ? 1 : -1) : 0)
  const diff = left.reduce((s, c) => s + w(c), 0) - right.reduce((s, c) => s + w(c), 0)
  const result = diff > 0 ? -1 : diff < 0 ? 1 : 0
  pz.log.push({ left: [...left], right: [...right], result })
  return result
}

/* ================= echo ================= */
export const ECHO = [{ runes: 4, length: 5 }, { runes: 5, length: 7 }, { runes: 6, length: 9 }]
export function makeEcho(rng, level) {
  const e = ECHO[level]
  return { kind: 'echo', runes: e.runes, seq: Array.from({ length: e.length }, () => int(rng, e.runes)) }
}

export function makeEnigma(kind, rng, level) {
  return { deduction: makeDeduction, cipher: makeCipher, beam: makeBeam, astrolabe: makeAstrolabe, balance: makeBalance, echo: makeEcho }[kind](rng, level)
}
