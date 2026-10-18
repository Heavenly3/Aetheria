<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import { G } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { MONSTERS, BOSSES } from '../game/data/combat.js'
import { QUESTS } from '../game/data/progression.js'
import ItemTile from './ItemTile.vue'

// One box to find any screen, skill, item, creature or quest and go straight to it
const open = defineModel({ type: Boolean, default: false })
const { t, locale } = useI18n()
const router = useRouter()
const query = ref('')
const active = ref(0)
const input = ref(null)
const LIMIT = 40

const SCREENS = [
  ['/', 'wizard-face', 'nav.hero'], ['/inventory', 'knapsack', 'nav.inventory'], ['/pets', 'paw-print', 'nav.pets'], ['/routines', 'gears', 'nav.routines'],
  ['/combat', 'crossed-swords', 'nav.combat'], ['/slayer', 'death-skull', 'nav.slayer'], ['/tower', 'stone-tower', 'nav.tower'], ['/weekly', 'crowned-skull', 'nav.weekly'],
  ['/bestiary', 'open-book', 'nav.bestiary'], ['/omens', 'crystal-ball', 'nav.omens'], ['/journal', 'quill-ink', 'nav.journal'], ['/crown', 'crown', 'nav.crown'],
  ['/quests', 'scroll-unfurled', 'nav.quests'], ['/achievements', 'trophy-cup', 'nav.achievements'], ['/ascension', 'ankh', 'nav.ascension'], ['/stats', 'histogram', 'nav.stats'],
  ['/festival', 'laurel-crown', 'nav.festival'], ['/tavern', 'beer-horn', 'nav.tavern'], ['/guilds', 'swords-emblem', 'nav.guilds'], ['/home', 'family-house', 'nav.home'],
  ['/forge', 'anvil-impact', 'nav.forge'], ['/church', 'church', 'nav.church'], ['/shop', 'shop', 'nav.shop'], ['/settings', 'cog', 'nav.settings'],
]

// Accents and case do not matter: "herreria" finds "Herrería"
const norm = s => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

// Everything that can be found, in the current language; built when the box opens
const entries = computed(() => {
  if (!open.value) return []
  void locale.value
  const list = []
  for (const [to, icon, key] of SCREENS) if (G.screenOpen(to) && (to !== '/crown' || G.shardsFound() > 0)) list.push({ kind: 'screen', icon, name: t(key), to })
  for (const [id, s] of Object.entries(SKILLS)) list.push({ kind: 'skill', icon: s.icon, tint: s.color, name: s.name, to: '/skill/' + id, note: t('common.lvlShort', { n: G.level(id) }) })
  for (const [id, it] of Object.entries(ITEMS)) if (!it.festival && !it.quality && !it.grade) list.push({ kind: 'item', item: id, name: it.name, to: { path: '/inventory', query: { item: id } }, note: G.qty(id) ? `×${G.qty(id)}` : null })
  // Creatures and quests only once their screens are open in the menu
  if (G.screenOpen('/combat')) for (const m of [...Object.values(MONSTERS), ...BOSSES]) list.push({ kind: 'monster', icon: m.icon, name: m.name, to: '/combat', note: m.boss ? t('inventory.from.boss') : null })
  if (G.screenOpen('/quests')) for (const q of QUESTS) list.push({ kind: 'quest', icon: 'scroll-unfurled', name: q.name, to: '/quests', note: G.questDone(q.id) ? '✓' : null })
  return list.map(e => ({ ...e, key: norm(e.name) }))
})

const results = computed(() => {
  const q = norm(query.value.trim())
  if (!q) return []
  const scored = []
  for (const e of entries.value) {
    const i = e.key.indexOf(q)
    if (i < 0) continue
    // Whole name first, then names that start with it, then a word that starts with it, then anywhere
    const score = e.key === q ? 0 : i === 0 ? 1 : e.key[i - 1] === ' ' ? 2 : 3
    scored.push([score, e])
  }
  const order = ['screen', 'skill', 'item', 'monster', 'quest']
  // Among equal matches the shorter name is the closer one ("Red dragon" before "Green dragonhide body")
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length || order.indexOf(a[1].kind) - order.indexOf(b[1].kind))
    .slice(0, LIMIT).map(s => s[1])
})
watch(results, () => { active.value = 0 })
watch(open, v => { if (v) { query.value = ''; nextTick(() => input.value?.focus()) } })

function go(e) {
  if (!e) return
  open.value = false
  router.push(e.to)
}
function onKey(ev) {
  const n = results.value.length
  if (ev.key === 'ArrowDown') { ev.preventDefault(); active.value = n ? (active.value + 1) % n : 0; scrollActive() }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); active.value = n ? (active.value - 1 + n) % n : 0; scrollActive() }
  else if (ev.key === 'Enter') { ev.preventDefault(); go(results.value[active.value]) }
}
const scrollActive = () => nextTick(() => document.querySelector('.gs-row.on')?.scrollIntoView({ block: 'nearest' }))
</script>

<template>
  <Dialog v-model:visible="open" modal dismissableMask :showHeader="false" position="top" class="gs-dialog" :style="{ width: 'min(560px, calc(100vw - 24px))' }">
    <div class="gs-box">
      <i class="pi pi-search gs-icon" />
      <input ref="input" v-model="query" class="gs-input" type="search" :placeholder="$t('search.placeholder')" :aria-label="$t('search.label')"
        role="combobox" aria-controls="gs-list" :aria-expanded="results.length > 0" :aria-activedescendant="results.length ? 'gs-' + active : undefined" @keydown="onKey" />
      <kbd class="gs-kbd">Esc</kbd>
    </div>
    <ul v-if="results.length" id="gs-list" class="gs-list" role="listbox">
      <li v-for="(e, i) in results" :id="'gs-' + i" :key="e.kind + e.name + i" class="gs-row" :class="{ on: i === active }" role="option" :aria-selected="i === active"
        @click="go(e)" @mousemove="active = i">
        <ItemTile :item="e.item || null" :icon="e.item ? null : e.icon" :tint="e.tint || null" size="xs" :tip="false" />
        <span class="grow gs-name">{{ e.name }}</span>
        <span v-if="e.note" class="small muted tnum">{{ e.note }}</span>
        <span class="gs-kind">{{ $t(`search.kinds.${e.kind}`) }}</span>
      </li>
    </ul>
    <p v-else-if="query.trim()" class="gs-empty muted">{{ $t('search.none', { q: query.trim() }) }}</p>
    <p v-else class="gs-empty faint small">{{ $t('search.hint') }}</p>
  </Dialog>
</template>

<style scoped>
.gs-box { display: flex; align-items: center; gap: 10px; padding: 4px 4px 10px; border-bottom: 1px solid var(--line); }
.gs-icon { color: var(--muted); }
.gs-input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--ink); font: inherit; font-size: 16px; padding: 6px 0; }
.gs-input::-webkit-search-cancel-button { display: none; }
.gs-kbd { font: 11px ui-monospace, monospace; padding: 2px 6px; border-radius: 5px; border: 1px solid var(--line); color: var(--faint); }
.gs-list { list-style: none; margin: 8px 0 0; padding: 0; max-height: min(60vh, 460px); overflow-y: auto; }
.gs-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 9px; cursor: pointer; color: var(--ink-2); }
.gs-row.on { background: var(--tint-2); color: var(--ink); }
.gs-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs-kind { flex-shrink: 0; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
.gs-empty { margin: 14px 4px 4px; }
@media (max-width: 600px) { .gs-kbd { display: none; } }
</style>
