<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { G, state } from '../game/engine.js'
import { TALENTS, ROLES, TALENT_POINT_EVERY } from '../game/data/character.js'
import GameIcon from './GameIcon.vue'

const { t } = useI18n()
const role = computed(() => ROLES[state.role])
const groups = computed(() => [
  { title: t('talents.roleTitle', { role: role.value.name }), list: TALENTS.filter(x => x.role === state.role), color: role.value.color },
  { title: t('talents.generalTitle'), list: TALENTS.filter(x => !x.role), color: '#e2b65a' },
])
function learn(tal) { if (G.learnTalent(tal.id)) G.toast(tal.icon, 'talents.learned', { name: tal.name, rank: G.talentRank(tal.id), max: tal.max }, 'success') }
</script>

<template>
  <div>
    <div class="row wrap" style="margin-bottom:16px">
      <p class="intro grow" style="margin:0">{{ $t('talents.intro', { every: TALENT_POINT_EVERY }) }}</p>
      <span class="tag arcane">{{ $t('talents.available', { n: G.talentPoints() }) }}</span>
    </div>
    <template v-for="group in groups" :key="group.title">
      <div class="section-title">{{ group.title }}</div>
      <div class="grid-wide">
        <div v-for="tal in group.list" :key="tal.id" class="card talent" :class="{ active: G.talentRank(tal.id) > 0, locked: G.heroLevel() < tal.lvl }" :style="{ '--c': group.color }">
          <div class="row">
            <span class="t-icon"><GameIcon :name="tal.icon" :size="22" /></span>
            <div class="grow">
              <div class="card-name">{{ tal.name }}</div>
              <div class="card-sub">{{ G.talentRank(tal.id) ? tal.desc(tal.per * G.talentRank(tal.id)) : $t('talents.perRank', { effect: tal.desc(tal.per) }) }}</div>
            </div>
          </div>
          <div class="pips"><i v-for="i in tal.max" :key="i" :class="{ on: i <= G.talentRank(tal.id) }" /></div>
          <div class="row">
            <span class="small faint grow">
              <template v-if="G.heroLevel() < tal.lvl"><i class="pi pi-lock" style="font-size:11px" /> {{ $t('talents.requiresHero', { n: tal.lvl }) }}</template>
              <template v-else>{{ $t('talents.rank', { rank: G.talentRank(tal.id), max: tal.max }) }}</template>
            </span>
            <Button :label="G.talentRank(tal.id) >= tal.max ? $t('talents.maxed') : $t('talents.learn')" icon="pi pi-plus" size="small" :disabled="!G.canLearn(tal)" @click="learn(tal)" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.talent { display: flex; flex-direction: column; gap: 12px; }
.t-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); flex-shrink: 0; }
.pips { display: flex; gap: 4px; }
.pips i { flex: 1; height: 5px; border-radius: 5px; background: rgba(255, 255, 255, 0.07); }
.pips i.on { background: var(--c); box-shadow: 0 0 8px color-mix(in srgb, var(--c) 60%, transparent); }
.card.locked { opacity: 0.5; }
</style>
