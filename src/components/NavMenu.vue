<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { G, state } from '../game/engine.js'
import { SKILLS, SKILL_CATS } from '../game/data/skills.js'
import { QUESTS } from '../game/data/progression.js'
import GameIcon from './GameIcon.vue'
import { FEATURES } from '../game/features.js'

const emit = defineEmits(['navigate'])
const route = useRoute()

const act = computed(() => state.activity)
const inCombat = kind => act.value?.type === 'combat' && (!kind || act.value.kind === kind)
const fest = computed(() => G.activeFestival())

// Sections of the menu; skills get one section per category
const sections = computed(() => [
  { id: 'hero', key: 'nav.groups.hero', items: [
    { to: '/', icon: state.avatar || 'wizard-face', key: 'nav.hero', badge: G.attrPoints() + G.talentPoints() || null },
    { to: '/inventory', icon: 'knapsack', key: 'nav.inventory' },
    { to: '/pets', icon: 'paw-print', key: 'nav.pets' },
  ] },
  { id: 'adventure', key: 'nav.groups.adventure', items: [
    { to: '/combat', icon: 'crossed-swords', key: 'nav.combat', pulse: inCombat('area') || inCombat('boss') || inCombat('dungeon') },
    { to: '/slayer', icon: 'death-skull', key: 'nav.slayer', badge: state.slayer.task ? state.slayer.task.left : null },
    { to: '/tower', icon: 'stone-tower', key: 'nav.tower', pulse: inCombat('tower') },
    { to: '/weekly', icon: 'crowned-skull', key: 'nav.weekly', badge: G.claimableMilestones() || null, pulse: inCombat('weekly') },
    { to: '/bestiary', icon: 'open-book', key: 'nav.bestiary', badge: G.claimableGroups() + G.codexClaimable() || null },
    { to: '/omens', icon: 'crystal-ball', key: 'nav.omens', badge: G.omenSign() ? '?' : null, pulse: !!G.activeOmen() },
  ] },
  { id: 'progress', key: 'nav.groups.progress', items: [
    { to: '/journal', icon: 'quill-ink', key: 'nav.journal', badge: G.journalUnread() || null },
    { to: '/quests', icon: 'scroll-unfurled', key: 'nav.quests', badge: QUESTS.filter(q => G.questReady(q)).length + G.tasksReady() || null },
    { to: '/achievements', icon: 'trophy-cup', key: 'nav.achievements' },
    { to: '/ascension', icon: 'ankh', key: 'nav.ascension', badge: G.canAscend() && !state.ascension.count ? '!' : null },
    { to: '/stats', icon: 'histogram', key: 'nav.stats' },
  ] },
  { id: 'town', key: 'nav.groups.town', items: [
    FEATURES.festivals && { to: '/festival', icon: fest.value?.icon || 'laurel-crown', key: 'nav.festival', festive: !!fest.value, badge: fest.value && G.festivalShop().some(e => e.kind !== 'item' && G.canBuyFestival(e)) ? '!' : null },
    { to: '/tavern', icon: 'beer-horn', key: 'nav.tavern', badge: state.tavern.orders.filter(o => !o.done && G.qty(o.item) >= o.qty).length + G.patronsReady() || null,
      pulse: state.tavern.workers.some(w => w.status === 'working' || w.exp) },
    { to: '/guilds', icon: 'swords-emblem', key: 'nav.guilds', badge: G.guildsReady() || null },
    { to: '/home', icon: 'family-house', key: 'nav.home' },
    { to: '/forge', icon: 'anvil-impact', key: 'nav.forge' },
    { to: '/church', icon: 'church', key: 'nav.church' },
    { to: '/shop', icon: 'shop', key: 'nav.shop' },
  ] },
  ...Object.keys(SKILL_CATS).map(cat => ({
    id: 'skills-' + cat, label: SKILL_CATS[cat], skills: true,
    items: Object.entries(SKILLS).filter(([, s]) => s.cat === cat).map(([id, s]) => ({
      to: '/skill/' + id, id, icon: s.icon, color: s.color, name: s.name, pulse: act.value?.type === 'skill' && act.value.skill === id,
    })),
  })),
].map(s => ({ ...s, items: s.items.filter(Boolean) }))) // switched-off features leave a gap in their section

const isActive = to => (to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(to + '/'))

// Folded sections are remembered per device; the section of the current screen always opens
const STORE = 'aetheria-nav'
const folded = reactive((() => { try { return JSON.parse(localStorage.getItem(STORE)) || {} } catch { return {} } })())
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(folded)) } catch { /* storage unavailable */ } }
function toggle(id) { folded[id] = !folded[id]; save() }
watch(() => route.path, () => { for (const s of sections.value) if (folded[s.id] && s.items.some(i => isActive(i.to))) { folded[s.id] = false; save() } }, { immediate: true })

