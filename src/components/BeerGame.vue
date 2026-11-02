<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { BEER_ROUNDS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// The drinking contest: drink while the tankard is steady, round after round, until the rival staggers
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('beer')))
const round = computed(() => game.value.round)
const playing = computed(() => G.tableOpen('beer'))
const n = computed(() => round.value?.n || 0)
const zone = computed(() => G.beerZone(n.value))
// The sway, from -1 to 1: faster with every tankard
const sway = ref(0)
const gulp = ref(0)
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let raf = 0, t = 0, last = 0
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  t += dt * (1.5 + 0.22 * n.value) * (still() ? 0.6 : 1)
  sway.value = Math.sin(t * 2.1) * 0.75 + Math.sin(t * 3.3 + 1) * 0.25
  raf = requestAnimationFrame(frame)
}
onMounted(() => { last = performance.now(); raf = requestAnimationFrame(frame) })
onUnmounted(() => cancelAnimationFrame(raf))
const steady = computed(() => Math.abs(sway.value) <= zone.value)

function start() {
  G.tableClear('beer')
  if (!G.beerStart(bet.value)) return G.toast('beer-horn', 'tavern.badBet', {}, 'warn')
  play('dice')
}
function drink() {
  if (!playing.value) return
  const r = G.beerDrink(steady.value)
  gulp.value++
  const res = r?.result
  play(res ? (res.net > 0 ? 'coin' : res.net < 0 ? 'bad' : 'dice') : 'dice')
}
function onKey(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); drink() } }
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="beer-horn" /> {{ $t('tavern.beer.title') }} <HelpTip k="sections.beer" /></h3>
    <div class="table" :tabindex="playing ? 0 : -1" :aria-label="$t('tavern.beer.area')" @keydown="onKey" @click="drink">
      <div class="gauge">
        <span class="steady" :style="{ left: (50 - zone * 50) + '%', width: zone * 100 + '%' }" />
        <span class="needle" :class="{ ok: steady }" :style="{ left: (50 + sway * 50) + '%' }" />
      </div>
      <div class="mug-wrap">
        <span :key="gulp" class="mug" :class="{ gulp: gulp && !still() }" :style="{ transform: `rotate(${sway * 28}deg)` }"><GameIcon name="beer-horn" :size="64" /></span>
      </div>
      <div class="tally" :aria-label="$t('tavern.beer.drunk', { n })">
        <GameIcon v-for="i in n" :key="i" name="beer-horn" :size="16" class="drunk" />
        <span v-if="!n" class="faint small">{{ $t('tavern.beer.none', { max: BEER_ROUNDS }) }}</span>
      </div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t(`tavern.beer.results.${round.result.kind}`, { keeper: G.journalNames().keeper, n }) }}
      <b>{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</b>
    </div>

    <div v-if="playing" class="row" style="margin-top:12px">
      <span class="small muted grow">{{ $t('tavern.beer.round', { n: n + 1, max: BEER_ROUNDS }) }}</span>
      <Button :label="$t('tavern.beer.drink')" icon="pi pi-check" @click="drink" />
    </div>
    <div v-else class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="beer-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.betLabel')" />
      <Button :label="$t('tavern.beer.start')" icon="pi pi-flag" @click="start" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.tableStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }} · {{ $t('tavern.beer.best', { n: game.best || 0 }) }}</div>
  </div>
</template>

<style scoped>
.table { display: grid; gap: 12px; padding: 16px; border-radius: 14px; background: var(--well); cursor: pointer; }
.table:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.gauge { position: relative; height: 14px; border-radius: 8px; background: color-mix(in srgb, var(--danger) 30%, var(--panel-solid)); }
.steady { position: absolute; top: 0; bottom: 0; border-radius: 8px; background: color-mix(in srgb, var(--ok) 65%, var(--panel-solid)); transition: left 0.3s, width 0.3s; }
.needle { position: absolute; top: -4px; width: 4px; height: 22px; margin-left: -2px; border-radius: 2px; background: var(--ink); }
.needle.ok { background: var(--gold-hi); box-shadow: 0 0 8px var(--gold); }
.mug-wrap { display: grid; place-items: center; height: 84px; }
.mug { color: #e8b84a; transform-origin: 50% 90%; filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4)); }
.mug.gulp :deep(svg) { animation: gulp 0.35s ease-out; }
.tally { display: flex; flex-wrap: wrap; gap: 3px; min-height: 18px; justify-content: center; }
.drunk { color: #e8b84a; animation: pop 0.3s ease-out; }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes gulp { 40% { transform: translateY(-10px) scale(1.1); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .drunk, .result { animation: none; } .steady { transition: none; } }
</style>
