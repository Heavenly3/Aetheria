<script setup>
import { ref, computed, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { runeTone } from '../game/voices.js'
import GameIcon from './GameIcon.vue'

// The founding rite: runes light and sing one after another; the hero sings them back, a longer row each round
// where: 'affair' for a guild affair, 'trial' for a guild's entry trial
const props = defineProps({ affair: { type: Object, required: true }, disabled: Boolean, where: { type: String, default: 'affair' } })
const emit = defineEmits(['answer'])
const RUNES = [
  { icon: 'flame', color: '#ff7a3c' }, { icon: 'water-drop', color: '#7ad7ff' }, { icon: 'oak', color: '#62c17e' },
  { icon: 'sun', color: '#ffd56a' }, { icon: 'eclipse', color: '#a98bff' }, { icon: 'holy-symbol', color: '#f0f0f0' },
]
const e = computed(() => props.affair.enigma)
const round = ref(0) // runes in the current round; 0 before the rite begins
const input = ref([])
const lit = ref(-1)
const phase = ref('idle') // idle · listen · turn
let timers = []
const later = (fn, ms) => timers.push(setTimeout(fn, ms))
onUnmounted(() => timers.forEach(clearTimeout))

function sing(n) {
  phase.value = 'listen'
  input.value = []
  const step = 650
  for (let k = 0; k < n; k++) {
    later(() => { lit.value = e.value.seq[k]; runeTone(e.value.seq[k]) }, 400 + k * step)
    later(() => { lit.value = -1 }, 400 + k * step + 420)
  }
  later(() => { phase.value = 'turn' }, 400 + n * step)
}
function begin() { round.value = 1; sing(1) }
function press(i) {
  if (phase.value !== 'turn' || props.disabled) return
  runeTone(i, 0.25)
  lit.value = i
  later(() => { if (lit.value === i) lit.value = -1 }, 250)
  input.value.push(i)
  const k = input.value.length - 1
  // A wrong rune ends the rite: it is answered as it stands
  if (input.value[k] !== e.value.seq[k]) { phase.value = 'idle'; round.value = 0; emit('answer', [...input.value]); return }
  if (input.value.length < round.value) return
  if (round.value === e.value.seq.length) { phase.value = 'idle'; emit('answer', [...input.value]); return }
  round.value++
  phase.value = 'listen'
  later(() => sing(round.value), 700)
}
</script>

<template>
  <div class="echo">
    <p class="small" style="margin-top:0">{{ $t('affairs.echo.rules') }}</p>
    <div class="runes" :style="{ '--n': e.runes }">
      <button v-for="i in e.runes" :key="i" class="rune" :class="{ on: lit === i - 1 }" :style="{ '--c': RUNES[i - 1].color }"
        :disabled="disabled || phase !== 'turn'" :aria-label="$t('affairs.echo.rune', { n: i })" @click="press(i - 1)">
        <GameIcon :name="RUNES[i - 1].icon" :size="28" />
      </button>
    </div>
    <div class="row" style="gap:10px;margin-top:12px">
      <span class="small muted grow tnum">
        <template v-if="round">{{ $t('affairs.echo.round', { n: round, total: e.seq.length }) }} · {{ phase === 'turn' ? $t('affairs.echo.yourTurn') : $t('affairs.echo.listen') }}</template>
      </span>
      <Button v-if="!round" :label="$t('affairs.echo.start')" icon="pi pi-play" size="small" :disabled="disabled" @click="begin" />
      <Button v-else :label="$t('affairs.echo.replay')" icon="pi pi-replay" size="small" severity="secondary" outlined :disabled="phase !== 'turn'" @click="sing(round)" />
    </div>
  </div>
</template>

<style scoped>
.runes { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 72px)); gap: 10px; justify-content: center; }
.rune { aspect-ratio: 1; border-radius: 16px; border: 2px solid color-mix(in srgb, var(--c) 45%, var(--line)); background: color-mix(in srgb, var(--c) 10%, var(--panel)); color: var(--c); display: grid; place-items: center; cursor: pointer; transition: transform 0.1s, box-shadow 0.15s; }
.rune.on { background: color-mix(in srgb, var(--c) 45%, var(--panel)); box-shadow: 0 0 22px -2px var(--c); transform: scale(1.06); color: #fff; }
.rune:disabled { cursor: default; }
@media (max-width: 520px) { .runes { gap: 6px; } }
</style>
