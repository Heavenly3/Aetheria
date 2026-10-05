<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { G, state } from '../game/engine.js'
import { QUESTS } from '../game/data/progression.js'
import { SKILLS } from '../game/data/skills.js'
import GameIcon from './GameIcon.vue'

const emit = defineEmits(['menu'])
const route = useRoute()

// The skills tab goes to the skill being trained, or the last skill page visited
const act = computed(() => state.activity)
const skillTo = computed(() => (route.name === 'skill' ? route.path : act.value?.type === 'skill' ? '/skill/' + act.value.skill : '/skill/mining'))
const items = computed(() => [
  { to: '/', icon: state.avatar || 'wizard-face', key: 'nav.hero', badge: G.attrPoints() + G.talentPoints() || null },
  { to: skillTo.value, icon: SKILLS[skillTo.value.split('/')[2]]?.icon || 'mining', key: 'nav.skills', match: '/skill/', pulse: act.value?.type === 'skill' },
  { to: '/combat', icon: 'crossed-swords', key: 'nav.combat', pulse: act.value?.type === 'combat' },
  { to: '/inventory', icon: 'knapsack', key: 'nav.inventory' },
  { to: '/quests', icon: 'scroll-unfurled', key: 'nav.quests', badge: QUESTS.filter(q => G.questReady(q)).length + G.tasksReady() || null },
])
const isActive = n => (n.match ? route.path.startsWith(n.match) : n.to === '/' ? route.path === '/' : route.path.startsWith(n.to))
</script>

<template>
  <nav class="bottom-nav" :aria-label="$t('nav.main')">
    <router-link v-for="n in items" :key="n.key" :to="n.to" class="bn-item" :class="{ active: isActive(n) }" :data-tut="'nav:' + (n.match || n.to)">
      <span class="bn-icon">
        <GameIcon :name="n.icon" :size="22" />
        <span v-if="n.badge" class="bn-badge">{{ n.badge }}</span>
        <span v-else-if="n.pulse" class="bn-pulse" />
      </span>
      <span class="bn-label">{{ $t(n.key) }}</span>
    </router-link>
    <button class="bn-item" data-tut="nav:menu" @click="emit('menu')">
      <span class="bn-icon"><i class="pi pi-bars" style="font-size:20px" /></span>
      <span class="bn-label">{{ $t('nav.more') }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav { display: none; }
@media (max-width: 900px) {
  .bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid; grid-template-columns: repeat(6, 1fr);
    height: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--glass); border-top: 1px solid var(--line); backdrop-filter: blur(18px); }
}
.bn-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 0; padding: 6px 2px;
  color: var(--muted); text-decoration: none; background: none; border: 0; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.bn-item.active { color: var(--gold-hi); }
.bn-item.active .bn-icon { background: color-mix(in srgb, var(--gold) 16%, transparent); }
.bn-icon { position: relative; display: grid; place-items: center; width: 46px; height: 30px; border-radius: 15px; transition: background 0.2s; }
.bn-label { font-size: 11px; font-weight: 700; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bn-badge { position: absolute; top: -4px; inset-inline-end: 0; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; display: grid; place-items: center;
  font-size: 10.5px; font-weight: 800; background: var(--gold); color: var(--on-gold); }
.bn-pulse { position: absolute; top: 0; inset-inline-end: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 2px var(--bg); }
</style>
