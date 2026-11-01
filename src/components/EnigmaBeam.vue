<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { traceBeam, beamSolved } from '../game/data/enigmas.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'

// The great lens: mirrors that turn on a click, and the beam drawn as it falls
// where: 'affair' for a guild affair, 'trial' for a guild's entry trial
const props = defineProps({ affair: { type: Object, required: true }, disabled: Boolean, where: { type: String, default: 'affair' } })
const emit = defineEmits(['answer'])
const e = computed(() => props.affair.enigma)
const size = computed(() => e.value.size)
// Touching the grid makes the trace follow it
const trace = computed(() => (void JSON.stringify(e.value.grid), traceBeam(e.value)))
const lit = computed(() => new Set(trace.value.path.map(([r, c]) => r * size.value + c)))
const solved = computed(() => (void JSON.stringify(e.value.grid), beamSolved(e.value)))
const fixed = i => (props.affair.fixed || []).includes(i)
function turn(r, c) {
  if (G.affairTurnMirror(r, c, props.where)) play('coin')
}
// The frame around the grid holds the lens on the left and the crystal where the beam must leave
const cells = computed(() => {
  const n = size.value, out = []
  for (let r = -1; r <= n; r++) for (let c = -1; c <= n; c++) {
    const inside = r >= 0 && c >= 0 && r < n && c < n
    if (inside) out.push({ r, c, kind: e.value.grid[r][c], i: r * n + c })
    else if (c === -1 && r === e.value.source) out.push({ r, c, kind: 'lens' })
    else if (r === e.value.target.r && c === e.value.target.c) out.push({ r, c, kind: 'crystal' })
    else out.push({ r, c, kind: 'edge' })
  }
  return out
})
</script>

<template>
  <div class="beam-wrap">
    <p class="small muted" style="margin-top:0">{{ $t('affairs.beam.howTo') }}</p>
    <div class="beam" :style="{ '--n': size + 2 }">
      <template v-for="cell in cells" :key="cell.r + ':' + cell.c">
        <span v-if="cell.kind === 'edge'" class="cell edge" />
        <span v-else-if="cell.kind === 'lens'" class="cell lens" :title="$t('affairs.beam.lens')"><GameIcon name="sun" :size="22" /></span>
        <span v-else-if="cell.kind === 'crystal'" class="cell crystal" :class="{ on: solved }" :title="$t('affairs.beam.crystal')"><GameIcon name="crystal-ball" :size="22" /></span>
        <button v-else-if="cell.kind === '/' || cell.kind === '\\'" class="cell mirror" :class="{ lit: lit.has(cell.i), fixed: fixed(cell.i) }"
          :disabled="disabled || fixed(cell.i)" :aria-label="cell.kind === '/' ? '/' : '\\'" :title="fixed(cell.i) ? $t('affairs.beam.fixed') : ''" @click="turn(cell.r, cell.c)">
          <i class="glass" :class="cell.kind === '/' ? 'up' : 'down'" />
        </button>
        <span v-else-if="cell.kind === '#'" class="cell stone" :class="{ lit: lit.has(cell.i) }"><GameIcon name="stone-block" :size="18" /></span>
        <span v-else class="cell floor" :class="{ lit: lit.has(cell.i) }" />
      </template>
    </div>
    <div class="row" style="margin-top:12px;gap:10px">
      <span v-if="solved" class="ok-text small grow"><i class="pi pi-sun" /> {{ $t('affairs.beam.lit') }}</span>
      <span v-else class="grow" />
      <Button :label="$t('affairs.beam.settle')" icon="pi pi-bolt" size="small" :disabled="disabled || !solved" @click="emit('answer', true)" />
    </div>
  </div>
</template>

<style scoped>
.beam { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 46px)); gap: 3px; justify-content: center; }
.cell { aspect-ratio: 1; display: grid; place-items: center; border-radius: 8px; border: 0; padding: 0; position: relative; }
.edge { background: transparent; }
.floor, .mirror, .stone { background: var(--tint-1); border: 1px solid var(--line); }
.lit { background: color-mix(in srgb, #ffd56a 30%, var(--panel)); box-shadow: 0 0 12px -4px #ffd56a; border-color: color-mix(in srgb, #ffd56a 60%, var(--line)); }
.lens { color: #ffd56a; }
.crystal { color: #9fb8d0; }
.crystal.on { color: #7ad7ff; filter: drop-shadow(0 0 8px #7ad7ff); }
.stone { color: var(--muted); }
.mirror { cursor: pointer; }
.mirror:hover:not(:disabled) { border-color: var(--gold); }
.mirror.fixed { cursor: default; outline: 2px dashed color-mix(in srgb, var(--ok) 60%, transparent); outline-offset: -4px; }
.glass { width: 70%; height: 4px; border-radius: 2px; background: linear-gradient(90deg, #cfe8ff, #ffffff, #cfe8ff); box-shadow: 0 0 6px #a9d8ff; transition: transform 0.2s; }
.glass.up { transform: rotate(-45deg); }
.glass.down { transform: rotate(45deg); }
</style>
