<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { AVATARS, TINTS } from '../game/data/character.js'
import { TITLES, EXTRA_AVATARS, EXTRA_TINTS, titled } from '../game/data/cosmetics.js'
import { ACHIEVEMENTS } from '../game/data/progression.js'
import { FESTIVAL_MAP } from '../game/data/festivals.js'
import ItemTile from './ItemTile.vue'

const visible = defineModel('visible', { type: Boolean })
const { t } = useI18n()
const tab = ref('title')
const tabs = computed(() => ['title', 'avatar', 'tint'].map(value => ({ value, label: t(`cosmetics.tabs.${value}`) })))

const avatars = computed(() => [...AVATARS.map(id => ({ id })), ...EXTRA_AVATARS])
const tints = computed(() => [...TINTS.map(id => ({ id })), ...EXTRA_TINTS])
// How a locked cosmetic is earned
function hint(c) {
  if (c.ach) return t('cosmetics.fromAch', { name: ACHIEVEMENTS.find(a => a.id === c.ach)?.name || c.ach })
  if (c.festival) return t('cosmetics.fromFestival', { name: FESTIVAL_MAP[c.festival].name })
  return ''
}
const unlockedCount = computed(() => ({
  title: TITLES.filter(x => G.cosmeticUnlocked(x, 'title')).length + '/' + TITLES.length,
  avatar: avatars.value.filter(x => G.avatarUnlocked(x.id)).length + '/' + avatars.value.length,
  tint: tints.value.filter(x => G.tintUnlocked(x.id)).length + '/' + tints.value.length,
}))
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="$t('cosmetics.title')" style="width: min(620px, calc(100vw - 24px))">
    <div class="preview">
      <ItemTile :icon="state.avatar" :tint="state.tint" size="lg" :tip="false" />
      <div class="grow">
        <div class="pv-name">{{ titled(state.name, G.heroTitle()) }}</div>
        <div class="small muted">{{ $t('cosmetics.intro') }}</div>
      </div>
    </div>
    <SelectButton v-model="tab" :options="tabs" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" class="tabs">
      <template #option="{ option }">{{ option.label }} <small class="faint tnum">{{ unlockedCount[option.value] }}</small></template>
    </SelectButton>

    <div v-if="tab === 'title'" class="titles">
      <button class="title-opt" :class="{ on: !G.heroTitle() }" @click="G.setTitle(null)">
        <span class="grow">{{ $t('cosmetics.noTitle') }}</span><i v-if="!G.heroTitle()" class="pi pi-check" />
      </button>
      <button v-for="x in TITLES" :key="x.id" class="title-opt" :class="{ on: G.heroTitle() === x, locked: !G.cosmeticUnlocked(x, 'title') }"
        :disabled="!G.cosmeticUnlocked(x, 'title')" @click="G.setTitle(x.id)">
        <span class="grow">
          <span class="t-name">{{ x.name }}</span>
          <span v-if="!G.cosmeticUnlocked(x, 'title')" class="small faint t-hint"><i class="pi pi-lock" /> {{ hint(x) }}</span>
        </span>
        <i v-if="G.heroTitle() === x" class="pi pi-check" />
      </button>
    </div>

    <div v-else-if="tab === 'avatar'" class="grid avatars">
      <button v-for="a in avatars" :key="a.id" class="pick" :class="{ on: state.avatar === a.id, locked: !G.avatarUnlocked(a.id) }"
        :disabled="!G.avatarUnlocked(a.id)" :aria-label="a.id" v-tooltip.top="G.avatarUnlocked(a.id) ? null : hint(a)" @click="G.setAppearance(a.id)">
        <ItemTile :icon="a.id" :tint="G.avatarUnlocked(a.id) ? state.tint : '#2a2838'" size="md" :tip="false" />
        <i v-if="!G.avatarUnlocked(a.id)" class="pi pi-lock lock" />
      </button>
    </div>

    <div v-else class="grid tints">
      <button v-for="c in tints" :key="c.id" class="swatch" :class="{ on: state.tint === c.id, locked: !G.tintUnlocked(c.id) }" :style="{ background: c.id }"
        :disabled="!G.tintUnlocked(c.id)" :aria-label="c.id" v-tooltip.top="G.tintUnlocked(c.id) ? null : hint(c)" @click="G.setAppearance(null, c.id)">
        <i v-if="!G.tintUnlocked(c.id)" class="pi pi-lock" />
      </button>
    </div>

    <template #footer><Button :label="$t('common.close')" @click="visible = false" /></template>
  </Dialog>
</template>

<style scoped>
.preview { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.pv-name { font-family: var(--font-display); font-size: 21px; line-height: 1.2; }
.tabs { margin-bottom: 14px; }
.titles { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow-y: auto; padding-inline-end: 4px; }
.title-opt { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--tint-1); color: var(--ink); font: inherit; text-align: start; cursor: pointer; }
.title-opt:hover:not(:disabled) { border-color: var(--line-hi); }
.title-opt.on { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); }
.title-opt.on .pi-check { color: var(--gold); }
.title-opt.locked { cursor: default; color: var(--faint); }
.t-name { display: block; font-family: var(--font-display); font-size: 15px; }
.t-hint { display: block; margin-top: 2px; }
.grid { display: grid; gap: 8px; max-height: 50vh; overflow-y: auto; }
.avatars { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }
.pick { position: relative; padding: 4px; border-radius: 14px; border: 2px solid transparent; background: none; cursor: pointer; display: grid; place-items: center; }
.pick.on { border-color: var(--gold); }
.pick.locked { cursor: default; }
.pick.locked :deep(svg) { filter: brightness(0.3); }
.lock { position: absolute; right: 6px; bottom: 6px; font-size: 11px; color: var(--muted); }
.tints { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); }
.swatch { aspect-ratio: 1; border-radius: 50%; border: 2px solid var(--tint-border); cursor: pointer; display: grid; place-items: center; color: #fff; }
.swatch.on { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(226, 182, 90, 0.5); }
.swatch.locked { cursor: default; filter: saturate(0.35) brightness(0.7); }
</style>
