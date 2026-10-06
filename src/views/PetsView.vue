<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { PETS, petOdds } from '../game/data/pets.js'
import { SKILLS } from '../game/data/skills.js'
import { MONSTERS, BOSSES } from '../game/data/combat.js'
import { fmt, fmtDate } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import { FESTIVAL_MAP } from '../game/data/festivals.js'
import ItemTile from '../components/ItemTile.vue'
import GameIcon from '../components/GameIcon.vue'

const { t } = useI18n()
const owned = computed(() => G.petCount())
const effects = p => Object.entries(p.mods).map(([k, v]) => modText(k, v)).join(' · ')
function sourceText(src) {
  if (src.skill === 'farming') return t('pets.source.harvest')
  if (src.skill) return t('pets.source.skill', { skill: SKILLS[src.skill].name })
  if (src.monster) return t('pets.source.monster', { monster: (MONSTERS[src.monster] || BOSSES.find(b => b.id === src.monster))?.name })
  if (src.slayer) return t('pets.source.slayer')
  if (src.festival) return t('pets.source.festival', { name: FESTIVAL_MAP[src.festival].name })
  return t('pets.source.dice')
}
// Which kind of roll the odds refer to
const oddsKey = src => 'pets.odds.' + (src.skill === 'farming' ? 'harvests' : src.skill ? 'actions' : src.monster ? 'kills' : src.slayer ? 'tasks' : 'games')
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:20px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0">{{ $t('pets.intro') }}</p>
        <span class="tag gold tnum"><GameIcon name="paw-print" :size="13" /> {{ owned }} / {{ PETS.length }}</span>
      </div>
      <div class="bar thick" style="margin-top:14px"><i :style="{ width: (owned / PETS.length) * 100 + '%' }" /></div>
    </div>

    <div class="grid-cards">
      <div v-for="p in PETS" :key="p.id" class="card pet" :class="{ got: G.hasPet(p.id) }" :style="{ '--c': p.tint }">
        <div class="row">
          <div class="pet-tile" :class="{ hidden: !G.hasPet(p.id) }">
            <ItemTile :icon="p.icon" :tint="G.hasPet(p.id) ? p.tint : '#2a2838'" size="lg" :tip="false" />
          </div>
          <div class="grow" style="min-width:0">
            <div class="card-name">{{ G.hasPet(p.id) ? p.name : '???' }}</div>
            <div class="card-sub">{{ sourceText(p.source) }}</div>
          </div>
        </div>
        <p class="small" :class="G.hasPet(p.id) ? 'muted' : 'faint'" style="margin:10px 0 8px">{{ G.hasPet(p.id) ? p.desc : $t('pets.unknown') }}</p>
        <div class="row wrap" style="gap:6px">
          <span class="tag" :class="G.hasPet(p.id) ? 'ok' : ''">{{ effects(p) }}</span>
          <span class="grow" />
          <span v-if="G.hasPet(p.id)" class="small ok-text"><i class="pi pi-check" /> {{ fmtDate(state.pets[p.id]) }}</span>
          <span v-else-if="p.source.festival" class="small faint">{{ $t('pets.festivalOnly') }}</span>
          <span v-else class="small faint" v-tooltip.top="$t('pets.oddsTip')">{{ $t(oddsKey(p.source), { n: fmt(petOdds(p)) }) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pet { display: flex; flex-direction: column; }
.pet.got { border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 0 24px -12px var(--c); }
.pet:not(.got) { opacity: 0.75; }
.pet-tile.hidden :deep(svg) { filter: brightness(0.25); }
</style>
