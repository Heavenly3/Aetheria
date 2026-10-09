/*
  Rich tooltips. Every helpful tooltip in the game goes through here so they all look and read the same:
  - tip(title, body, lines)  a title, an optional explanation and optional detail lines
  - help(key, params)        an entry of the `help` section of the locale files (title + body)
  - itemTip(id)              the card shown over any item: kind, quality, stats, effects, needs and value
  The text is escaped here, so callers pass plain strings.
*/
import { t, te } from '../i18n/index.js'
import { G } from '../game/engine.js'
import { ITEMS, STAT_LABELS } from '../game/data/items.js'
import { SKILLS } from '../game/data/skills.js'
import { TOOL_TYPES } from '../game/data/character.js'
import { SET_OF } from '../game/data/sets.js'
import { RARITY_TINT } from '../game/data/omens.js'
import { itemCategory } from '../game/data/categories.js'
import { fmt } from '../game/format.js'
import { weaponProfile } from '../game/data/fighting.js'

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c])
const SHOW_DELAY = 180 // a short pause so tooltips do not flicker while the mouse crosses a grid

// lines: [{ text, kind?: 'ok' | 'bad' | 'gold' | 'muted', color? }]
export function tip(title, body, lines = [], sub) {
  let html = `<div class="tt-title">${esc(title)}</div>`
  if (sub) html += `<div class="tt-sub"${sub.color ? ` style="color:${sub.color}"` : ''}>${esc(sub.text)}</div>`
  if (body) html += `<div class="tt-body">${esc(body)}</div>`
  if (lines.length) html += `<ul class="tt-lines">${lines.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>`
  return { value: html, escape: false, class: 'rich-tip', showDelay: SHOW_DELAY }
}

// The extra line for things that may drop: "Always" or "Chance: 2.5%"
export function chanceNote(chance) {
  if (chance >= 1) return t('help.item.always')
  const v = chance * 100
  return t('help.item.chance', { v: v < 1 ? +v.toFixed(2) : +v.toFixed(1) })
}

export function help(key, params = {}, lines = []) {
  return tip(t(`help.${key}.title`, params), te(`help.${key}.body`) ? t(`help.${key}.body`, params) : '', lines)
}

const statText = (k, v) => (k === 'mDmg' ? `+${Math.round(v * 100)}% ${STAT_LABELS[k]}` : `${v >= 0 ? '+' : ''}${v} ${STAT_LABELS[k]}`)

export function itemTip(id, note) {
  const it = ITEMS[id]
  if (!it) return null
  const kind = [t('inventory.cats.' + itemCategory(id))]
  if (it.twoHanded) kind.push(t('inventory.twoHanded'))
  const sub = it.quality
    ? { text: `${t('omens.rarity.' + it.quality)} · ${kind.join(' · ')}`, color: RARITY_TINT[it.quality] }
    : { text: (it.rare ? t('inventory.rare') + ' · ' : '') + kind.join(' · '), color: it.rare ? 'var(--gold)' : null }
  const lines = []
  for (const [k, v] of Object.entries(it.stats || {})) lines.push({ text: statText(k, v), kind: 'ok' })
  // Weapons: their pace, crit chance and the status they can leave
  if (it.slot === 'weapon') {
    const w = weaponProfile(id)
    lines.push({ text: t('fighting.weaponLine', { speed: w.speed, crit: Math.round(w.crit * 100) + '%' }), kind: 'gold' })
    if (w.fx) lines.push({ text: t('fighting.weaponFx', { chance: Math.round(w.fx.chance * 100) + '%', status: t(`fighting.statuses.${w.fx.id}.name`).toLowerCase() }), kind: 'gold' })
  }
  if (it.type === 'tool') lines.push({ text: t('hero.toolTier', { tool: TOOL_TYPES[it.toolType].name, n: it.tier }), kind: 'ok' })
  if (it.heal) lines.push({ text: `${t('inventory.heals')} ${t('inventory.hp', { n: G.foodHeal(id) })}`, kind: 'ok' })
  for (const [sk, v] of Object.entries(it.buff || {})) lines.push({ text: `${SKILLS[sk].name} ${t('inventory.boost', { flat: v[0], pct: Math.round(v[1] * 100) })}`, kind: 'ok' })
  for (const [sk, l] of Object.entries(it.req || {})) {
    lines.push({ text: `${t('inventory.requires')} ${SKILLS[sk].name} ${l}`, kind: G.level(sk) >= l ? 'muted' : 'bad' })
  }
  if (note) lines.push({ text: note, kind: 'gold' })
  if (SET_OF[id]) lines.push({ text: t('help.item.set', { set: SET_OF[id].name }), kind: 'gold' })
  // Gear: what wearing it would change in a fight, worked out from the hero's own numbers
  if (it.type === 'equip' && it.slot && G.s.equipment[it.slot] !== id) {
    const now = G.combatProfile(), next = G.withGear(id, () => G.combatProfile())
    const rel = (a, b) => (a > 0 ? Math.round(((b - a) / a) * 100) : 0)
    const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) + '%'
    const power = rel(now.power, next.power), dps = rel(now.dps, next.dps), taken = rel(now.takenPerSec, next.takenPerSec)
    lines.push({ text: t('power.tipEffect', { power: sign(power), dps: sign(dps), taken: sign(taken) }), kind: power > 0 ? 'ok' : power < 0 ? 'bad' : 'muted' })
  }
  if (it.value) lines.push({ text: t('help.item.value', { gold: fmt(G.sellPrice(id)) }), kind: 'muted' })
  const owned = G.qty(id)
  if (owned) lines.push({ text: t('help.item.owned', { n: fmt(owned) }), kind: 'muted' })
  return tip(it.name, it.desc || '', lines, sub)
}
