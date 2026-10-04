<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { SKILLS, MAX_LEVEL } from '../game/data/skills.js'
import { PRESTIGE } from '../game/data/progression.js'
import { fmt, pct } from '../game/format.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

const props = defineProps({ skill: { type: String, required: true } })
const { t } = useI18n()
const confirm = useConfirm()
const s = computed(() => SKILLS[props.skill])
const lvl = computed(() => G.level(props.skill))
const prestige = computed(() => G.prestigeOf(props.skill))

function askPrestige() {
  confirm.require({
    header: t('prestige.title', { skill: s.value.name }),
    message: t('prestige.message', {
      lvl: props.skill === 'hitpoints' ? 10 : 1, xp: PRESTIGE.xpPerLevel * 100, speed: PRESTIGE.speedPerLevel * 100, global: PRESTIGE.globalXp * 100,
    }),
    icon: 'pi pi-star',
    acceptLabel: t('prestige.confirm'),
    rejectLabel: t('common.cancel'),
    rejectProps: { severity: 'secondary', outlined: true },
    accept: () => G.doPrestige(props.skill) && G.toast('sparkles', 'prestige.done', { n: G.prestigeOf(props.skill), skill: '@skill:' + props.skill }, 'success'),
  })
}
</script>

<template>
  <div class="banner" :style="{ '--c': s.color }">
    <GameIcon class="banner-ghost" :name="s.icon" :size="230" />
    <ItemTile :icon="s.icon" :tint="s.color" size="xl" :tip="false" />
    <div class="grow">
      <div class="row wrap">
        <h1 class="banner-title">{{ s.name }}</h1>
        <span v-if="prestige" class="stars" v-tooltip.top="$t('prestige.badge', { n: prestige })"><GameIcon v-for="i in Math.min(prestige, 5)" :key="i" name="sparkles" :size="16" /><b v-if="prestige > 5">×{{ prestige }}</b></span>
      </div>
      <div class="banner-desc">{{ s.desc }}</div>
      <div class="bar thick" :style="{ '--c': s.color }"><i :style="{ width: G.levelProgress(skill) * 100 + '%' }" /></div>
      <div class="row wrap small muted tnum" style="margin-top:7px;gap:4px 10px">
        <span class="grow">{{ fmt(state.skills[skill].xp) }} XP</span>
        <span v-if="lvl < MAX_LEVEL">{{ $t('skill.xpToNext', { xp: fmt(G.xpToNext(skill)), level: lvl + 1 }) }}</span>
        <span v-else class="gold-text">{{ $t('skill.maxLevel') }}</span>
      </div>
      <div class="row wrap" style="margin-top:10px">
        <span class="tag gold" v-tooltip.top="$t('skill.xpMultTip')">XP ×{{ G.xpMult(skill).toFixed(2) }}</span>
        <span class="tag arcane" v-tooltip.top="$t('skill.speedTip')">{{ $t('skill.speed') }} ×{{ G.speedFactor(skill).toFixed(2) }}</span>
        <span v-if="skill === 'agility'" class="tag ok">{{ $t('skill.agilityBonus', { v: pct(lvl * 0.002, 1) }) }}</span>
      </div>
    </div>
    <div class="stack" style="align-items:flex-end;text-align:end">
      <div><div class="lvl-label">{{ $t('common.level') }}</div><div class="lvl-big">{{ lvl }}</div></div>
      <Button v-if="G.canPrestige(skill)" :label="$t('prestige.button')" icon="pi pi-star" size="small" @click="askPrestige" />
    </div>
  </div>
</template>
