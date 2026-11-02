<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { TABA_FACES } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// Knucklebone: one throw of the bone, and the face it lands on decides
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.table('taba')))
const round = computed(() => game.value.round)
const tumbling = ref(false)
const FACE_LOOK = { luck: 'gold', flesh: 'ok', belly: 'muted', hollow: 'bad' }

function toss() {
  if (tumbling.value) return
  G.tableClear('taba')
  if (!G.tabaThrow(bet.value)) return G.toast('crossed-bones', 'tavern.badBet', {}, 'warn')
  tumbling.value = true
  play('dice')
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => {
    tumbling.value = false
    const r = round.value.result
    play(r.net > 0 ? (r.kind === 'luck' ? 'rare' : 'coin') : r.net < 0 ? 'bad' : 'dice')
  }, still ? 0 : 900)
}
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="crossed-bones" /> {{ $t('tavern.taba.title') }} <HelpTip k="sections.taba" /></h3>
    <div class="table">
      <div class="bone-wrap">
        <svg :key="round?.bet + '-' + game.played" class="bone" :class="{ tumble: tumbling }" viewBox="-60 -30 120 60" aria-hidden="true">
          <path d="M-38,-12 C-52,-26 -62,-6 -50,0 C-62,6 -52,26 -38,12 L38,12 C52,26 62,6 50,0 C62,-6 52,-26 38,-12 Z" />
          <circle v-if="round && !tumbling" r="5" :class="'face-dot ' + round.face" />
        </svg>
      </div>
      <div class="faces">
        <span v-for="f in TABA_FACES" :key="f.id" class="face" :class="[FACE_LOOK[f.id], { on: round && !tumbling && round.face === f.id }]">
          <b>{{ $t(`tavern.taba.faces.${f.id}`) }}</b>
          <small>{{ f.mult ? '×' + f.mult : $t('tavern.taba.loses') }}</small>
        </span>
      </div>
    </div>
    <div v-if="round?.result && !tumbling" class="result" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t(`tavern.taba.results.${round.result.kind}`) }}
      <b>{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</b>
    </div>
    <div class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="taba-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.betLabel')" />
      <Button :label="$t('tavern.taba.throw')" icon="pi pi-replay" :loading="tumbling" @click="toss" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.tableStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.table { display: grid; gap: 14px; padding: 16px; border-radius: 14px; background: var(--well); }
.bone-wrap { display: grid; place-items: center; height: 90px; }
.bone { width: 130px; overflow: visible; }
.bone path { fill: #efe3c8; stroke: #8a7550; stroke-width: 2; }
.bone.tumble { animation: tumble 0.9s cubic-bezier(0.3, 0.6, 0.4, 1); }
.face-dot { stroke: #1d1a14; stroke-width: 1.5; }
.face-dot.luck { fill: var(--gold); }
.face-dot.flesh { fill: #c25b4a; }
.face-dot.belly { fill: #b9a989; }
.face-dot.hollow { fill: #2a2418; }
.faces { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.face { display: grid; justify-items: center; padding: 6px 4px; border-radius: 10px; border: 1px solid var(--line); background: var(--tint-1); font-size: 13px; transition: transform 0.2s, border-color 0.2s; }
.face small { color: var(--muted); }
.face.on { transform: translateY(-3px); border-color: var(--gold); box-shadow: 0 0 14px -6px var(--gold); }
.face.gold b { color: var(--gold-hi); }
.face.ok b { color: var(--tag-ok); }
.face.bad b { color: var(--tag-bad); }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; animation: pop 0.35s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
@keyframes tumble { 0% { transform: translateY(0) rotate(0); } 40% { transform: translateY(-40px) rotate(400deg); } 75% { transform: translateY(4px) rotate(680deg); } 88% { transform: translateY(-6px) rotate(710deg); } 100% { transform: translateY(0) rotate(720deg); } }
@keyframes pop { 0% { opacity: 0; transform: translateY(6px) scale(0.92); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .bone.tumble, .result { animation: none; } .face { transition: none; } }
</style>
