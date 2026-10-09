<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SelectButton from 'primevue/selectbutton'
import CombatSettings from './CombatSettings.vue'
import AbilityPanel from './AbilityPanel.vue'

// Getting ready for a fight, in three tabs; the last one opened is remembered on this device
const STORE = 'aetheria-combat-tab'
const { t } = useI18n()
const tab = ref((() => { try { return localStorage.getItem(STORE) || 'style' } catch { return 'style' } })())
watch(tab, v => { try { localStorage.setItem(STORE, v) } catch { /* storage unavailable */ } })
const tabs = computed(() => [
  { value: 'style', label: t('combat.prep.style'), icon: 'pi pi-bolt' },
  { value: 'supplies', label: t('combat.prep.supplies'), icon: 'pi pi-heart' },
  { value: 'loadouts', label: t('combat.prep.loadouts'), icon: 'pi pi-shield' },
])
</script>

<template>
  <section class="prep">
    <SelectButton v-model="tab" :options="tabs" optionValue="value" :allowEmpty="false" class="prep-tabs">
      <template #option="{ option }"><i :class="option.icon" /> <span>{{ option.label }}</span></template>
    </SelectButton>
    <div v-if="tab === 'style'" class="prep-style">
      <CombatSettings section="style" />
      <AbilityPanel />
    </div>
    <CombatSettings v-else :section="tab" />
  </section>
</template>

<style scoped>
.prep { margin-bottom: 18px; }
.prep-tabs { margin-bottom: 14px; flex-wrap: wrap; }
.prep-tabs i { font-size: 13px; margin-inline-end: 4px; }
.prep-style { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 16px; align-items: start; }
@media (max-width: 1100px) { .prep-style { grid-template-columns: 1fr; } }
</style>
