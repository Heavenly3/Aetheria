<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { LOCK_DIGITS, LOCK_FACES } from '../game/data/guilds.js'
import { fmtTime } from '../game/format.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'

// The puzzle of the entry trial: a riddle, a rune sequence or the guild lock
const props = defineProps({ now: { type: Number, default: 0 } })
const trial = computed(() => state.guilds.trial)
const pz = computed(() => trial.value?.puzzle)
const wait = computed(() => (props.now, G.puzzleWait()))
const icons = { riddle: 'scroll-quill', sequence: 'rune-stone', lock: 'locked-chest' }
const result = ref(null)

function answer(v) {
  const r = G.answerPuzzle(v)
  if (!r) return
  result.value = r
  play(r === 'right' ? 'level' : 'bad')
}

// The lock: three dials, each turned from 1 to 6
const dials = ref(Array(LOCK_DIGITS).fill(1))
const turn = (i, d) => { dials.value[i] = ((dials.value[i] - 1 + d + LOCK_FACES) % LOCK_FACES) + 1 }
const triesLeft = computed(() => (pz.value?.kind === 'lock' ? pz.value.tries - pz.value.guesses.length : 0))
function tryLock() {
  const r = G.guessLock([...dials.value])
  if (!r) return
  if (r.solved) { result.value = 'right'; play('level') } else if (r.failed) { result.value = 'wrong'; play('bad') } else play('dice')
}
const marks = g => '●'.repeat(g.exact) + '○'.repeat(g.near) + '·'.repeat(LOCK_DIGITS - g.exact - g.near)
</script>

<template>
  <div v-if="pz" class="puzzle">
    <div class="row" style="gap:8px;margin-bottom:8px">
      <GameIcon :name="icons[pz.kind]" :size="16" />
      <b>{{ $t(`guilds.puzzles.${pz.kind}.title`) }}</b>
      <span v-if="trial.solved" class="tag ok"><i class="pi pi-check" /> {{ $t('guilds.trial.solved') }}</span>
    </div>

    <p v-if="trial.solved" class="small muted" style="margin:0">{{ $t('guilds.trial.right') }}</p>
    <div v-else-if="wait > 0" class="small bad-text">
      <i class="pi pi-hourglass" /> {{ result === 'wrong' ? $t('guilds.trial.wrong') + ' ' : '' }}{{ $t('guilds.trial.wait', { time: fmtTime(Math.ceil(wait / 1000)) }) }}
    </div>

    <template v-else>
      <p class="small muted" style="margin:0 0 10px">{{ $t(`guilds.puzzles.${pz.kind}.intro`) }}</p>

      <template v-if="pz.kind === 'riddle'">
        <p class="riddle">“{{ $t(`guilds.riddles.${pz.riddle}`) }}”</p>
        <div class="options">
          <Button v-for="o in pz.options" :key="o" :label="$t(`guilds.answers.${o}`)" severity="secondary" outlined size="small" @click="answer(o)" />
        </div>
      </template>

      <template v-else-if="pz.kind === 'sequence'">
        <div class="runes">
          <span v-for="(n, i) in pz.shown" :key="i" class="rune tnum">{{ n }}</span>
          <span class="rune ask">?</span>
        </div>
        <div class="options">
          <Button v-for="o in pz.options" :key="o" :label="String(o)" severity="secondary" outlined size="small" class="tnum" @click="answer(o)" />
        </div>
      </template>

      <template v-else>
        <div class="row wrap" style="gap:14px;align-items:flex-end">
          <div class="dials">
            <div v-for="(d, i) in dials" :key="i" class="dial">
              <button class="turn" :aria-label="'+1'" @click="turn(i, 1)"><i class="pi pi-angle-up" /></button>
              <span class="tnum">{{ d }}</span>
              <button class="turn" :aria-label="'-1'" @click="turn(i, -1)"><i class="pi pi-angle-down" /></button>
            </div>
          </div>
          <div>
            <Button :label="$t('guilds.puzzles.lock.try')" icon="pi pi-key" size="small" @click="tryLock" />
            <div class="small muted" style="margin-top:6px">{{ $t('guilds.puzzles.lock.tries', { n: triesLeft }) }}</div>
          </div>
        </div>
        <div v-if="pz.guesses.length" class="guesses">
          <div v-for="(g, i) in pz.guesses" :key="i" class="guess tnum">
            <span>{{ g.guess.join(' ') }}</span><b class="marks">{{ marks(g) }}</b>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.puzzle { padding: 14px; border-radius: var(--radius); background: var(--tint-1); border: 1px solid var(--line); }
.riddle { font-family: var(--font-display); font-size: 17px; line-height: 1.5; margin: 0 0 12px; color: var(--ink-2); }
.options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.runes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.rune { min-width: 46px; padding: 10px 8px; text-align: center; border-radius: 10px; font-family: var(--font-display); font-size: 18px;
  background: var(--panel); border: 1px solid var(--line-hi); color: var(--gold-hi); }
.rune.ask { color: var(--muted); border-style: dashed; }
.dials { display: flex; gap: 8px; }
.dial { display: flex; flex-direction: column; align-items: center; width: 52px; border-radius: 10px; background: var(--panel); border: 1px solid var(--line-hi); }
.dial span { font-family: var(--font-display); font-size: 22px; color: var(--gold-hi); }
.turn { width: 100%; background: none; border: 0; color: var(--muted); cursor: pointer; padding: 4px 0; }
.turn:hover { color: var(--ink); background: var(--tint-2); }
.guesses { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.guess { display: flex; gap: 8px; padding: 4px 10px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); font-size: 13px; }
.marks { color: var(--gold-hi); letter-spacing: 0.1em; }
@media (max-width: 480px) { .options { grid-template-columns: 1fr; } }
</style>
