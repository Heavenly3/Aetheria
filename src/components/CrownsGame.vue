<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { CROWNS, KEEPER_STANDS, CROWNS_BONUS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// Seven Crowns: cards against the keeper, closest to seven without going over
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const game = computed(() => (void state.tavern.games, G.tavernGames().crowns))
const round = computed(() => game.value.round)
const you = computed(() => (round.value ? G.crownsSum(round.value.you) : 0))
const keeper = computed(() => (round.value ? G.crownsSum(round.value.keeper) : 0))
const playing = computed(() => !!round.value && !round.value.result)

function deal() {
  if (round.value?.result) G.crownsClear()
  if (!G.crownsStart(bet.value)) return G.toast('crown', 'tavern.badBet', {}, 'warn')
  play('dice')
}
function draw() { G.crownsDraw(); play(round.value.result ? 'bad' : 'dice'); sound() }
function stand() { G.crownsStand(); sound() }
function sound() {
  const r = round.value?.result
  if (r) play(r.net > 0 ? (r.kind === 'seven' ? 'rare' : 'coin') : r.net < 0 ? 'bad' : 'dice')
}
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="crown" /> {{ $t('tavern.crowns.title') }} <HelpTip k="sections.crowns" /></h3>
    <p class="small muted" style="margin-top:0">{{ $t('tavern.crowns.rules', { n: CROWNS, k: KEEPER_STANDS, b: CROWNS_BONUS * 100 }) }}</p>

    <div class="table">
      <div class="side">
        <div class="small muted">{{ $t('tavern.barkeep') }} <b v-if="round" class="tnum">· {{ keeper }}</b></div>
        <div class="cards">
          <span v-for="(c, i) in round?.keeper || []" :key="i" class="card-face">{{ c }}<GameIcon name="crown" :size="14" /></span>
          <span v-if="playing" class="card-face back" :aria-label="$t('tavern.crowns.hidden')"><GameIcon name="crown" :size="14" /></span>
          <span v-if="!round" class="faint small">—</span>
        </div>
      </div>
      <div class="side">
        <div class="small muted">{{ $t('tavern.you') }} <b v-if="round" class="tnum" :class="{ 'bad-text': you > CROWNS, 'gold-text': you === CROWNS }">· {{ you }}</b></div>
        <div class="cards">
          <span v-for="(c, i) in round?.you || []" :key="i" class="card-face mine">{{ c }}<GameIcon name="crown" :size="14" /></span>
          <span v-if="!round" class="faint small">—</span>
        </div>
      </div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t('tavern.crowns.results.' + round.result.kind) }}
      <b v-if="round.result.net">{{ $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) }}</b>
    </div>

    <div v-if="playing" class="row" style="margin-top:12px">
      <span class="small muted grow">{{ $t('tavern.crowns.bet', { n: fmt(round.bet) }) }}</span>
      <Button :label="$t('tavern.crowns.draw')" icon="pi pi-plus" @click="draw" />
      <Button :label="$t('tavern.crowns.stand')" icon="pi pi-stop-circle" severity="secondary" outlined @click="stand" />
    </div>
    <div v-else class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="crowns-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.crowns.betLabel')" />
      <Button :label="round ? $t('tavern.crowns.again') : $t('tavern.crowns.deal')" icon="pi pi-clone" @click="deal" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.gameStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.table { display: grid; gap: 12px; padding: 14px; border-radius: 14px; background: var(--well); }
.cards { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; min-height: 52px; align-items: center; }
.card-face { width: 38px; height: 52px; border-radius: 7px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-weight: 800; font-size: 17px; background: var(--panel-solid); border: 1px solid var(--line-hi); color: var(--ink); }
.card-face .gi { color: var(--gold); }
.card-face.mine { border-color: color-mix(in srgb, var(--gold) 60%, transparent); }
.card-face.back { background: repeating-linear-gradient(45deg, var(--tint-2) 0 6px, var(--tint-1) 6px 12px); color: transparent; }
.result { margin-top: 12px; font-weight: 700; }
</style>
