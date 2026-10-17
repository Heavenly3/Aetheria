/* =========================================================
   UNLOCKS — a new hero meets the screens of the menu one by one instead of all at once.
   A screen opens when its check passes, or when the tutorial reaches the step that shows it (`tut`).
   Screens not listed here are always there. Saves from before this existed have everything open.
   ========================================================= */

// key: the screen's nav key (and its hint text, `unlocks.hints.<key>`)
export const UNLOCKS = [
  { to: '/tavern', key: 'tavern', icon: 'beer-horn', tut: 'openTavern', check: g => g.totalLevel() >= 45 },
  { to: '/guilds', key: 'guilds', icon: 'swords-emblem', tut: 'openGuilds', check: g => g.totalLevel() >= 60 },
  { to: '/bestiary', key: 'bestiary', icon: 'open-book', tut: 'openCompendium', check: g => (g.s.stats.kills || 0) >= 25 },
  { to: '/pets', key: 'pets', icon: 'paw-print', check: g => Object.keys(g.s.pets || {}).length > 0 || (g.s.companions?.eggs?.length || 0) > 0 || g.totalLevel() >= 55 },
  { to: '/slayer', key: 'slayer', icon: 'death-skull', check: g => g.combatLevel() >= 10 },
  { to: '/home', key: 'home', icon: 'family-house', check: g => g.totalLevel() >= 50 || Object.values(g.s.rooms || {}).some(Boolean) },
  { to: '/routines', key: 'routines', icon: 'gears', check: g => g.totalLevel() >= 65 },
  { to: '/church', key: 'church', icon: 'church', check: g => g.totalLevel() >= 75 || g.level('prayer') >= 10 },
  { to: '/tower', key: 'tower', icon: 'stone-tower', check: g => g.combatLevel() >= 20 },
  { to: '/omens', key: 'omens', icon: 'crystal-ball', check: g => g.omensSeen() > 0 || !!g.omenSign?.() || g.totalLevel() >= 90 },
  { to: '/weekly', key: 'weekly', icon: 'crowned-skull', check: g => g.weeklyUnlocked() },
  { to: '/forge', key: 'forge', icon: 'anvil-impact', check: g => g.combatLevel() >= 30 || Object.keys(g.s.omens?.relics || {}).length > 0 },
  { to: '/ascension', key: 'ascension', icon: 'ankh', check: g => g.totalLevel() >= 300 || (g.s.ascension?.count || 0) > 0 },
]
export const UNLOCK_MAP = Object.fromEntries(UNLOCKS.map(u => [u.to, u]))
