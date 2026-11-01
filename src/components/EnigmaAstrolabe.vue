<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { RING_FACES, astrolabeSolved } from '../game/data/enigmas.js'
import { play } from '../game/sound.js'
import GameIcon from './GameIcon.vue'

// The old astrolabe: rings of constellations turned under a fixed pointer; linked rings drag the next ones
const props = defineProps({ affair: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['answer'])
const { t } = useI18n()
const STAR_ICONS = { wolf: 'wolf-head', crown: 'crown', eye: 'all-seeing-eye', serpent: 'snake', tower: 'stone-tower', flame: 'flame', raven: 'raven', anvil: 'anvil-impact' }
const e = computed(() => props.affair.enigma)
// Two faces either side of the pointer
const faces = i => [-2, -1, 0, 1, 2].map(o => e.value.rings[i][(e.value.at[i] + o + RING_FACES) % RING_FACES])
const known = computed(() => G.affairStarsKnown())
const solved = computed(() => (void e.value.at.join(), astrolabeSolved(e.value)))
const starName = s => t(`affairs.stars.names.${s}`)
function turn(i, dir) { if (G.affairTurnRing(i, dir)) play('coin') }
</script>

<template>
  <div class="astro">
    <ul class="targets small">
      <li v-for="(s, i) in known" :key="i" :class="{ faint: !s }">{{ s ? $t('affairs.stars.known', { n: i + 1, star: starName(s) }) : $t('affairs.stars.unknown', { n: i + 1 }) }}</li>
    </ul>
    <p v-if="e.drag" class="small muted">{{ $t(`affairs.stars.drag${Math.min(2, e.drag)}`) }}</p>

    <div class="rings">
      <div v-for="(ring, i) in e.rings" :key="i" class="ring" :class="{ right: known[i] && faces(i)[2] === known[i] }">
        <span class="ring-n small muted">{{ $t('affairs.stars.ring', { n: i + 1 }) }}</span>
        <Button icon="pi pi-chevron-left" size="small" text :disabled="disabled" :aria-label="$t('affairs.stars.ring', { n: i + 1 }) + ' ←'" @click="turn(i, -1)" />
        <div class="faces">
          <span v-for="(s, k) in faces(i)" :key="k" class="face" :class="{ pointer: k === 2 }" :title="starName(s)">
            <GameIcon :name="STAR_ICONS[s]" :size="k === 2 ? 26 : 18" />
          </span>
        </div>
        <Button icon="pi pi-chevron-right" size="small" text :disabled="disabled" :aria-label="$t('affairs.stars.ring', { n: i + 1 }) + ' →'" @click="turn(i, 1)" />
      </div>
    </div>

    <div class="row" style="margin-top:12px;gap:10px">
      <span class="small muted grow tnum">{{ $t('affairs.stars.turns', { n: e.turns || 0 }) }}</span>
      <Button :label="$t('affairs.stars.settle')" icon="pi pi-compass" size="small" :disabled="disabled || !solved" @click="emit('answer', true)" />
    </div>
  </div>
</template>

<style scoped>
.targets { margin: 0 0 8px; padding-inline-start: 18px; display: grid; gap: 2px; color: var(--ink-2); }
.rings { display: grid; gap: 8px; }
.ring { display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-radius: 999px; border: 1px solid var(--line); background: radial-gradient(circle at 50%, color-mix(in srgb, #a98bff 10%, var(--panel)), var(--panel)); }
.ring.right { border-color: color-mix(in srgb, var(--ok) 60%, var(--line)); }
.ring-n { width: 64px; flex-shrink: 0; }
.faces { flex: 1; display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; justify-items: center; }
.face { color: var(--muted); opacity: 0.6; display: grid; place-items: center; }
.face.pointer { color: #a98bff; opacity: 1; width: 42px; height: 42px; border-radius: 50%; border: 2px solid color-mix(in srgb, #a98bff 60%, transparent); box-shadow: 0 0 12px -4px #a98bff; }
.ring.right .face.pointer { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 60%, transparent); }
@media (max-width: 520px) { .ring-n { display: none; } }
</style>
