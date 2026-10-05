<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { G, state } from '../game/engine.js'
import { SKILLS, SKILL_CATS } from '../game/data/skills.js'
import { QUESTS } from '../game/data/progression.js'
import GameIcon from './GameIcon.vue'

const emit = defineEmits(['navigate'])
const route = useRoute()

const questsReady = computed(() => QUESTS.filter(q => G.questReady(q)).length)
const act = computed(() => state.activity)
const inCombat = kind => act.value?.type === 'combat' && (!kind || act.value.kind === kind)

const realm = computed(() => [
  { to: '/', icon: state.avatar || 'wizard-face', key: 'nav.hero', badge: G.attrPoints() + G.talentPoints() || null },
  { to: '/inventory', icon: 'knapsack', key: 'nav.inventory' },
  { to: '/combat', icon: 'crossed-swords', key: 'nav.combat', pulse: inCombat('area') || inCombat('boss') || inCombat('dungeon') },
  { to: '/slayer', icon: 'death-skull', key: 'nav.slayer', badge: state.slayer.task ? state.slayer.task.left : null },
  { to: '/tower', icon: 'stone-tower', key: 'nav.tower', pulse: inCombat('tower') },
  { to: '/quests', icon: 'scroll-unfurled', key: 'nav.quests', badge: questsReady.value + G.tasksReady() || null },
  { to: '/achievements', icon: 'trophy-cup', key: 'nav.achievements' },
  { to: '/bestiary', icon: 'open-book', key: 'nav.bestiary', badge: G.claimableGroups() || null },
  { to: '/pets', icon: 'paw-print', key: 'nav.pets' },
  { to: '/ascension', icon: 'ankh', key: 'nav.ascension', badge: G.canAscend() && !state.ascension.count ? '!' : null },
  { to: '/stats', icon: 'histogram', key: 'nav.stats' },
])
const town = computed(() => [
  { to: '/tavern', icon: 'beer-horn', key: 'nav.tavern', badge: state.tavern.orders.filter(o => !o.done && G.qty(o.item) >= o.qty).length || null,
    pulse: state.tavern.workers.some(w => w.status === 'working' || w.exp) },
  { to: '/home', icon: 'family-house', key: 'nav.home' },
  { to: '/forge', icon: 'anvil-impact', key: 'nav.forge' },
  { to: '/church', icon: 'church', key: 'nav.church' },
  { to: '/shop', icon: 'shop', key: 'nav.shop' },
  { to: '/settings', icon: 'cog', key: 'nav.settings' },
])
const cats = computed(() => Object.keys(SKILL_CATS).map(cat => ({
  cat, label: SKILL_CATS[cat], skills: Object.entries(SKILLS).filter(([, s]) => s.cat === cat).map(([id, s]) => ({ id, s })),
})))
const isActive = to => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <nav class="nav">
    <div class="nav-label">{{ $t('nav.realm') }}</div>
    <router-link v-for="n in realm" :key="n.to" :to="n.to" class="nav-item" :class="{ active: isActive(n.to) }" :data-tut="'nav:' + n.to" @click="emit('navigate')">
      <span class="nav-icon"><GameIcon :name="n.icon" :size="17" /></span>
      <span class="nav-name grow">{{ $t(n.key) }}</span>
      <span v-if="n.badge" class="nav-badge">{{ n.badge }}</span>
      <span v-if="n.pulse" class="pulse" />
    </router-link>

    <div class="nav-label">{{ $t('nav.town') }}</div>
    <router-link v-for="n in town" :key="n.to" :to="n.to" class="nav-item" :class="{ active: isActive(n.to) }" :data-tut="'nav:' + n.to" @click="emit('navigate')">
      <span class="nav-icon"><GameIcon :name="n.icon" :size="17" /></span>
      <span class="nav-name grow">{{ $t(n.key) }}</span>
      <span v-if="n.badge" class="nav-badge">{{ n.badge }}</span>
      <span v-if="n.pulse" class="pulse" />
    </router-link>

    <template v-for="c in cats" :key="c.cat">
      <div class="nav-label">{{ c.label }}</div>
      <router-link v-for="{ id, s } in c.skills" :key="id" :to="'/skill/' + id" class="nav-item" :class="{ active: route.path === '/skill/' + id }"
        :style="{ '--c': s.color }" :data-tut="'nav:/skill/' + id" @click="emit('navigate')">
        <span class="nav-icon skill"><GameIcon :name="s.icon" :size="17" /></span>
        <span class="grow">
          <span class="nav-name row"><span class="grow">{{ s.name }}</span><span class="nav-lvl">{{ G.level(id) }}</span></span>
          <span class="bar thin" style="margin-top:5px"><i :style="{ width: G.levelProgress(id) * 100 + '%' }" /></span>
        </span>
        <span v-if="act?.type === 'skill' && act.skill === id" class="pulse" />
      </router-link>
    </template>
  </nav>
</template>

<style scoped>
.nav-label { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--faint); padding: 16px 10px 6px; }
.nav-item { position: relative; display: flex; align-items: center; gap: 11px; padding: 7px 10px; border-radius: 11px; color: var(--ink-2); text-decoration: none; -webkit-tap-highlight-color: transparent;
  transition: background 0.18s, color 0.18s; }
.nav-item:hover { background: var(--tint-2); color: var(--ink); }
.nav-item.active { background: linear-gradient(90deg, rgba(226, 182, 90, 0.15), rgba(226, 182, 90, 0.02)); color: var(--ink); box-shadow: inset 0 0 0 1px rgba(226, 182, 90, 0.18); }
.nav-item.active::before { content: ''; position: absolute; inset-inline-start: -12px; top: 8px; bottom: 8px; width: 3px; border-start-end-radius: 3px; border-end-end-radius: 3px; background: var(--gold-grad); }
.nav-icon { width: 30px; height: 30px; flex-shrink: 0; display: grid; place-items: center; border-radius: 9px; background: var(--tint-2); border: 1px solid var(--line); color: var(--gold); }
.nav-icon.skill { color: var(--c); }
.nav-name { font-weight: 500; font-size: 14.5px; }
.nav-lvl { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.nav-badge { font-size: 11.5px; font-weight: 800; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; display: grid; place-items: center; background: var(--gold); color: var(--on-gold); }
.pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); flex-shrink: 0; animation: pulse 1.6s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(226, 182, 90, 0.7); } 70% { box-shadow: 0 0 0 8px rgba(226, 182, 90, 0); } 100% { box-shadow: 0 0 0 0 rgba(226, 182, 90, 0); } }
@media (pointer: coarse) { .nav-item { padding: 10px; } .nav-icon { width: 34px; height: 34px; } }
</style>
