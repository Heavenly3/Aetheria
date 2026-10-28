/*
  Hero cards: a picture the player can share. One shows the hero (levels, best skills and the
  miracles found), the other a single ultra rare find. They are drawn on a canvas on the player's
  device; nothing is uploaded anywhere.
*/
import { t } from '../i18n/index.js'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { ROLES, DIFFICULTIES } from '../game/data/character.js'
import { MYTHIC_TIERS, MYTHIC_DROPS } from '../game/data/mythics.js'
import { MYTHIC_IDS } from '../game/mythics.js'
import { fmt, fmtTime } from '../game/format.js'
import { oneIn } from './itemSources.js'
import icons from '../game/icons.json'

export const CARD_W = 1200
export const CARD_H = 675
const SITE = '3vynia.itch.io/aetheria'
const TIER_ORDER = { mythic: 0, legendary: 1, epic: 2 }
const SKILLS_SHOWN = 4
const FINDS_SHOWN = 10

// What the hero card shows, as plain values
export function heroCardData() {
  const role = ROLES[state.role] || ROLES.warrior
  const diff = DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal
  const skills = Object.keys(SKILLS)
    .map(id => ({ id, xp: state.skills[id].xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, SKILLS_SHOWN)
    .map(({ id }) => ({ name: SKILLS[id].name, icon: SKILLS[id].icon, color: SKILLS[id].color, lvl: G.level(id) }))
  const found = MYTHIC_IDS.filter(id => G.mythicFound(id))
  const finds = found
    .map(id => ITEMS[id])
    .sort((a, b) => TIER_ORDER[a.myth] - TIER_ORDER[b.myth])
    .slice(0, FINDS_SHOWN)
    .map(it => ({ icon: it.icon, color: MYTHIC_TIERS[it.myth].color }))
  return {
    name: state.name,
    title: G.heroTitle()?.name || '',
    avatar: state.avatar, tint: state.tint || '#e2b65a',
    role: { name: role.name, icon: role.icon, color: role.color },
    diff: { name: diff.name, color: diff.color },
    stats: [
      [t('share.heroLevel'), fmt(G.heroLevel())],
      [t('share.totalLevel'), fmt(G.totalLevel())],
      [t('share.combatLevel'), fmt(G.combatLevel())],
      [t('share.played'), fmtTime(state.stats.playTime || 0)],
      [t('share.rebirths'), fmt(state.ascension?.count || 0)],
    ],
    skills,
    finds, found: found.length, total: MYTHIC_IDS.length,
  }
}

// What the card of one find shows
export function findCardData(id) {
  const it = ITEMS[id]
  const best = Math.max(0, ...MYTHIC_DROPS.filter(d => d.item === id).map(d => d.chance))
  return {
    item: it.name, icon: it.icon, color: MYTHIC_TIERS[it.myth].color,
    tier: t('mythic.tiers.' + it.myth),
    odds: best > 0 ? t('mythic.odds', { n: oneIn(best) }) : '',
    by: t('share.foundBy', { name: state.name, time: fmtTime(state.stats.playTime || 0) }),
  }
}

/* ---------- drawing ---------- */
const DISPLAY = '"Marcellus SC", Georgia, serif'
const BODY = '"Alegreya Sans", system-ui, sans-serif'
const GOLD = '#e2b65a'
const INK = '#ece4d3'
const MUTED = '#a9a3b8'

function icon(ctx, name, x, y, size, color) {
  const data = icons[name]
  if (!data) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / data[1], size / data[2])
  ctx.fillStyle = color
  for (const [, d] of data[0].matchAll(/ d="([^"]+)"/g)) ctx.fill(new Path2D(d))
  ctx.restore()
}

// Shrinks the font until the text fits
function fit(ctx, text, max, size, family, weight = '') {
  let s = size
  do { ctx.font = `${weight} ${s}px ${family}`.trim(); s -= 2 } while (s > 12 && ctx.measureText(text).width > max)
}

function spaced(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px` }

// '#abc' or '#aabbcc' with an alpha, as rgba(); anything else falls back to gold
function rgba(color, a) {
  let h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1] || GOLD.slice(1)
  if (h.length === 3) h = [...h].map(c => c + c).join('')
  const n = parseInt(h, 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function glow(ctx, x, y, r, color, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function frame(ctx, accent) {
  const bg = ctx.createRadialGradient(CARD_W * 0.3, CARD_H * 0.35, 40, CARD_W * 0.5, CARD_H * 0.5, CARD_W * 0.75)
  bg.addColorStop(0, '#221d3a')
  bg.addColorStop(1, '#0c0b14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.strokeStyle = rgba(accent, 0.6)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(18, 18, CARD_W - 36, CARD_H - 36, 26)
  ctx.stroke()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  icon(ctx, 'crown', 52, 44, 30, GOLD)
  ctx.fillStyle = GOLD
  ctx.font = `26px ${DISPLAY}`
  spaced(ctx, 6)
  ctx.fillText('AETHERIA', 92, 70)
  spaced(ctx, 0)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font = `20px ${BODY}`
  ctx.fillText(SITE, CARD_W - 52, CARD_H - 46)
}

function drawHero(ctx, d) {
  frame(ctx, GOLD)
  // The hero: avatar, name, title and class
  const cx = 250, cy = 250
  glow(ctx, cx, cy, 170, d.tint, 0.4)
  ctx.beginPath()
  ctx.arc(cx, cy, 104, 0, Math.PI * 2)
  ctx.fillStyle = '#15121f'
  ctx.fill()
  ctx.strokeStyle = d.tint
  ctx.lineWidth = 3
  ctx.stroke()
  icon(ctx, d.avatar, cx - 66, cy - 66, 132, d.tint)
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  fit(ctx, d.name, 380, 46, DISPLAY)
  ctx.fillText(d.name, cx, 420)
  if (d.title) {
    ctx.fillStyle = GOLD
    fit(ctx, d.title, 380, 24, BODY, 'italic')
    ctx.fillText(d.title, cx, 456)
  }
  ctx.font = `600 22px ${BODY}`
  const roleLine = `${d.role.name} · ${d.diff.name}`
  const w = ctx.measureText(roleLine).width
  icon(ctx, d.role.icon, cx - w / 2 - 34, 480, 26, d.role.color)
  ctx.fillStyle = d.role.color
  ctx.textAlign = 'left'
  ctx.fillText(d.role.name, cx - w / 2, 502)
  ctx.fillStyle = d.diff.color
  ctx.textAlign = 'right'
  ctx.fillText(d.diff.name, cx + w / 2, 502)
  ctx.fillStyle = MUTED
  ctx.textAlign = 'center'
  ctx.fillText('·', cx - w / 2 + ctx.measureText(d.role.name).width + ctx.measureText(' · ').width / 2, 502)

  // Numbers
  const x0 = 470, colW = 230
  d.stats.forEach(([label, value], i) => {
    const x = x0 + (i % 3) * colW, y = 150 + Math.floor(i / 3) * 104
    ctx.textAlign = 'left'
    ctx.fillStyle = GOLD
    // The display font has small capitals only, so values with letters (play time) use the body one
    if (/^[\d.,\s]+$/.test(value)) fit(ctx, value, colW - 20, 44, DISPLAY)
    else fit(ctx, value, colW - 20, 40, BODY, '700')
    ctx.fillText(value, x, y)
    ctx.fillStyle = MUTED
    ctx.font = `20px ${BODY}`
    ctx.fillText(label, x, y + 30)
  })

  // Best skills
  ctx.fillStyle = MUTED
  ctx.font = `700 16px ${BODY}`
  spaced(ctx, 3)
  ctx.fillText(t('share.bestSkills').toUpperCase(), x0, 370)
  spaced(ctx, 0)
  d.skills.forEach((s, i) => {
    const x = x0 + (i % 2) * 340, y = 392 + Math.floor(i / 2) * 50
    icon(ctx, s.icon, x, y, 34, s.color)
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    fit(ctx, s.name, 220, 24, BODY, '500')
    ctx.fillText(s.name, x + 46, y + 26)
    ctx.fillStyle = GOLD
    ctx.textAlign = 'right'
    ctx.font = `700 24px ${BODY}`
    ctx.fillText(String(s.lvl), x + 310, y + 26)
  })

  // Miracles
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = `700 16px ${BODY}`
  spaced(ctx, 3)
  ctx.fillText(`${t('share.finds').toUpperCase()}  ${d.found}/${d.total}`, x0, 520)
  spaced(ctx, 0)
  if (!d.finds.length) {
    ctx.font = `italic 20px ${BODY}`
    ctx.fillText(t('share.noFinds'), x0, 556)
  }
  d.finds.forEach((f, i) => {
    const x = x0 + i * 58, y = 536
    glow(ctx, x + 22, y + 22, 30, f.color, 0.45)
    icon(ctx, f.icon, x + 4, y + 4, 36, f.color)
  })
}

function drawFind(ctx, d) {
  frame(ctx, d.color)
  const cx = CARD_W / 2
  glow(ctx, cx, 250, 230, d.color, 0.45)
  icon(ctx, d.icon, cx - 100, 150, 200, d.color)
  ctx.textAlign = 'center'
  ctx.fillStyle = d.color
  ctx.font = `800 22px ${BODY}`
  spaced(ctx, 8)
  ctx.fillText(d.tier.toUpperCase(), cx, 400)
  spaced(ctx, 0)
  fit(ctx, d.item, CARD_W - 200, 60, DISPLAY)
  ctx.fillText(d.item, cx, 470)
  ctx.fillStyle = INK
  ctx.font = `24px ${BODY}`
  if (d.odds) ctx.fillText(d.odds, cx, 516)
  ctx.fillStyle = MUTED
  fit(ctx, d.by, CARD_W - 200, 22, BODY)
  ctx.fillText(d.by, cx, 556)
}

// Waits a moment for the game's fonts, so the card does not fall back to plain ones
async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  const load = Promise.all([`40px ${DISPLAY}`, `20px ${BODY}`, `700 20px ${BODY}`].map(f => document.fonts.load(f))).catch(() => {})
  await Promise.race([load, new Promise(r => setTimeout(r, 1500))])
}

// The card as a PNG blob. kind: 'hero', or 'find' with the item id
export async function drawCard(kind, id) {
  await fontsReady()
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (kind === 'find') drawFind(ctx, findCardData(id))
  else drawHero(ctx, heroCardData())
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'))
}
