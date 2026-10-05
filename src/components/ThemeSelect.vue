<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectButton from 'primevue/selectbutton'
import { THEMES, themePref, setTheme } from '../theme.js'

const { t } = useI18n()
const ICON = { system: 'pi pi-desktop', dark: 'pi pi-moon', light: 'pi pi-sun' }
const options = computed(() => THEMES.map(value => ({ value, icon: ICON[value], label: t('settings.themes.' + value) })))
const current = computed({ get: () => themePref.value, set: v => v && setTheme(v) })
</script>

<template>
  <SelectButton v-model="current" :options="options" optionValue="value" dataKey="value" :allowEmpty="false" size="small" :aria-label="$t('settings.theme')">
    <template #option="{ option }">
      <i :class="option.icon" v-tooltip.top="option.label" /><span class="sr-only">{{ option.label }}</span>
    </template>
  </SelectButton>
</template>
