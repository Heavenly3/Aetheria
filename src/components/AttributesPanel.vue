<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { ATTRIBUTES, POINTS_PER_LEVEL, HERO_MAX_LEVEL, TALENT_POINT_EVERY } from '../game/data/character.js'
import { fmt } from '../game/format.js'
import { modText } from '../i18n/mods.js'
import GameIcon from './GameIcon.vue'

const { t } = useI18n()
const confirm = useConfirm()
const points = computed(() => G.attrPoints())
const effects = k => Object.entries(ATTRIBUTES[k].mods).map(([m, per]) => modText(m, per * G.attr(k)))
function respec() {
  confirm.require({
    header: t('attributes.respecTitle'),
    message: t('attributes.respecMessage', { cost: fmt(G.respecCost()) }),
    icon: 'pi pi-refresh', acceptLabel: t('attributes.respecConfirm'), rejectLabel: t('common.cancel'), rejectProps: { severity: 'secondary', outlined: true },
    accept: () => (G.respec() ? G.toast('brain', 'attributes.respecDone', {}, 'success') : G.toast('two-coins', 'common.notEnoughGold', {}, 'warn')),
  })
}
</script>

<template>
  <div>
    <div class="panel pad hero-lvl">
      <div class="row wrap">
        <div class="grow">
          <div class="lvl-label">{{ $t('hero.heroLevel') }}</div>
          <div class="row" style="align-items:baseline;gap:12px"><span class="lvl-big">{{ G.heroLevel() }}</span><span class="muted">/ {{ HERO_MAX_LEVEL }}</span></div>
        </div>
        <div class="stack" style="gap:6px;align-items:flex-end">
          <span class="tag gold">{{ $t('attributes.points', { n: points }) }}</span>
          <span class="tag arcane">{{ $t('talents.points', { n: G.talentPoints() }) }}</span>
        </div>
      </div>
      <div class="bar thick" style="margin-top:14px"><i :style="{ width: G.heroProgress() * 100 + '%' }" /></div>
      <div class="row small muted tnum" style="margin-top:6px">
        <span class="grow">{{ $t('attributes.heroXp', { xp: fmt(state.hero.xp) }) }}</span>
        <span>{{ $t('attributes.toNext', { xp: fmt(G.heroXpToNext()), level: G.heroLevel() + 1 }) }}</span>
      </div>
      <p class="small faint" style="margin-bottom:0">{{ $t('attributes.explain', { points: POINTS_PER_LEVEL, every: TALENT_POINT_EVERY }) }}</p>
    </div>

    <div class="attrs">
      <div v-for="(a, k) in ATTRIBUTES" :key="k" class="card attr" :style="{ '--c': a.color }">
        <div class="row">
          <span class="attr-icon"><GameIcon :name="a.icon" :size="24" /></span>
          <div class="grow">
            <div class="card-name">{{ a.name }} <span class="faint small">{{ a.short }}</span></div>
            <div class="card-sub">{{ a.desc }}</div>
          </div>
          <div class="attr-val tnum">{{ G.attr(k) }}</div>
        </div>
        <ul class="effects"><li v-for="e in effects(k)" :key="e">{{ e }}</li></ul>
        <div class="row">
          <span class="small faint grow">{{ $t('attributes.base', { base: G.attr(k) - state.hero.attrs[k], spent: state.hero.attrs[k] }) }}</span>
          <Button icon="pi pi-plus" size="small" rounded :disabled="points <= 0" :aria-label="$t('attributes.addPoint')" @click="G.allocate(k)" />
          <Button label="+5" size="small" severity="secondary" outlined :disabled="points < 5" @click="G.allocate(k, 5)" />
        </div>
      </div>
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:16px">
      <Button :label="$t('attributes.respecButton', { cost: fmt(G.respecCost()) })" icon="pi pi-refresh" severity="secondary" outlined size="small" @click="respec" />
    </div>
  </div>
</template>

<style scoped>
.hero-lvl { margin-bottom: 18px; }
.attrs { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.attr { display: flex; flex-direction: column; gap: 10px; }
.attr-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); }
.attr-val { font-family: var(--font); font-weight: 800; font-size: 30px; color: var(--c); }
.effects { margin: 0; padding-inline-start: 18px; font-size: 13px; color: var(--muted); line-height: 1.55; }
</style>
