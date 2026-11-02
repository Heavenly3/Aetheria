<script setup>
import { computed } from 'vue'
import { fmt } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import HelpTip from './HelpTip.vue'

// One tavern table: the game itself on a wide felt, and beside it what to bet, how it has gone and
// the last results. Every game uses it, so they all look and sit alike
const props = defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  help: { type: String, default: '' },
  // { played, won, net, recent }: the table's record
  stats: { type: Object, default: () => ({}) },
  // Extra figures for this game: [{ label, value }]
  extra: { type: Array, default: () => [] },
})
const winRate = computed(() => (props.stats.played ? Math.round(((props.stats.won || 0) / props.stats.played) * 100) + '%' : '—'))
const net = computed(() => props.stats.net || 0)
</script>

<template>
  <section class="panel game">
    <header class="game-head">
      <span class="game-icon"><GameIcon :name="icon" :size="22" /></span>
      <h2 class="game-title">{{ title }}</h2>
      <HelpTip v-if="help" :k="help" />
      <span class="grow" />
      <slot name="badge" />
    </header>
    <div class="game-grid">
      <div class="felt"><slot /></div>
      <div class="side">
        <slot name="controls" />
        <div class="figures">
          <div class="figure"><span class="small muted">{{ $t('tavern.figures.played') }}</span><b class="tnum">{{ fmt(stats.played || 0) }}</b></div>
          <div class="figure"><span class="small muted">{{ $t('tavern.figures.won') }}</span><b class="tnum">{{ winRate }}</b></div>
          <div class="figure"><span class="small muted">{{ $t('tavern.figures.net') }}</span><b class="tnum" :class="net > 0 ? 'ok-text' : net < 0 ? 'bad-text' : ''">{{ (net > 0 ? '+' : '') + fmt(net) }}</b></div>
          <div v-for="x in extra" :key="x.label" class="figure"><span class="small muted">{{ x.label }}</span><b class="tnum">{{ x.value }}</b></div>
        </div>
        <div v-if="stats.recent?.length" class="recent">
          <span class="small muted">{{ $t('tavern.figures.recent') }}</span>
          <div class="chips">
            <span v-for="(n, i) in stats.recent" :key="i + '-' + n" class="res tnum" :class="n > 0 ? 'up' : n < 0 ? 'down' : 'even'">{{ (n > 0 ? '+' : '') + fmt(n) }}</span>
          </div>
        </div>
        <slot name="side" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.game { padding: 18px; }
.game-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.game-icon { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: var(--gold-hi); background: color-mix(in srgb, var(--gold) 12%, var(--panel-solid)); border: 1px solid var(--line-hi); }
.game-title { margin: 0; font-family: var(--font-display); font-size: 20px; letter-spacing: 0.04em; }
.game-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: stretch; }
/* The felt: the table the game is played on */
.felt { position: relative; min-height: 360px; padding: 22px; border-radius: 16px; display: flex; flex-direction: column; justify-content: center; gap: 16px;
  background: radial-gradient(ellipse at 50% 35%, color-mix(in srgb, #2f6b4a 26%, var(--well)), var(--well) 75%); border: 1px solid var(--line); box-shadow: inset 0 0 40px -10px rgba(0, 0, 0, 0.55); }
.side { display: flex; flex-direction: column; gap: 14px; padding: 16px; border-radius: 16px; background: var(--tint-1); border: 1px solid var(--line); }
.figures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.figure { display: grid; gap: 2px; padding: 8px 10px; border-radius: 10px; background: var(--panel-solid); border: 1px solid var(--line); }
.figure b { font-size: 16px; }
.figure:last-child:nth-child(odd) { grid-column: 1 / -1; }
.recent { display: grid; gap: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.res { padding: 2px 7px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid var(--line); }
.res.up { color: var(--tag-ok); border-color: color-mix(in srgb, var(--ok) 40%, transparent); }
.res.down { color: var(--tag-bad); border-color: color-mix(in srgb, var(--danger) 40%, transparent); }
.res.even { color: var(--muted); }
:root[data-theme="light"] .res.up { color: var(--ok); }
:root[data-theme="light"] .res.down { color: var(--danger); }
@media (max-width: 600px) {
  .game-head { flex-wrap: wrap; }
  .game-title { font-size: 18px; }
}
@media (max-width: 1000px) {
  .game-grid { grid-template-columns: 1fr; }
  .felt { min-height: 0; padding: 16px; }
}
</style>
