<script setup>
import { computed } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { ABILITY_MAP, ABILITY_SKILL, BAR_SIZE } from '../game/data/fighting.js'
import { abilityText } from '../ui/abilities.js'
import { SKILLS } from '../game/data/skills.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'
import HelpTip from './HelpTip.vue'

const type = computed(() => G.styleType())
const list = computed(() => G.abilitiesFor(type.value))
const bar = computed(() => (void state.abilities, G.abilityBar(type.value)))
const skill = computed(() => SKILLS[ABILITY_SKILL[type.value]])
const slots = computed(() => Array.from({ length: BAR_SIZE }, (_, i) => bar.value[i] || null))

function toggle(a) {
  if (!G.abilityUnlocked(a, type.value)) return
  if (!G.toggleAbility(a.id)) G.toast(a.icon, 'abilities.barFull', { n: BAR_SIZE }, 'warn')
}
</script>

<template>
  <div class="panel pad">
    <div class="row wrap" style="gap:10px">
      <h3 class="panel-title grow" style="margin:0"><GameIcon name="sparkles" /> {{ $t('abilities.title') }} <HelpTip k="sections.abilities" /></h3>
      <label class="row small muted" style="gap:8px;cursor:pointer" for="ab-auto">{{ $t('abilities.auto') }} <ToggleSwitch v-model="state.abilities.auto" inputId="ab-auto" /></label>
    </div>
    <p class="small muted" style="margin:8px 0 12px">{{ $t('abilities.intro', { style: $t(`combat.types.${type}`), skill: skill.name }) }}</p>

    <!-- The bar: left to right is the order they are tried in -->
    <div class="bar-slots">
      <div v-for="(id, i) in slots" :key="i" class="slot" :class="{ empty: !id }">
        <template v-if="id">
          <ItemTile :icon="ABILITY_MAP[id].icon" tint="#6a4fbf" size="sm" :tip="false" />
          <span class="grow slot-name">{{ $t(`abilities.list.${id}`) }}</span>
          <button class="mini" :disabled="i === 0" :aria-label="$t('abilities.left')" @click="G.moveAbility(id, -1)"><i class="pi pi-angle-left" /></button>
          <button class="mini" :disabled="i === bar.length - 1" :aria-label="$t('abilities.right')" @click="G.moveAbility(id, 1)"><i class="pi pi-angle-right" /></button>
          <button class="mini" :aria-label="$t('abilities.remove')" @click="G.toggleAbility(id)"><i class="pi pi-times" /></button>
        </template>
        <span v-else class="small faint">{{ $t('abilities.emptySlot', { n: i + 1 }) }}</span>
      </div>
    </div>

    <div class="ab-grid">
      <button v-for="a in list" :key="a.id" class="ab" :class="{ on: bar.includes(a.id), locked: !G.abilityUnlocked(a, type) }" @click="toggle(a)">
        <ItemTile :icon="G.abilityUnlocked(a, type) ? a.icon : 'padlock'" :tint="G.abilityUnlocked(a, type) ? '#6a4fbf' : '#2a2838'" size="sm" :tip="false" />
        <span class="grow" style="min-width:0">
          <span class="ab-name">{{ $t(`abilities.list.${a.id}`) }}</span>
          <span class="ab-desc">{{ abilityText(a) }}</span>
          <span class="ab-meta">
            <span v-if="!G.abilityUnlocked(a, type)" class="bad-text">{{ $t('abilities.unlocks', { skill: skill.name, lvl: a.lvl }) }}</span>
            <template v-else><GameIcon name="sparkles" :size="11" /> {{ a.cost }} · <i class="pi pi-clock" style="font-size:10px" /> {{ a.cd }} s</template>
          </span>
        </span>
        <i v-if="bar.includes(a.id)" class="pi pi-check ok-text" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.bar-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.slot { display: flex; align-items: center; gap: 6px; min-height: 46px; padding: 6px 8px; border-radius: 12px; border: 1px solid var(--line-hi); background: var(--tint-1); }
.slot.empty { border-style: dashed; border-color: var(--line); justify-content: center; }
.slot-name { font-size: 13px; font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini { background: none; border: 0; color: var(--muted); padding: 2px 3px; cursor: pointer; }
.mini:disabled { opacity: 0.3; cursor: default; }
.mini:not(:disabled):hover { color: var(--ink); }
.ab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; }
.ab { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); color: inherit; font: inherit; text-align: start; cursor: pointer; }
.ab:hover:not(.locked) { border-color: var(--line-hi); }
.ab.on { border-color: color-mix(in srgb, var(--ok) 50%, transparent); background: color-mix(in srgb, var(--ok) 6%, var(--panel)); }
.ab.locked { opacity: 0.55; cursor: default; }
.ab-name { display: block; font-weight: 700; font-size: 14px; }
.ab-desc { display: block; font-size: 12px; color: var(--ink-2); line-height: 1.4; margin-top: 2px; }
.ab-meta { display: block; font-size: 11.5px; color: var(--muted); margin-top: 3px; }
@media (max-width: 640px) { .bar-slots { grid-template-columns: 1fr; } }
</style>
