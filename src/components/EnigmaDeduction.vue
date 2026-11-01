<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G } from '../game/engine.js'
import { AREAS } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'

// Who did it: the clues heard so far, a grid to work them out on, and one accusation
const props = defineProps({ affair: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['answer'])
const { t } = useI18n()
const ctx = computed(() => props.affair.ctx)
const placeName = i => AREAS.find(a => a.id === ctx.value.places[i])?.name || ctx.value.places[i]
const itemName = i => ITEMS[ctx.value.items[i]]?.name.toLowerCase() || ctx.value.items[i]
const who = i => ctx.value.suspects[i]
const clueText = c => t(`affairs.clues.${c.t}`, { who: c.s != null ? who(c.s) : '', place: c.place != null ? placeName(c.place) : '', item: c.item != null ? itemName(c.item) : '' })
const clues = computed(() => (void props.affair.extra?.length, G.affairClues()))
const hidden = computed(() => Math.max(0, props.affair.enigma.clues.length - clues.value.length + (props.affair.extra?.length || 0)))

// The grid of notes is saved with the affair, so it survives a reload
const mark = key => props.affair.notes?.[key] || ''
const cycle = key => G.setAffairNote(key, { '': 'x', x: 'v', v: '' }[mark(key)])
const n = computed(() => props.affair.enigma.n)
</script>

<template>
  <div class="ded">
    <div class="clues">
      <p class="crime">{{ $t('affairs.clues.crime', { place: placeName(affair.enigma.crime.place) }) }}</p>
      <ul>
        <li v-for="(c, i) in clues" :key="i">{{ clueText(c) }}</li>
      </ul>
      <p v-if="hidden" class="small faint">{{ $t('affairs.clues.hidden', { n: hidden }) }}</p>
    </div>

    <p class="small muted">{{ $t('affairs.grid.howTo') }}</p>
    <div class="grids">
      <table v-for="axis in ['places', 'items']" :key="axis" class="grid">
        <caption>{{ $t(`affairs.grid.${axis}`) }}</caption>
        <thead>
          <tr><th /><th v-for="j in n" :key="j" scope="col">{{ axis === 'places' ? placeName(j - 1) : itemName(j - 1) }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in n" :key="s">
            <th scope="row">{{ who(s - 1) }}</th>
            <td v-for="j in n" :key="j">
              <button class="cell" :class="mark(`${axis}:${s - 1}:${j - 1}`)" :aria-label="`${who(s - 1)} · ${axis === 'places' ? placeName(j - 1) : itemName(j - 1)}`"
                @click="cycle(`${axis}:${s - 1}:${j - 1}`)">{{ { x: '✗', v: '✓' }[mark(`${axis}:${s - 1}:${j - 1}`)] || '' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="row wrap accuse">
      <span class="small muted">{{ $t('affairs.grid.accuse') }}:</span>
      <Button v-for="s in n" :key="s" :label="who(s - 1)" size="small" severity="danger" outlined :disabled="disabled"
        :aria-label="$t('affairs.grid.accuseWho', { who: who(s - 1) })" @click="emit('answer', s - 1)" />
    </div>
  </div>
</template>

<style scoped>
.clues { padding: 10px 14px; border-radius: 10px; background: var(--tint-1); border: 1px solid var(--line); }
.crime { margin: 0 0 6px; font-weight: 700; color: color-mix(in srgb, var(--gold) 72%, var(--ink)); }
.clues ul { margin: 0; padding-inline-start: 18px; display: grid; gap: 4px; }
.grids { display: flex; flex-wrap: wrap; gap: 14px; overflow-x: auto; }
.grid { border-collapse: collapse; font-size: 12px; }
.grid caption { text-align: start; font-weight: 700; color: var(--muted); padding-bottom: 4px; }
.grid th { padding: 4px 6px; font-weight: 600; color: var(--ink-2); white-space: nowrap; }
.grid thead th { writing-mode: vertical-rl; transform: rotate(180deg); text-align: start; max-height: 110px; }
.grid td { padding: 2px; }
.cell { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font-size: 15px; font-weight: 800; cursor: pointer; }
.cell.x { color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, var(--panel)); }
.cell.v { color: var(--ok); background: color-mix(in srgb, var(--ok) 14%, var(--panel)); }
.accuse { gap: 6px; margin-top: 12px; }
.accuse :deep(.p-button) { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 55%, transparent); }
</style>
