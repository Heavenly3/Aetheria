<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Popover from 'primevue/popover'
import { G, state } from '../game/engine.js'
import { trackedGoals } from '../ui/tracker.js'
import { throttled } from '../ui/throttled.js'
import { goTo } from '../ui/focus.js'
import { fmt } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import TrackerBoard from './TrackerBoard.vue'

// Once the tutorial is over, one line at the top of every screen: the first objective on the go
// (it leads straight to where it is done, and the rest open from the counter), or else the next
// step of the story. Hiding it lasts until what it shows changes; that choice is kept per device
const STORE = 'aetheria-goal-hidden'
const router = useRouter()
const board = ref(null)
const hidden = ref((() => { try { return localStorage.getItem(STORE) || '' } catch { return '' } })())
const on = computed(() => state.tutorial.done && state.settings.goalBar !== false)
const goals = throttled(() => (on.value ? trackedGoals() : []))
const top = computed(() => goals.value[0] || null)
const goal = computed(() => (on.value && !top.value ? G.nextGoal() : null))
const key = computed(() => (top.value ? 'track:' + top.value.key : goal.value && `${goal.value.kind}:${goal.value.quest?.id || goal.value.hint || ''}`))
const show = computed(() => (top.value || goal.value) && key.value !== hidden.value)
function hide() {
  hidden.value = key.value
  try { localStorage.setItem(STORE, key.value) } catch { /* storage unavailable */ }
}
</script>

<template>
  <div v-if="show" class="goal-bar" role="note">
    <!-- An objective on the go: straight to where it is done -->
    <button v-if="top" class="goal-link" @click="goTo(router, top.go)">
      <span class="goal-icon"><ItemTile v-if="top.item" :item="top.item" size="xs" :tip="false" /><GameIcon v-else :name="top.icon" :size="16" /></span>
      <span class="goal-label">{{ $t(top.ready ? 'tracker.readyLabel' : 'tracker.label') }}</span>
      <span class="goal-text">{{ top.text }} <small class="faint">· {{ top.from }}<template v-if="top.max && !top.ready"> · {{ fmt(top.cur) }}/{{ fmt(top.max) }}</template></small></span>
      <i class="pi pi-directions goal-go" />
    </button>
    <router-link v-else :to="goal.to" class="goal-link">
      <span class="goal-icon"><GameIcon :name="goal.icon" :size="16" /></span>
      <span class="goal-label">{{ $t('goal.label') }}</span>
      <span class="goal-text">
        <template v-if="goal.kind === 'quest'">{{ $t('goal.quest', { name: goal.quest.name }) }}</template>
        <template v-else-if="goal.kind === 'ending'">{{ $t('goal.ending') }}</template>
        <template v-else>{{ $t(`journal.hints.${goal.hint}`) }} <small class="faint">· {{ $t(`journal.acts.${goal.act}`) }}</small></template>
      </span>
      <i class="pi pi-angle-right goal-go" />
    </router-link>
    <button v-if="goals.length > 1" class="goal-count" :aria-label="$t('tracker.all')" v-tooltip.bottom="$t('tracker.all')" @click="board.toggle($event)">
      <i class="pi pi-list" /> {{ goals.length }}
    </button>
    <button class="goal-hide" :aria-label="$t('goal.hide')" v-tooltip.left="$t('goal.hide')" @click="hide"><i class="pi pi-times" /></button>
    <Popover ref="board" class="goal-pop">
      <div class="goal-pop-body">
        <div class="goal-pop-title">{{ $t('tracker.title') }}</div>
        <TrackerBoard compact @went="board.hide()" />
      </div>
    </Popover>
  </div>
</template>

<style scoped>
.goal-bar { display: flex; align-items: center; gap: 4px; margin-bottom: 16px; padding: 4px 4px 4px 6px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); }
.goal-link { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 4px 6px; border: 0; background: none; border-radius: 9px; color: var(--ink-2); text-decoration: none; font: inherit; text-align: start; cursor: pointer; }
.goal-link:hover { background: var(--tint-2); color: var(--ink); }
.goal-icon { width: 28px; height: 28px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; background: var(--tint-2); border: 1px solid var(--line); color: var(--gold); }
.goal-label { flex-shrink: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.goal-text { min-width: 0; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goal-go { color: var(--gold); margin-inline-start: auto; }
.goal-count { flex-shrink: 0; display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 9px; border: 1px solid var(--line); border-radius: 8px; background: none; color: var(--ink-2); font: inherit; font-size: 13px; cursor: pointer; }
.goal-count:hover { background: var(--tint-2); color: var(--ink); }
.goal-hide { flex-shrink: 0; width: 30px; height: 30px; border: 0; border-radius: 8px; background: none; color: var(--faint); cursor: pointer; }
.goal-hide:hover { background: var(--tint-2); color: var(--ink); }
.goal-pop-body { width: min(440px, calc(100vw - 40px)); max-height: min(70vh, 560px); overflow-y: auto; }
.goal-pop-title { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin: 2px 2px 8px; }
@media (max-width: 600px) {
  .goal-label { display: none; }
  .goal-text { white-space: normal; font-size: 13.5px; }
}
</style>
