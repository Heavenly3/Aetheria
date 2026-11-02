<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { G, state } from '../game/engine.js'
import { handValue } from '../game/tavernGames.js'
import { BLACKJACK, KEEPER_STANDS } from '../game/data/tavern.js'
import { fmt } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// Blackjack against the tavern keeper, who goes by the name this world gave them
const bet = ref(Math.min(100, Math.max(10, G.maxBet())))
const keeperName = computed(() => G.journalNames().keeper)
const game = computed(() => (void state.tavern.games, G.tavernGames().cards))
const round = computed(() => game.value.round)
const playing = computed(() => !!round.value && !round.value.result)
const you = computed(() => (round.value ? handValue(round.value.you) : 0))
// While the hand is played the keeper's second card stays face down
const keeperShown = computed(() => (round.value ? (playing.value ? round.value.keeper.slice(0, 1) : round.value.keeper) : []))
const keeper = computed(() => handValue(keeperShown.value))
const red = c => c.s === '♥' || c.s === '♦'

function deal() {
  if (round.value?.result) G.cardsClear()
  if (!G.cardsStart(bet.value)) return G.toast('perspective-dice-six-faces-random', 'tavern.badBet', {}, 'warn')
  play('dice')
  sound()
}
function hit() { G.cardsHit(); play('dice'); sound() }
function stand() { G.cardsStand(); sound() }
function double() { G.cardsDouble(); play('coin'); sound() }
function sound() {
  const r = round.value?.result
  if (r) play(r.net > 0 ? (r.kind === 'natural' ? 'rare' : 'coin') : r.net < 0 ? 'bad' : 'dice')
}
</script>

<template>
  <div class="panel pad">
    <h3 class="panel-title"><GameIcon name="perspective-dice-six-faces-random" /> {{ $t('tavern.cards.title') }} <HelpTip k="sections.cards" /></h3>
    <p class="small muted" style="margin-top:0">{{ $t('tavern.cards.rules', { keeper: keeperName, n: KEEPER_STANDS }) }}</p>

    <div class="table">
      <div class="hand">
        <div class="hand-head">
          <b>{{ $t('tavern.cards.yourHand') }}</b>
          <span v-if="round" class="tnum value" :class="{ 'bad-text': you > BLACKJACK, 'gold-text': you === BLACKJACK }">{{ $t('tavern.cards.value', { n: you }) }}</span>
        </div>
        <div class="cards">
          <span v-for="(c, i) in round?.you || []" :key="i" class="playing-card" :class="{ red: red(c) }" :aria-label="c.r + c.s">{{ c.r }}<small>{{ c.s }}</small></span>
          <span v-if="!round" class="faint small">—</span>
        </div>
      </div>
      <div class="hand">
        <div class="hand-head">
          <b>{{ $t('tavern.cards.keeperHand', { keeper: keeperName }) }}</b>
          <span v-if="round" class="tnum value">{{ playing ? $t('tavern.cards.valueHidden', { n: keeper }) : $t('tavern.cards.value', { n: keeper }) }}</span>
        </div>
        <div class="cards">
          <span v-for="(c, i) in keeperShown" :key="i" class="playing-card" :class="{ red: red(c) }" :aria-label="c.r + c.s">{{ c.r }}<small>{{ c.s }}</small></span>
          <span v-if="playing" class="playing-card back" :aria-label="$t('tavern.cards.hidden')" />
          <span v-if="!round" class="faint small">—</span>
        </div>
      </div>
    </div>

    <div v-if="round?.result" class="result" :class="round.result.net > 0 ? 'ok-text' : round.result.net < 0 ? 'bad-text' : 'muted'" role="status">
      {{ $t('tavern.cards.results.' + round.result.kind, { keeper: keeperName }) }}
      <b>{{ round.result.net ? $t('inventory.goldAmount', { n: (round.result.net > 0 ? '+' : '') + fmt(round.result.net) }) : $t('tavern.cards.betBack') }}</b>
    </div>

    <div v-if="playing" class="row wrap" style="margin-top:12px;gap:8px">
      <span class="small muted grow">{{ $t('tavern.cards.bet', { n: fmt(round.bet) }) }}</span>
      <Button :label="$t('tavern.cards.hit')" icon="pi pi-plus" @click="hit" />
      <Button :label="$t('tavern.cards.stand')" icon="pi pi-stop-circle" severity="secondary" outlined @click="stand" />
      <Button :label="$t('tavern.cards.double')" icon="pi pi-angle-double-up" severity="secondary" outlined :disabled="!G.canDouble()" @click="double" />
    </div>
    <div v-else class="row" style="margin-top:12px">
      <InputNumber v-model="bet" :min="10" :max="Math.max(10, G.maxBet())" inputId="cards-bet" size="small" class="grow" :suffix="' ' + $t('common.gold')" :aria-label="$t('tavern.cards.betLabel')" />
      <Button :label="round ? $t('tavern.cards.again') : $t('tavern.cards.deal')" icon="pi pi-clone" @click="deal" />
    </div>
    <div class="small faint" style="margin-top:8px">{{ $t('tavern.gameStats', { n: game.played, net: (game.net >= 0 ? '+' : '') + fmt(game.net) }) }}</div>
  </div>
</template>

<style scoped>
.table { display: grid; gap: 14px; padding: 14px; border-radius: 14px; background: var(--well); }
.hand-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 14px; }
.value { font-weight: 800; }
.cards { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; min-height: 60px; align-items: center; }
.playing-card { width: 42px; height: 60px; border-radius: 7px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;
  font-weight: 800; font-size: 17px; background: #f7f1e3; color: #1d1a14; border: 1px solid rgba(0, 0, 0, 0.25); box-shadow: 0 3px 8px -4px rgba(0, 0, 0, 0.6); }
.playing-card small { font-size: 16px; margin-top: 3px; }
.playing-card.red { color: #b3261e; }
.playing-card.back { background: repeating-linear-gradient(45deg, #7a2a32 0 6px, #5a1f26 6px 12px); border-color: var(--line-hi); }
.result { margin-top: 12px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 6px; }
</style>
