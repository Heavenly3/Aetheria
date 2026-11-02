<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { RUNE_PAYS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// The rune shell game: watch the marked stone while the keeper's hands swap them, then pick one
const { t } = useI18n()
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('runes')))
const round = computed(() => game.value.round)
const playing = computed(() => G.tableOpen('runes'))
// Which slot each of the three stones stands in, and what the table is doing
const slots = ref([0, 1, 2])
const phase = ref('idle') // idle · show · shuffle · pick
const swapping = ref([])
let timers = []
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const later = (ms, fn) => timers.push(setTimeout(fn, ms))
onUnmounted(() => timers.forEach(clearTimeout))
// A round left open (the page was closed mid-shuffle) waits with the stones already shuffled
onMounted(() => {
  if (!playing.value) return
  const s = [0, 1, 2]
  for (const [a, b] of round.value.swaps) { const i = s.indexOf(a), j = s.indexOf(b); s[i] = b; s[j] = a }
  slots.value = s
  phase.value = 'pick'
})

function start() {
  G.tableClear('runes')
  const r = G.runesStart(bet.value)
  if (!r) return G.toast('rune-stone', 'tavern.badBet', {}, 'warn')
  slots.value = [0, 1, 2]
  phase.value = 'show'
  play('dice')
  const step = G.runeSwapTime() * 1000 * (still() ? 1.4 : 1)
  later(1100, () => {
    phase.value = 'shuffle'
    r.swaps.forEach(([a, b], k) => later(k * step, () => {
      // The stones standing in slots a and b trade places
      const s = [...slots.value]
      const i = s.indexOf(a), j = s.indexOf(b)
      s[i] = b; s[j] = a
      slots.value = s
      swapping.value = [i, j]
      play('dice')
    }))
    later(r.swaps.length * step + 150, () => { phase.value = 'pick'; swapping.value = [] })
  })
}
function pick(slot) {
  if (phase.value !== 'pick' || !playing.value) return
  const r = G.runesPick(slot)
  phase.value = 'idle'
  play(r.result.net > 0 ? 'coin' : 'bad')
}
// The marked stone glows while it is shown, and again once the round is over
const marked = computed(() => round.value?.marked ?? -1)
const glows = stone => stone === marked.value && (phase.value === 'show' || !!round.value?.result)
const stoneLabel = slot => t('tavern.runes.stone', { n: slot + 1 })
const speed = computed(() => G.runeSwapTime())
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="rune-stone" /> {{ $t('tavern.runes.title') }} <HelpTip k="sections.runes" /></h3>
    <div class="table">
      <div class="stones" :style="{ '--swap': speed + 's' }">
        <button v-for="stone in 3" :key="stone" type="button" class="stone" :class="{ glow: glows(stone - 1), lift: swapping.includes(stone - 1), pickable: phase === 'pick',
          picked: round?.result && round.picked === slots[stone - 1] }" :style="{ left: (slots[stone - 1] * 33.33 + 16.66) + '%' }"
          :disabled="phase !== 'pick'" :aria-label="stoneLabel(slots[stone - 1])" @click="pick(slots[stone - 1])">
          <GameIcon name="rune-stone" :size="46" />
        </button>
      </div>
      <div class="small muted status" role="status">{{ phase === 'show' ? $t('tavern.runes.watch') : phase === 'shuffle' ? $t('tavern.runes.shuffling') : phase === 'pick' ? $t('tavern.runes.pick') : '' }}</div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : 'bad-text'" role="status">
      {{ $t(`tavern.runes.results.${round.result.kind}`) }}
      <b>{{ $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) }}</b>
    </div>
    <div v-if="!playing" class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="runes-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.betLabel')" />
      <Button :label="$t('tavern.runes.start', { x: RUNE_PAYS })" icon="pi pi-eye" @click="start" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.tableStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.table { display: grid; gap: 8px; padding: 16px; border-radius: 14px; background: var(--well); }
.stones { position: relative; height: 90px; }
.stone { position: absolute; top: 12px; width: 70px; height: 70px; margin-left: -35px; border-radius: 16px; display: grid; place-items: center; color: #b9b2c8;
  background: radial-gradient(circle at 40% 30%, #5a5468, #2a2636); border: 1px solid #1a1722; box-shadow: 0 6px 12px -6px rgba(0, 0, 0, 0.7);
  transition: left var(--swap, 0.5s) ease-in-out, transform 0.2s, box-shadow 0.3s; font: inherit; }
.stone.lift { transform: translateY(-10px); }
.stone.glow { color: #b8f0ff; box-shadow: 0 0 22px 2px #6fd3ff, 0 6px 12px -6px rgba(0, 0, 0, 0.7); }
.stone.pickable { cursor: pointer; }
.stone.pickable:hover { transform: translateY(-4px); box-shadow: 0 0 0 2px var(--gold), 0 6px 12px -6px rgba(0, 0, 0, 0.7); }
.stone.picked { outline: 2px solid var(--gold); outline-offset: 3px; }
.stone:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.status { text-align: center; min-height: 18px; }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .result { animation: none; } .stone { transition: left var(--swap, 0.5s) linear; } }
</style>
