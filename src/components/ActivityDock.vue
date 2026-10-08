<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import { findAction } from '../game/data/actions.js'
import { G, state } from '../game/engine.js'
import { SKILLS } from '../game/data/skills.js'
import { ITEMS } from '../game/data/items.js'
import { tm } from '../i18n/index.js'
import ItemTile from './ItemTile.vue'

const { t } = useI18n()
const router = useRouter()
const lastGain = ref(null)
const qpop = ref()
const queued = computed(() => state.queue.map(q => ({ ...q, a: findAction(q.skill, q.action) })).filter(q => q.a))
const act = computed(() => state.activity)

// The dock can be folded into a small bubble; the choice is remembered on this device
const MINI_KEY = 'aetheria-dock-mini'
const mini = ref((() => { try { return localStorage.getItem(MINI_KEY) === '1' } catch { return false } })())
watch(mini, v => { try { localStorage.setItem(MINI_KEY, v ? '1' : '0') } catch { /* storage unavailable */ } })

const KIND = { tower: 'dock.tower', boss: 'dock.boss', dungeon: 'dock.dungeon', area: 'dock.combat', omen: 'dock.omen', weekly: 'dock.weekly' }
const info = computed(() => {
  const a = act.value
  if (!a) return null
  if (a.type === 'skill') {
    const action = G.getAction(a.skill, a.action)
    if (!action) return null
    return {
      icon: action.icon, tint: action.tint, color: SKILLS[a.skill].color,
      title: `${SKILLS[a.skill].name} · ${action.name}`,
      chainFor: a.parent ? G.getAction(a.parent.skill, a.parent.action)?.name : null,
      progress: Math.max(0, a.progress) / G.actionTime(a.skill, action),
      to: '/skill/' + a.skill,
    }
  }
  const m = G.getMonster(a)
  if (!m) return null
  return {
    icon: m.icon, tint: '#9b2a32', color: '#e0554b',
    title: `${t(KIND[a.kind] || 'dock.combat')} · ${m.name}`,
    progress: a.respawn > 0 ? 0 : a.mHp / m.hp,
    to: a.kind === 'tower' ? '/tower' : a.kind === 'omen' ? '/omens' : a.kind === 'weekly' ? '/weekly' : '/combat',
  }
})

// The last gain is stored as a message so it re-renders in the active language
const gainText = computed(() => {
  const g = lastGain.value
  if (!g) return ''
  if (g.kill) return `+${g.gold} ${t('common.gold')}` + (g.loot.length ? ' · ' + g.loot.slice(0, 3).map(l => `${l.n}× ${ITEMS[l.item].name}`).join(', ') : '')
  let text = (g.double ? t('gain.double') + ' ' : '') + tm(g)
  if (g.bonus) text += ' · ' + tm({ key: 'common.raw', params: { v: g.bonus } })
  return text
})

watch(() => act.value && JSON.stringify([act.value.type, act.value.skill, act.value.action, act.value.target, act.value.kind]), () => (lastGain.value = null))

let offs = []
onMounted(() => {
  offs = [
    G.on('gain', d => (lastGain.value = d)),
    G.on('kill', d => (lastGain.value = { kill: true, gold: d.gold, loot: d.loot })),
  ]
})
onUnmounted(() => offs.forEach(f => f()))
</script>

