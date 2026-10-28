/* =========================================================
   FEEDBACK — what a player can attach when they report a bug or share an idea.
   The game keeps the last few errors of this session in memory and builds a short plain-text
   report (version, device, hero) that the player copies or sends themselves. Nothing is sent
   anywhere on its own.
   ========================================================= */

import { storage } from './saveGuard.js'

export const ITCH_URL = 'https://3vynia.itch.io/aetheria'
export const ISSUES_URL = 'https://github.com/Heavenly3/Aetheria/issues/new'
const KEEP = 5
// Browsers add these for reasons outside the game (extensions, other origins, layout warnings)
const NOISE = [/^Script error\.?$/i, /ResizeObserver loop/i]

const errors = []
const listeners = new Set()

export const sessionErrors = () => errors.slice()
export function clearErrors() { errors.length = 0 }
// Called with each error kept, so the game can mention once that it can be reported
export function onError(fn) { listeners.add(fn); return () => listeners.delete(fn) }

export function recordError(err, where = '') {
  const msg = String(err?.message || err?.reason?.message || err?.reason || err || 'Unknown error').slice(0, 300)
  if (NOISE.some(re => re.test(msg))) return null
  const line = String(err?.stack || '').split('\n').find(l => /\.(js|vue)/.test(l))?.trim().slice(0, 200) || ''
  const entry = { at: Date.now(), msg, where, line }
  errors.push(entry)
  if (errors.length > KEEP) errors.shift()
  for (const fn of listeners) fn(entry)
  return entry
}

// Catches errors from Vue components and from anywhere else on the page
export function installErrorLog(app) {
  if (app) {
    const prev = app.config.errorHandler
    app.config.errorHandler = (err, _vm, info) => {
      recordError(err, info)
      if (prev) prev(err, _vm, info)
      else console.error(err)
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('error', e => recordError(e.error || e.message, 'window'))
    window.addEventListener('unhandledrejection', e => recordError(e.reason, 'promise'))
  }
}

const hours = sec => `${(sec / 3600).toFixed(1)} h`

// The report, in English so whoever reads it can follow it whatever the player's language
export function buildReport({ version, locale, hero, now = Date.now() }) {
  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const win = typeof window !== 'undefined' ? window : {}
  let embedded = false
  try { embedded = win.self !== win.top } catch { embedded = true }
  const lines = [
    `Version: ${version}`,
    `Date: ${new Date(now).toISOString()}`,
    `Language: ${locale}`,
    `Browser: ${nav.userAgent || 'unknown'}`,
    `Screen: ${win.innerWidth || '?'}x${win.innerHeight || '?'} @${win.devicePixelRatio || 1}x`,
    `Playing on: ${embedded ? 'embedded page (itch.io)' : 'website'}`,
    `Storage: ${storage.mode}`,
  ]
  if (hero) {
    lines.push(
      `Hero: level ${hero.heroLevel}, total skill level ${hero.totalLevel}, ${hero.role}, ${hero.difficulty}`,
      `Play time: ${hours(hero.playTime)}, rebirths: ${hero.rebirths}`,
      `Doing: ${hero.activity || 'nothing'}`,
    )
  }
  lines.push(errors.length ? `Errors this session (${errors.length}):` : 'Errors this session: none')
  for (const e of errors) lines.push(`- ${new Date(e.at).toISOString().slice(11, 19)} ${e.msg}${e.where ? ` [${e.where}]` : ''}${e.line ? `\n  ${e.line}` : ''}`)
  return lines.join('\n')
}

// The player's words first, then the report
export const fullText = (message, report) => `${message.trim() || '(no description)'}\n\n---\n${report}`

// A new GitHub issue with the text filled in; long texts are cut so the address still opens
export function issueUrl(kind, message, report) {
  const title = `[${kind === 'bug' ? 'Bug' : 'Idea'}] ${message.trim().split('\n')[0].slice(0, 80)}`
  let body = fullText(message, report)
  if (body.length > 6000) body = body.slice(0, 6000) + '\n…'
  return `${ISSUES_URL}?${new URLSearchParams({ title, body, labels: kind === 'bug' ? 'bug' : 'enhancement' })}`
}
