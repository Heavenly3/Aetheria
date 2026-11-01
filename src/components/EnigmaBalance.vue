<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'

// The scales: coins go on either pan, a few weighings show which way the false one leans
const props = defineProps({ affair: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['answer'])
const { t } = useI18n()
const e = computed(() => props.affair.enigma)
const side = ref({})
const cycle = c => { side.value = { ...side.value, [c]: { undefined: 'L', L: 'R', R: undefined }[side.value[c]] } }
const left = computed(() => Object.keys(side.value).filter(c => side.value[c] === 'L').map(Number))
const right = computed(() => Object.keys(side.value).filter(c => side.value[c] === 'R').map(Number))
const left$ = computed(() => e.value.weighs - e.value.log.length)
const tip = r => t(r === -1 ? 'affairs.balance.tipLeft' : r === 1 ? 'affairs.balance.tipRight' : 'affairs.balance.even')
const msg = ref('')
function doWeigh() {
  if (left.value.length !== right.value.length) { msg.value = t('affairs.balance.same'); return }
  const r = G.affairWeigh(left.value, right.value)
  if (r === null) return
  msg.value = ''
  play(r === 0 ? 'coin' : 'dice')
  side.value = {}
}
const last = computed(() => e.value.log[e.value.log.length - 1])
const tilt = computed(() => (last.value ? last.value.result * -8 : 0))
</script>

<template>
  <div class="bal">
    <p class="small" style="margin-top:0">{{ $t('affairs.balance.rules', { coins: e.coins, how: $t(e.either ? 'affairs.balance.either' : 'affairs.balance.heavier'), n: e.weighs }) }}</p>
    <p class="small muted">{{ $t('affairs.balance.howTo') }}</p>

    <div class="scales" :style="{ '--tilt': tilt + 'deg' }">
      <div class="beam-bar">
        <div class="pan">
          <div class="small muted">{{ $t('affairs.balance.left') }}</div>
          <div class="pan-coins"><span v-for="c in left" :key="c" class="coin small">{{ c + 1 }}</span></div>
        </div>
        <GameIcon name="two-coins" :size="22" class="pivot" />
        <div class="pan">
          <div class="small muted">{{ $t('affairs.balance.right') }}</div>
          <div class="pan-coins"><span v-for="c in right" :key="c" class="coin small">{{ c + 1 }}</span></div>
        </div>
      </div>
    </div>

    <div class="coins">
      <button v-for="c in e.coins" :key="c" class="coin big" :class="side[c - 1]" :disabled="disabled" @click="cycle(c - 1)">
        {{ c }}<small v-if="side[c - 1]">{{ side[c - 1] === 'L' ? '◀' : '▶' }}</small>
      </button>
    </div>

    <div class="row wrap" style="gap:8px;margin-top:10px">
      <Button :label="$t('affairs.balance.weigh')" icon="pi pi-sort-alt" size="small" :disabled="disabled || !left$ || !left.length" @click="doWeigh" />
      <Button :label="$t('affairs.balance.clear')" size="small" severity="secondary" outlined :disabled="!left.length && !right.length" @click="side = {}" />
      <span class="small muted tnum">{{ $t('affairs.balance.weighsLeft', { n: left$ }) }}</span>
    </div>
    <p v-if="msg" class="small bad-text">{{ msg }}</p>

    <ol v-if="e.log.length" class="log small">
      <li v-for="(w, i) in e.log" :key="i"><span class="tnum">{{ w.left.map(c => c + 1).join(' ') }}</span> · <span class="tnum">{{ w.right.map(c => c + 1).join(' ') }}</span> → <b>{{ tip(w.result) }}</b></li>
    </ol>

    <p class="small" style="margin:14px 0 6px">{{ $t('affairs.balance.pick') }}</p>
    <div class="coins">
      <button v-for="c in e.coins" :key="c" class="coin accuse" :disabled="disabled" :aria-label="$t('affairs.balance.accuse', { n: c })" @click="emit('answer', c - 1)">{{ c }}</button>
    </div>
  </div>
</template>

<style scoped>
.scales { display: grid; place-items: center; margin: 8px 0 12px; }
.beam-bar { display: flex; align-items: flex-end; gap: 10px; transform: rotate(var(--tilt)); transition: transform 0.6s cubic-bezier(.3, 1.6, .5, 1); }
.pan { width: 150px; min-height: 62px; padding: 6px; border-radius: 0 0 40px 40px; border: 2px solid color-mix(in srgb, var(--gold) 50%, var(--line)); border-top: 0; text-align: center; }
.pan-coins { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; margin-top: 4px; }
.pivot { color: var(--gold); margin-bottom: 10px; }
.coins { display: flex; flex-wrap: wrap; gap: 6px; }
.coin { border-radius: 50%; border: 2px solid color-mix(in srgb, #c9a04a 60%, transparent); background: radial-gradient(circle at 35% 30%, #f6dc9a, #b8862e); color: #2a1a06; font-weight: 800; display: inline-grid; place-items: center; }
.coin.small { width: 22px; height: 22px; font-size: 11px; }
.coin.big, .coin.accuse { width: 40px; height: 40px; cursor: pointer; position: relative; }
.coin.big small { position: absolute; bottom: -2px; right: -2px; font-size: 10px; background: var(--panel); color: var(--ink); border-radius: 50%; width: 16px; height: 16px; display: grid; place-items: center; }
.coin.L { outline: 2px solid #7ad7ff; }
.coin.R { outline: 2px solid #e2b65a; }
.coin.accuse:hover:not(:disabled) { outline: 2px solid var(--danger); }
.coin:disabled { opacity: 0.6; cursor: default; }
.log { margin: 10px 0 0; padding-inline-start: 20px; color: var(--ink-2); }
:root[data-motion='reduce'] .beam-bar { transition: none; }
</style>
