<script setup>
// A small "?" that explains the setting, number or screen next to it (texts live in the `help` locale section).
// With a mouse it opens on hover; on touch screens it opens on tap and closes when tapping elsewhere.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { help } from '../ui/tips.js'

const p = defineProps({ k: { type: String, required: true }, params: { type: Object, default: () => ({}) } })
const { t, te } = useI18n()
const value = computed(() => help(p.k, p.params))
const label = computed(() => [t(`help.${p.k}.title`, p.params), te(`help.${p.k}.body`) ? t(`help.${p.k}.body`, p.params) : ''].filter(Boolean).join('. '))
const touch = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches
</script>

<template>
  <span v-if="touch" class="help-tip" tabindex="0" role="button" :aria-label="label" v-tooltip.top.focus="value" @click.stop.prevent><i class="pi pi-question-circle" /></span>
  <span v-else class="help-tip" tabindex="0" role="img" :aria-label="label" v-tooltip.top="value"><i class="pi pi-question-circle" /></span>
</template>

<style scoped>
.help-tip { display: inline-flex; align-items: center; color: var(--faint); cursor: help; font-size: 12px; vertical-align: middle; margin-inline-start: 4px; border-radius: 50%; }
.help-tip:hover, .help-tip:focus-visible, .help-tip:focus { color: var(--gold); outline: none; }
</style>