// What a folded section still shows: a sum of its counters, or a dot when something is running
function summary(s) {
  const nums = s.items.map(i => i.badge).filter(b => typeof b === 'number')
  const total = nums.reduce((a, b) => a + b, 0)
  return { badge: total || (s.items.some(i => i.badge === '!') ? '!' : null), pulse: s.items.some(i => i.pulse) }
}
</script>

<template>
  <nav class="nav">
    <section v-for="s in sections" :key="s.id" class="nav-sec" :class="{ folded: folded[s.id] }">
      <button class="nav-label" :aria-expanded="!folded[s.id]" @click="toggle(s.id)">
        <span class="grow">{{ s.label || $t(s.key) }}</span>
        <template v-if="folded[s.id]">
          <span v-if="summary(s).badge" class="nav-badge sm">{{ summary(s).badge }}</span>
          <span v-else-if="summary(s).pulse" class="pulse" />
        </template>
        <i class="pi pi-angle-down chev" />
      </button>
      <div v-show="!folded[s.id]" class="nav-items">
        <template v-if="s.skills">
          <router-link v-for="i in s.items" :key="i.id" :to="i.to" class="nav-item" :class="{ active: route.path === i.to }"
            :style="{ '--c': i.color }" :data-tut="'nav:' + i.to" @click="emit('navigate')">
            <span class="nav-icon skill"><GameIcon :name="i.icon" :size="16" /></span>
            <span class="grow">
              <span class="nav-name row"><span class="grow">{{ i.name }}</span><span class="nav-lvl">{{ G.level(i.id) }}</span></span>
              <span class="bar thin" style="margin-top:4px"><i :style="{ width: G.levelProgress(i.id) * 100 + '%' }" /></span>
            </span>
            <span v-if="i.pulse" class="pulse" />
          </router-link>
        </template>
        <template v-else>
          <router-link v-for="i in s.items" :key="i.to" :to="i.to" class="nav-item" :class="{ active: isActive(i.to), festive: i.festive }"
            :data-tut="'nav:' + i.to" @click="emit('navigate')">
            <span class="nav-icon"><GameIcon :name="i.icon" :size="16" /></span>
            <span class="nav-name grow">{{ $t(i.key) }}</span>
            <span v-if="i.badge" class="nav-badge">{{ i.badge }}</span>
            <span v-if="i.pulse" class="pulse" />
          </router-link>
        </template>
      </div>
    </section>
  </nav>
</template>

<style scoped>
.nav-sec + .nav-sec { margin-top: 4px; }
.nav-label { display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px 10px 6px; border: 0; background: none; cursor: pointer; font: inherit;
  font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--faint); text-align: start; }
.nav-label:hover { color: var(--muted); }
.chev { font-size: 11px; transition: transform 0.2s; }
.folded .chev { transform: rotate(-90deg); }
.nav-items { display: flex; flex-direction: column; gap: 1px; }
.nav-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; color: var(--ink-2); text-decoration: none; -webkit-tap-highlight-color: transparent;
  transition: background 0.18s, color 0.18s; }
.nav-item:hover { background: var(--tint-2); color: var(--ink); }
.nav-item.active { background: linear-gradient(90deg, rgba(226, 182, 90, 0.15), rgba(226, 182, 90, 0.02)); color: var(--ink); box-shadow: inset 0 0 0 1px rgba(226, 182, 90, 0.18); }
.nav-item.active::before { content: ''; position: absolute; inset-inline-start: -12px; top: 7px; bottom: 7px; width: 3px; border-start-end-radius: 3px; border-end-end-radius: 3px; background: var(--gold-grad); }
.nav-item.festive .nav-icon { color: var(--on-gold); background: var(--gold-grad); border-color: transparent; }
.nav-icon { width: 28px; height: 28px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; background: var(--tint-2); border: 1px solid var(--line); color: var(--gold); }
.nav-icon.skill { color: var(--c); }
.nav-name { font-weight: 500; font-size: 14px; }
.nav-lvl { font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.nav-badge { font-size: 11px; font-weight: 800; min-width: 19px; height: 19px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; background: var(--gold); color: var(--on-gold); }
.nav-badge.sm { min-width: 17px; height: 17px; font-size: 10.5px; letter-spacing: 0; }
.pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); flex-shrink: 0; animation: pulse 1.6s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(226, 182, 90, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(226, 182, 90, 0); } 100% { box-shadow: 0 0 0 0 rgba(226, 182, 90, 0); } }
@media (pointer: coarse) { .nav-item { padding: 9px 10px; } .nav-icon { width: 34px; height: 34px; } .nav-label { padding-block: 14px 8px; } }
</style>
