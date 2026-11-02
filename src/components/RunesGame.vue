<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { RUNE_PAYS, RUNE_SWAPS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import GameTable from './GameTable.vue'
import BetInput from './BetInput.vue'

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
  later(1200, () => {
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
const status = computed(() => ({ show: t('tavern.runes.watch'), shuffle: t('tavern.runes.shuffling'), pick: t('tavern.runes.pick') }[phase.value] || ''))
</script>

<template>
  <GameTable icon="rune-stone" :title="$t('tavern.runes.title')" help="sections.runes" :stats="game"
    :extra="[{ label: $t('tavern.figures.hands'), value: speed.toFixed(2) + ' s' }]">
    <template #badge><span class="tag">{{ $t('tavern.runes.badge', { x: RUNE_PAYS, n: RUNE_SWAPS }) }}</span></template>
    <div class="stones" :style="{ '--swap': speed + 's' }">
      <span class="cloth" />
      <button v-for="stone in 3" :key="stone" type="button" class="stone" :class="{ glow: glows(stone - 1), lift: swapping.includes(stone - 1), pickable: phase === 'pick',
        picked: round?.result && round.picked === slots[stone - 1] }" :style="{ left: (slots[stone - 1] * 33.33 + 16.66) + '%' }"
        :disabled="phase !== 'pick'" :aria-label="stoneLabel(slots[stone - 1])" @click="pick(slots[stone - 1])">
        <GameIcon name="rune-stone" :size="62" />
      </button>
    </div>
    <div class="status" role="status">{{ status }}</div>
    <div v-if="round?.result" :key="'r' + game.played" class="banner-result pop" :class="round.result.net > 0 ? 'win' : 'loss'" role="status">
      <b>{{ $t(`tavern.runes.results.${round.result.kind}`) }}</b>
      <span class="tnum">{{ $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) }}</span>
    </div>

    <template #controls>
      <template v-if="playing">
        <div class="turn"><b>{{ status }}</b></div>
      </template>
      <template v-else>
        <BetInput v-model="bet" id="runes-bet" />
        <Button :label="$t('tavern.runes.start', { x: RUNE_PAYS })" icon="pi pi-eye" fluid @click="start" />
      </template>
    </template>
  </GameTable>
</template>

<style scoped>
.stones { position: relative; height: 150px; }
.cloth { position: absolute; left: 4%; right: 4%; top: 50%; height: 70px; margin-top: -20px; border-radius: 50%; background: radial-gradient(ellipse, rgba(0, 0, 0, 0.35), transparent 70%); }
.stone { position: absolute; top: 24px; width: 96px; height: 96px; margin-left: -48px; border-radius: 22px; display: grid; place-items: center; color: #b9b2c8;
  background: radial-gradient(circle at 40% 30%, #5a5468, #2a2636); border: 1px solid #1a1722; box-shadow: 0 8px 16px -8px rgba(0, 0, 0, 0.8);
  transition: left var(--swap, 0.5s) ease-in-out, transform 0.2s, box-shadow 0.3s; font: inherit; }
.stone.lift { transform: translateY(-14px); }
.stone.glow { color: #b8f0ff; box-shadow: 0 0 28px 4px #6fd3ff, 0 8px 16px -8px rgba(0, 0, 0, 0.8); }
.stone.pickable { cursor: pointer; }
.stone.pickable:hover { transform: translateY(-6px); box-shadow: 0 0 0 2px var(--gold), 0 8px 16px -8px rgba(0, 0, 0, 0.8); }
.stone.picked { outline: 2px solid var(--gold); outline-offset: 4px; }
.stone:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
.status { text-align: center; min-height: 22px; font-weight: 700; color: var(--ink-2); }
.turn { padding: 10px 12px; border-radius: 10px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result { justify-self: center; display: grid; justify-items: center; gap: 2px; padding: 10px 22px; border-radius: 12px; background: var(--panel-solid); border: 1px solid var(--line-hi); }
.banner-result b { font-family: var(--font-display); font-size: 19px; }
.banner-result.win { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--tag-ok); }
.banner-result.loss { border-color: color-mix(in srgb, var(--danger) 55%, transparent); color: var(--tag-bad); }
:root[data-theme="light"] .banner-result.win { color: var(--ok); }
:root[data-theme="light"] .banner-result.loss { color: var(--danger); }
.pop { animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (max-width: 600px) { .stone { width: 72px; height: 72px; margin-left: -36px; } .stone :deep(svg) { width: 46px; height: 46px; } }
@media (prefers-reduced-motion: reduce) { .pop { animation: none; } .stone { transition: left var(--swap, 0.5s) linear; } }
</style>
