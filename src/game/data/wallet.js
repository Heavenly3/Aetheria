/* =========================================================
   WALLET — every currency the hero carries, where it comes from and where it is spent
   ========================================================= */

// show: when the line appears at all (a currency that is never zero-and-hidden shows always)
export const WALLET = [
  { id: 'gold', icon: 'two-coins', to: '/shop', amount: G => G.s.gold },
  { id: 'tavern', icon: 'beer-horn', to: '/tavern', amount: G => G.s.tavern?.tokens || 0 },
  { id: 'marks', icon: 'swords-emblem', to: '/guilds', amount: G => G.s.guilds?.marks || 0 },
  { id: 'slayer', icon: 'death-skull', to: '/slayer', amount: G => G.s.slayer?.points || 0 },
  { id: 'tower', icon: 'stone-tower', to: '/tower', amount: G => G.s.tower?.tokens || 0 },
  { id: 'festival', icon: 'laurel-crown', to: '/festival', amount: G => G.festivalState().tokens, show: G => !!G.activeFestival() },
  { id: 'shards', icon: 'crystal-growth', to: '/ascension', amount: G => G.s.ascension?.shards || 0, show: G => !!G.s.ascension?.count },
]

// The lines to show right now, with their amounts
export const walletLines = G => WALLET
  .filter(w => (w.show ? w.show(G) : true) || w.amount(G) > 0)
  .map(w => ({ ...w, value: w.amount(G), icon: w.id === 'festival' ? G.activeFestival()?.icon || w.icon : w.icon }))
