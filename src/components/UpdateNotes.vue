<script setup>
import { useI18n } from 'vue-i18n'
import { SECTIONS } from '../game/data/changelog.js'

// The changes of one update, grouped into new / changed / fixed
const props = defineProps({ entry: { type: Object, required: true } })
const { t } = useI18n()
const lines = s => t(`changelog.entries.${props.entry.id}.${s}`).split('\n')
const shown = () => SECTIONS.filter(s => props.entry.sections.includes(s))
</script>

<template>
  <div class="notes">
    <div v-for="s in shown()" :key="s" class="notes-sec">
      <span class="tag" :class="'n-' + s">{{ $t(`changelog.sections.${s}`) }}</span>
      <ul>
        <li v-for="(l, i) in lines(s)" :key="i">{{ l }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.notes-sec { margin-top: 10px; }
.notes-sec:first-child { margin-top: 0; }
.notes ul { margin: 8px 0 0; padding-inline-start: 20px; }
.notes li { margin: 0 0 6px; line-height: 1.5; color: var(--ink-2); }
.notes li::marker { color: var(--gold); }
.tag.n-new { color: var(--tag-ok); border-color: color-mix(in srgb, var(--ok) 45%, transparent); }
.tag.n-changed { color: var(--gold-hi); border-color: color-mix(in srgb, var(--gold) 45%, transparent); }
.tag.n-fixed { color: var(--tag-arcane); border-color: color-mix(in srgb, var(--arcane) 45%, transparent); }
</style>
