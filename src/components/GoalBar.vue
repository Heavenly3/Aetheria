<script setup>
import { computed, ref } from 'vue'
import { G, state } from '../game/engine.js'
import GameIcon from './GameIcon.vue'

// Once the tutorial is over, one line at the top of every screen with the next thing worth doing.
// Hiding it lasts until the goal changes; that choice is kept per device
const STORE = 'aetheria-goal-hidden'
const hidden = ref((() => { try { return localStorage.getItem(STORE) || '' } catch { return '' } })())
const goal = computed(() => (state.tutorial.done ? G.nextGoal() : null))
const key = computed(() => goal.value && `${goal.value.kind}:${goal.value.quest?.id || goal.value.hint || ''}`)
const show = computed(() => goal.value && key.value !== hidden.value)
function hide() {
  hidden.value = key.value
  try { localStorage.setItem(STORE, key.value) } catch { /* storage unavailable */ }
}
</script>

<template>
  <div v-if="show" class="goal-bar" role="note">
    <router-link :to="goal.to" class="goal-link">
      <span class="goal-icon"><GameIcon :name="goal.icon" :size="16" /></span>
      <span class="goal-label">{{ $t('goal.label') }}</span>
      <span class="goal-text">
        <template v-if="goal.kind === 'quest'">{{ $t('goal.quest', { name: goal.quest.name }) }}</template>
        <template v-else-if="goal.kind === 'ending'">{{ $t('goal.ending') }}</template>
        <template v-else>{{ $t(`journal.hints.${goal.hint}`) }} <small class="faint">· {{ $t(`journal.acts.${goal.act}`) }}</small></template>
      </span>
      <i class="pi pi-angle-right goal-go" />
    </router-link>
    <button class="goal-hide" :aria-label="$t('goal.hide')" v-tooltip.left="$t('goal.hide')" @click="hide"><i class="pi pi-times" /></button>
  </div>
</template>

<style scoped>
.goal-bar { display: flex; align-items: center; gap: 4px; margin-bottom: 16px; padding: 4px 4px 4px 6px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); }
.goal-link { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: 9px; color: var(--ink-2); text-decoration: none; }
.goal-link:hover { background: var(--tint-2); color: var(--ink); }
.goal-icon { width: 28px; height: 28px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; background: var(--tint-2); border: 1px solid var(--line); color: var(--gold); }
.goal-label { flex-shrink: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.goal-text { min-width: 0; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goal-go { color: var(--faint); margin-inline-start: auto; }
.goal-hide { flex-shrink: 0; width: 30px; height: 30px; border: 0; border-radius: 8px; background: none; color: var(--faint); cursor: pointer; }
.goal-hide:hover { background: var(--tint-2); color: var(--ink); }
@media (max-width: 600px) {
  .goal-label { display: none; }
  .goal-text { white-space: normal; font-size: 13.5px; }
}
</style>
