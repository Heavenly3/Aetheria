/* =========================================================
   ECHOES — after the story ends, every world boss comes back as an echo: stronger, quicker with its
   big moves and richer. The first defeat of each echo is remembered in every life and adds a lasting
   bonus; defeating them all earns a title.
   ========================================================= */
import { BOSSES } from './combat.js'
import { named } from '../../i18n/bind.js'
import { t } from '../../i18n/index.js'

// How much stronger an echo is than its boss, and how much sooner its big moves come round
export const ECHO = { hp: 1.8, att: 1.15, def: 1.15, maxHit: 1.15, gold: 3, respawn: 1.5, recLvl: 15, mechEvery: 0.75 }
// Lasting bonus for each different echo ever defeated
export const ECHO_BONUS = { xp: 0.01, gold: 0.01 }

export const ECHOES = BOSSES.map((b, i) => named({
  ...b,
  id: 'echo_' + b.id, echoOf: b.id, echo: true, boss: true,
  hp: Math.round(b.hp * ECHO.hp), att: Math.round(b.att * ECHO.att), def: Math.round(b.def * ECHO.def), maxHit: Math.round(b.maxHit * ECHO.maxHit),
  gold: b.gold.map(g => Math.round(g * ECHO.gold)),
  respawn: Math.round(b.respawn * ECHO.respawn), recLvl: b.recLvl + ECHO.recLvl,
  // Starlight for every echo, its boss's own prize twice as likely, and a better chance of a gem chest
  drops: [
    { item: 'starlight_shard', chance: 1, qty: [1, 1 + Math.floor(i / 2)] },
    { ...b.drops[0], chance: Math.min(1, b.drops[0].chance * 2) },
    { item: 'gem_chest', chance: 0.25, qty: [1, 1] },
  ],
}, () => t('echoes.name', { boss: b.name })))
export const ECHO_MAP = Object.fromEntries(ECHOES.map(e => [e.id, e]))
