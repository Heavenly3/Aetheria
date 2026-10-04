<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import { LOCALES, setLocale } from '../i18n/index.js'

defineProps({ inputId: { type: String, default: 'language-select' } })
const { locale } = useI18n()
const options = Object.entries(LOCALES).map(([value, l]) => ({ value, label: l.name }))
const current = computed({ get: () => locale.value, set: v => setLocale(v) })
</script>

<template>
  <Select v-model="current" :options="options" optionLabel="label" optionValue="value" :inputId="inputId" :aria-label="$t('settings.language')" size="small">
    <template #value="{ value }"><i class="pi pi-globe" style="margin-inline-end:6px" />{{ LOCALES[value]?.name }}</template>
  </Select>
</template>
