<script setup>
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { fmt } from '../game/format.js'

// A bet for a tavern table: typed, or set with a tap (least, half, double, most)
const bet = defineModel({ type: Number, default: 100 })
const props = defineProps({ id: { type: String, required: true }, disabled: Boolean })
const max = computed(() => (void state.gold, Math.max(10, G.maxBet())))
const set = v => { bet.value = Math.max(10, Math.min(max.value, Math.floor(v))) }
</script>

<template>
  <div class="bet">
    <label class="small muted" :for="props.id">{{ $t('tavern.betLabel') }}</label>
    <InputNumber v-model="bet" :min="10" :max="max" :inputId="props.id" :disabled="disabled" fluid :suffix="' ' + $t('common.gold')" />
    <div class="quick">
      <button type="button" :disabled="disabled" @click="set(10)">{{ $t('tavern.bet.min') }}</button>
      <button type="button" :disabled="disabled" @click="set(bet / 2)">½</button>
      <button type="button" :disabled="disabled" @click="set(bet * 2)">×2</button>
      <button type="button" :disabled="disabled" @click="set(max)">{{ $t('tavern.bet.max') }}</button>
    </div>
    <div class="small faint tnum">{{ $t('tavern.bet.limit', { n: fmt(G.tavernInfo().maxBet) }) }}</div>
  </div>
</template>

<style scoped>
.bet { display: grid; gap: 6px; }
.quick { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.quick button { padding: 5px 0; border-radius: 8px; border: 1px solid var(--line); background: var(--tint-1); color: var(--ink-2); font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.quick button:hover:not(:disabled) { border-color: var(--line-hi); color: var(--ink); }
.quick button:disabled { opacity: 0.5; cursor: default; }
.quick button:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
</style>
