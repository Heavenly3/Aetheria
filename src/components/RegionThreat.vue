<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { G, state } from '../game/engine.js'
import { THREAT_EFFECT, CLEANSE, threatLevel, threatShare } from '../game/data/realm.js'
import { tip } from '../ui/tips.js'
import { throttled } from '../ui/throttled.js'

// How troubled a region is, and what that does to its fights
const props = defineProps({ area: { type: String, required: true } })
const { t } = useI18n()
// Threat drifts slowly, so a refresh every couple of seconds is plenty
const value = throttled(() => (void state.lastTick, void state.realm, G.threatOf(props.area)), 2000)
const level = computed(() => threatLevel(value.value))
const share = computed(() => threatShare(value.value))
const overrun = computed(() => !!state.realm?.regions?.[props.area]?.overrun)
const hint = () => {
  const s = share.value, lines = [{ text: t('realm.value', { n: Math.round(value.value) }), kind: 'muted' }]
  if (s > 0) {
    lines.push({ text: t('realm.effects.monster', { v: Math.round(s * THREAT_EFFECT.monster * 100) }), kind: 'bad' })
    lines.push({ text: t('realm.effects.loot', { v: Math.round(s * THREAT_EFFECT.loot * 100), g: Math.round(s * THREAT_EFFECT.gold * 100) }), kind: 'ok' })
    lines.push({ text: t('realm.effects.elite', { v: +(s * THREAT_EFFECT.elite * 100).toFixed(1) }), kind: 'ok' })
  }
  if (overrun.value) lines.push({ text: t('realm.bounty', { n: CLEANSE.to }), kind: 'gold' })
  return tip(t(`realm.levels.${level.value.id}.name`), t(`realm.levels.${level.value.id}.desc`), lines)
}
</script>

<template>
  <span class="threat" :style="{ '--c': level.color }" v-tooltip.top="hint">
    <span class="lbl">{{ $t(`realm.levels.${level.id}.name`) }}</span>
    <span class="bar thin meter"><i :style="{ width: Math.min(100, value) + '%' }" /></span>
  </span>
</template>

<style scoped>
.threat { display: inline-flex; align-items: center; gap: 8px; padding: 3px 10px; border-radius: 999px; cursor: help; font-size: 12px; font-weight: 700;
  color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); }
:root[data-theme="light"] .threat { color: color-mix(in srgb, var(--c) 45%, #1d1a14); }
.meter { width: 60px; }
.meter > i { background: var(--c); }
</style>