<template>
  <div class="dock" :class="{ show: !!info || state.queue.length > 0, mini }">
    <!-- Folded: a bubble with the action, its progress as a ring and the queue size -->
    <button v-if="mini" class="dock-bubble" :style="{ '--c': info?.color || 'var(--gold)', '--p': (info ? Math.min(1, info.progress) * 360 : 0) + 'deg' }"
      :aria-label="$t('dock.show')" v-tooltip.left="info ? info.title : $t('dock.queueWaiting', { n: state.queue.length })" @click="mini = false">
      <ItemTile v-if="info" :icon="info.icon" :tint="info.tint" size="sm" :tip="false" />
      <i v-else class="pi pi-list" />
      <b v-if="state.queue.length" class="bubble-badge">{{ state.queue.length }}</b>
    </button>
    <div v-else-if="!info && state.queue.length" class="dock-inner">
      <span class="grow small muted">{{ $t('dock.queueWaiting', { n: state.queue.length }) }}</span>
      <Button :label="$t('dock.startQueue')" icon="pi pi-play" size="small" @click="G.startNext()" />
      <Button icon="pi pi-list" text rounded :aria-label="$t('dock.viewQueue')" @click="qpop.toggle($event)" />
      <Button icon="pi pi-chevron-down" text rounded severity="secondary" :aria-label="$t('dock.hide')" v-tooltip.top="$t('dock.hide')" @click="mini = true" />
    </div>
    <div v-else-if="info" class="dock-inner">
      <button class="dock-icon" @click="router.push(info.to)" :aria-label="$t('dock.goTo')">
        <ItemTile :icon="info.icon" :tint="info.tint" size="md" :tip="false" />
      </button>
      <div class="grow">
        <div class="row" style="margin-bottom:7px">
          <b class="grow ellipsis">{{ info.title }}<span v-if="act.limit" class="muted tnum"> · {{ act.done || 0 }}/{{ act.limit }}</span><span v-if="info.chainFor" class="chain small"> · {{ $t('dock.chainFor', { action: info.chainFor }) }}</span></b>
          <span class="muted small tnum ellipsis gain">{{ gainText || (act.type === 'combat' ? `${state.hp}/${G.maxHp()} ${$t('common.hp')}` : '') }}</span>
        </div>
        <div class="bar" :style="{ '--c': info.color }"><i :style="{ width: Math.min(100, info.progress * 100) + '%' }" /></div>
      </div>
      <Button icon="pi pi-list" text rounded :badge="state.queue.length ? String(state.queue.length) : undefined" :aria-label="$t('dock.viewQueue')" v-tooltip.top="$t('dock.queue')" @click="qpop.toggle($event)" />
      <Button icon="pi pi-stop" severity="danger" text rounded :aria-label="$t('common.stop')" v-tooltip.top="$t('common.stop')" @click="G.stop()" />
      <Button icon="pi pi-chevron-down" text rounded severity="secondary" :aria-label="$t('dock.hide')" v-tooltip.top="$t('dock.hide')" @click="mini = true" />
    </div>
    <Popover ref="qpop">
      <div class="qpanel">
        <div class="row"><b class="grow">{{ $t('dock.queue') }}</b><Button v-if="queued.length" :label="$t('dock.clear')" size="small" text severity="danger" @click="G.clearQueue()" /></div>
        <div v-if="!queued.length" class="small muted">{{ $t('dock.queueEmpty') }}</div>
        <div v-for="(q, i) in queued" :key="i" class="qrow">
          <span class="tnum faint">{{ i + 1 }}</span>
          <ItemTile :icon="q.a.icon" :tint="q.a.tint" size="xs" :tip="false" />
          <span class="grow small">{{ q.count }}× {{ q.a.name }}</span>
          <Button icon="pi pi-arrow-up" size="small" text rounded :disabled="i === 0" :aria-label="$t('common.moveUp')" @click="G.moveQueued(i, -1)" />
          <Button icon="pi pi-arrow-down" size="small" text rounded :disabled="i === queued.length - 1" :aria-label="$t('common.moveDown')" @click="G.moveQueued(i, 1)" />
          <Button icon="pi pi-times" size="small" text rounded severity="danger" :aria-label="$t('common.remove')" @click="G.removeQueued(i)" />
        </div>
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.dock-icon { padding: 0; background: none; border: 0; cursor: pointer; }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gain { max-width: 55%; }
.qpanel { width: 340px; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.qrow { display: flex; align-items: center; gap: 6px; }
.chain { color: var(--violet); font-weight: 500; }
.dock-bubble { position: relative; display: grid; place-items: center; width: 60px; height: 60px; padding: 0; border-radius: 50%; cursor: pointer;
  border: 0; color: var(--gold); background: var(--dock-bg); backdrop-filter: blur(20px); box-shadow: 0 14px 34px -8px var(--dock-shadow); }
/* The ring shows how far the current action or enemy has gone */
.dock-bubble::before { content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(var(--c) var(--p), rgba(226, 182, 90, 0.18) 0);
  -webkit-mask: radial-gradient(circle, transparent 62%, #000 64%); mask: radial-gradient(circle, transparent 62%, #000 64%); }
.dock-bubble:hover { transform: scale(1.06); }
.dock-bubble { transition: transform 0.15s; }
.bubble-badge { position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; display: grid; place-items: center;
  background: var(--gold); color: var(--on-gold); font-size: 11px; }
</style>
