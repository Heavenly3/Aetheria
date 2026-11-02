<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { fmt } from '../game/format.js'
import CombatSettings from './CombatSettings.vue'
import AbilityPanel from './AbilityPanel.vue'
import CompanyPanel from './CompanyPanel.vue'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

// Getting ready for a fight: one button that sums up the setup and opens it in a window.
// The tab last opened is remembered on this device. Classes given to it go on the button.
defineOptions({ inheritAttrs: false })
const STORE = 'aetheria-prep-tab'
const { t } = useI18n()
const open = ref(false)
const tab = ref((() => { try { return localStorage.getItem(STORE) || 'style' } catch { return 'style' } })())
watch(tab, v => { try { localStorage.setItem(STORE, v) } catch { /* storage unavailable */ } })
const tabs = computed(() => [
  { value: 'style', label: t('prep.tabs.style'), icon: 'pi pi-bolt' },
  { value: 'abilities', label: t('prep.tabs.abilities'), icon: 'pi pi-star' },
  { value: 'supplies', label: t('prep.tabs.supplies'), icon: 'pi pi-heart' },
  { value: 'tactics', label: t('prep.tabs.tactics'), icon: 'pi pi-flag' },
  { value: 'company', label: t('prep.tabs.company'), icon: 'pi pi-users' },
  { value: 'loadouts', label: t('prep.tabs.loadouts'), icon: 'pi pi-shield' },
])

const TYPE_ICONS = { melee: 'crossed-swords', ranged: 'bow-arrow', magic: 'fire-spell-cast' }
const type = computed(() => G.styleType())
const food = computed(() => (void state.inventory, state.food && G.qty(state.food) > 0 ? state.food : null))
const bar = computed(() => (void state.abilities, G.abilityBar(type.value)))
const summary = computed(() => [
  t(`combat.typeNames.${type.value}`),
  food.value ? t('prep.food', { n: fmt(G.qty(food.value)) }) : t('prep.noFood'),
  bar.value.length === 1 ? t('prep.ability') : t('prep.abilities', { n: bar.value.length }),
].join(' · '))
</script>

<template>
  <button v-bind="$attrs" class="prep-btn" type="button" aria-haspopup="dialog" :aria-label="$t('prep.open') + '. ' + summary" @click="open = true">
    <span class="prep-bits">
      <span><GameIcon :name="TYPE_ICONS[type]" :size="15" /></span>
      <span :class="{ off: !food }"><ItemTile v-if="food" :item="food" size="xs" :tip="false" /><GameIcon v-else name="meat" :size="15" /></span>
      <span><GameIcon name="sparkles" :size="15" /></span>
    </span>
    <span class="prep-text">
      <b>{{ $t('prep.title') }}</b>
      <span class="small muted">{{ summary }}</span>
    </span>
    <i class="pi pi-sliders-h muted" />
  </button>

  <Dialog v-model:visible="open" modal dismissableMask :header="$t('prep.title')" :style="{ width: 'min(820px, 96vw)' }" :breakpoints="{ '640px': '100vw' }" class="prep-dialog">
    <SelectButton v-model="tab" :options="tabs" optionLabel="label" optionValue="value" :allowEmpty="false" class="page-tabs prep-tabs" :aria-label="$t('prep.title')">
      <template #option="{ option }"><i :class="option.icon" /> <span>{{ option.label }}</span></template>
    </SelectButton>
    <AbilityPanel v-if="tab === 'abilities'" />
    <CompanyPanel v-else-if="tab === 'company'" />
    <CombatSettings v-else :section="tab" />
  </Dialog>
</template>

<style scoped>
.prep-btn { display: inline-flex; align-items: center; gap: 10px; padding: 7px 12px 7px 8px; border-radius: 14px; border: 1px solid var(--line-hi);
  background: var(--panel); color: var(--ink); font: inherit; cursor: pointer; text-align: start; transition: border-color 0.15s; max-width: 100%; }
.prep-btn:hover { border-color: color-mix(in srgb, var(--gold) 55%, var(--line-hi)); }
.prep-bits { display: flex; gap: 4px; flex-shrink: 0; }
.prep-bits > span { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--gold); background: color-mix(in srgb, var(--gold) 12%, transparent); overflow: hidden; }
.prep-bits > span.off { color: var(--faint); background: var(--tint-1); }
.prep-text { display: grid; min-width: 0; line-height: 1.25; }
.prep-text .small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prep-tabs { width: 100%; }
/* Phones: two rows of three, so every label fits */
@media (max-width: 600px) { .prep-tabs { grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
