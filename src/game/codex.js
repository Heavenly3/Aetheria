/* =========================================================
   CODEX — the compendium's item pages and masterworks.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { ITEMS } from './data/items.js'
import { PAGES, PAGE_IDS, PAGE_REWARDS, pageGold, CRAFTED, MASTER_MILESTONES, milestoneNeed } from './data/codex.js'

export const codexState = () => ({
  // items: plain item ids ever held · grades: best quality made of each crafted piece · claimed: pages and milestones paid out
  codex: { items: {}, grades: {}, claimed: {}, seeded: false },
})

export const codex = {
  ensureCodex() {
    const c = this.s.codex
    c.items ||= {}
    c.grades ||= {}
    c.claimed ||= {}
    // Saves from before the compendium start from what the hero already has and has seen drop
    if (!c.seeded) {
      c.seeded = true
      for (const id of Object.keys(this.s.inventory)) this.recordItem(id)
      for (const id of Object.values(this.s.equipment)) if (id) this.recordItem(id)
      for (const id of Object.values(this.s.tools || {})) if (id) this.recordItem(id)
      for (const drops of Object.values(this.s.bestiary?.drops || {})) for (const id of Object.keys(drops)) this.recordItem(id)
    }
    return c
  },
  // Called whenever an item reaches the bag
  recordItem(id) {
    const it = ITEMS[id]
    if (!it || it.relic) return
    const c = this.s.codex
    const base = it.base || id
    if (!c.items[base]) c.items[base] = Date.now()
    if (it.grade && (c.grades[base] || 0) < it.grade) c.grades[base] = it.grade
  },
  codexHas(id) { return !!this.s.codex.items[id] },
  pageProgress(p) { const list = PAGES[p]; return { done: list.filter(id => this.codexHas(id)).length, total: list.length } },
  pageComplete(p) { const r = this.pageProgress(p); return r.total > 0 && r.done >= r.total },
  pageClaimed(p) { return !!this.s.codex.claimed['page:' + p] },
  claimPage(p) {
    if (!PAGE_IDS.includes(p) || this.pageClaimed(p) || !this.pageComplete(p)) return false
    this.s.codex.claimed['page:' + p] = true
    this.addGold(pageGold(p))
    this.log('open-book', 'log.codexPage', { page: '@codexPage:' + p })
    return true
  },
  codexProgress() {
    let done = 0, total = 0
    for (const p of PAGE_IDS) { const r = this.pageProgress(p); done += r.done; total += r.total }
    return { done, total }
  },

  /* ---------- masterworks ---------- */
  gradeMade(id) { return this.s.codex.grades[id] || 0 },
  masterworks() { return Object.values(CRAFTED).flat().filter(id => this.gradeMade(id) >= 3).length },
  masterworkDone(i) { return this.masterworks() >= milestoneNeed(MASTER_MILESTONES[i]) },
  masterworkClaimed(i) { return !!this.s.codex.claimed['master:' + i] },
  claimMasterwork(i) {
    const m = MASTER_MILESTONES[i]
    if (!m || this.masterworkClaimed(i) || !this.masterworkDone(i)) return false
    this.s.codex.claimed['master:' + i] = true
    this.addGold(m.gold)
    this.log('anvil-impact', 'log.codexMaster', { n: milestoneNeed(m) })
    return true
  },

  masterworksClaimable() { return MASTER_MILESTONES.filter((_, i) => this.masterworkDone(i) && !this.masterworkClaimed(i)).length },
  codexClaimable() {
    return PAGE_IDS.filter(p => this.pageComplete(p) && !this.pageClaimed(p)).length
      + MASTER_MILESTONES.filter((_, i) => this.masterworkDone(i) && !this.masterworkClaimed(i)).length
  },
  codexMods(key) {
    const c = this.s.codex
    if (!c) return 0
    let v = 0
    for (const k in c.claimed) {
      const [kind, id] = k.split(':')
      if (kind === 'page') v += PAGE_REWARDS[id]?.[key] || 0
      else if (kind === 'master') v += MASTER_MILESTONES[id]?.mods[key] || 0
    }
    return v
  },
}
