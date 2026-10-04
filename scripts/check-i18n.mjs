// Checks the translation files:
//  1) every key the code uses exists in English (static keys in the source plus every data name/description)
//  2) every locale has exactly the same keys as English
//  3) every translation uses the same {placeholders} as the English text
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = p => import(pathToFileURL(join(root, p)))

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}
const placeholders = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

const { i18n, LOCALES } = await load('src/i18n/index.js')
const locales = {}
for (const loc of Object.keys(LOCALES)) locales[loc] = flatten((await load(`src/i18n/locales/${loc}.js`)).default)
const en = locales.en
let problems = 0
const report = (title, list) => {
  if (!list.length) return
  problems += list.length
  console.log(`\n${title} (${list.length})`)
  list.forEach(l => console.log('  ' + l))
}

// 1) Keys used by the code
i18n.global.locale.value = 'en'
const used = new Map()
i18n.global.setMissingHandler((_, key) => { if (!used.has(key)) used.set(key, 'game data') })
const seen = new Set()
const touch = (v, depth = 0) => {
  if (depth > 7 || !v || typeof v !== 'object' || seen.has(v)) return
  seen.add(v)
  for (const k of Object.keys(v)) {
    let x
    try { x = v[k] } catch { continue }
    if (typeof x === 'function' && (k === 'name' || k === 'desc')) { try { x(1) } catch { /* needs real game state */ } }
    else touch(x, depth + 1)
  }
}
for (const f of ['skills', 'items', 'actions', 'combat', 'progression', 'character', 'tavern', 'extras']) {
  Object.values(await load(`src/game/data/${f}.js`)).forEach(v => touch(v))
}
const { towerMonster } = await load('src/game/data/combat.js')
for (let floor = 1; floor <= 100; floor++) touch(towerMonster(floor))

const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p] })
const NOT_KEYS = /\.(js|vue|json|css|mjs)$/
for (const file of walk(join(root, 'src')).filter(f => /\.(vue|js)$/.test(f) && !f.includes('locales'))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/(?:\$t|\bt|\btm|\btoast|\blog|\bmsg|\bte)\(\s*(?:'[^']*',\s*)?'([a-z][\w]*(?:\.[\w]+)+)'/g)) {
    if (!NOT_KEYS.test(m[1]) && !used.has(m[1])) used.set(m[1], relative(root, file))
  }
}
report('Missing in en', [...used].filter(([k]) => !(k in en)).map(([k, where]) => `${k}  (${where})`))

// 2 + 3) Compare every locale with English
for (const [loc, msgs] of Object.entries(locales)) {
  if (loc === 'en') continue
  report(`Missing in ${loc}`, Object.keys(en).filter(k => !(k in msgs)))
  report(`Not in en, extra in ${loc}`, Object.keys(msgs).filter(k => !(k in en)))
  report(`Placeholder mismatch in ${loc}`, Object.keys(en).filter(k => k in msgs && placeholders(en[k]) !== placeholders(msgs[k]))
    .map(k => `${k}: en {${placeholders(en[k])}} vs {${placeholders(msgs[k])}}`))
  report(`Reserved character in ${loc}`, Object.entries(msgs).filter(([, v]) => /[@|]/.test(v)).map(([k]) => k))
}
report('Reserved character in en', Object.entries(en).filter(([, v]) => /[@|]/.test(v)).map(([k]) => k))

if (problems) { console.log(`\n${problems} problem(s) found.`); process.exit(1) }
console.log(`All good: ${Object.keys(en).length} keys in ${Object.keys(locales).length} languages.`)
