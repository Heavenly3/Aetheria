<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { state } from '../game/engine.js'
import { play } from '../game/sound.js'
import { STEPS, currentStep, stepProgress, checkTutorial, skipTutorial } from '../game/tutorial.js'
import GameIcon from './GameIcon.vue'

const { t } = useI18n()
const route = useRoute()
const confirm = useConfirm()
const step = computed(() => currentStep())
const progress = computed(() => stepProgress(step.value))
const collapsed = ref(false)

// Highlight the visible targets of the current step; the DOM changes as views load, so this re-runs on a timer
let marked = []
function highlight() {
  marked.forEach(el => el.classList.remove('tut-target'))
  marked = []
  if (!step.value || collapsed.value) return
  for (const key of step.value.targets || []) {
    const found = [...document.querySelectorAll(`[data-tut="${key}"]`)].filter(el => el.offsetParent !== null || el.getClientRects().length)
    if (found.length) { marked = found.slice(0, 1); break }
  }
  marked.forEach(el => el.classList.add('tut-target'))
}

function check() {
  if (checkTutorial(route.path)) { play('quest'); collapsed.value = false }
  highlight()
}

let timer
onMounted(() => { timer = setInterval(check, 400); nextTick(check) })
onUnmounted(() => { clearInterval(timer); marked.forEach(el => el.classList.remove('tut-target')) })
watch(() => route.path, () => nextTick(check))

function skip() {
  confirm.require({
    header: t('tutorial.skipTitle'),
    message: t('tutorial.skipMessage'),
    icon: 'pi pi-question-circle',
    acceptLabel: t('tutorial.skip'), rejectLabel: t('tutorial.keep'),
    rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { skipTutorial(); highlight() },
  })
}
</script>

<template>
  <transition name="coach">
    <aside v-if="step" class="coach" :class="{ collapsed }" role="status" aria-live="polite">
      <span class="coach-icon"><GameIcon :name="step.icon" :size="24" /></span>
      <div class="grow">
        <div class="coach-head">
          <span class="coach-count">{{ $t('tutorial.step', { n: state.tutorial.step + 1, total: STEPS.length }) }}</span>
          <b class="coach-title">{{ $t(`tutorial.steps.${step.id}.title`) }}</b>
        </div>
        <template v-if="!collapsed">
          <p class="coach-text" v-html="$t(`tutorial.steps.${step.id}.text`)" />
          <div v-if="step.goal" class="row" style="gap:10px">
            <span class="bar grow"><i :style="{ width: (progress / step.goal) * 100 + '%' }" /></span>
            <span class="small tnum muted">{{ progress }}/{{ step.goal }}</span>
          </div>
        </template>
        <div class="coach-dots" aria-hidden="true"><i v-for="(s, i) in STEPS" :key="s.id" :class="{ on: i < state.tutorial.step, now: i === state.tutorial.step }" /></div>
      </div>
      <div class="coach-actions">
        <Button :icon="collapsed ? 'pi pi-angle-down' : 'pi pi-angle-up'" text rounded size="small" :aria-label="$t(collapsed ? 'tutorial.expand' : 'tutorial.collapse')" @click="collapsed = !collapsed; highlight()" />
        <Button icon="pi pi-times" text rounded size="small" severity="secondary" :aria-label="$t('tutorial.skip')" v-tooltip.left="$t('tutorial.skip')" @click="skip" />
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.coach { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; padding: 14px 10px 12px 14px; border-radius: var(--radius);
  background: linear-gradient(120deg, color-mix(in srgb, var(--gold) 16%, transparent), var(--panel) 55%); border: 1px solid var(--line-hi); box-shadow: var(--shadow); }
.coach-icon { width: 46px; height: 46px; flex-shrink: 0; display: grid; place-items: center; border-radius: 13px; background: var(--gold-grad); color: var(--on-gold); }
.coach-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; }
.coach-count { font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.coach-title { font-family: var(--font-display); font-weight: 400; font-size: 18px; letter-spacing: 0.03em; }
.coach-text { margin: 4px 0 10px; color: var(--ink-2); max-width: 70ch; }
.coach-text :deep(b) { color: var(--gold-hi); }
.coach-dots { display: flex; gap: 4px; margin-top: 10px; }
.coach-dots i { width: 14px; height: 4px; border-radius: 2px; background: var(--tint-3); }
.coach-dots i.on { background: var(--gold-lo); }
.coach-dots i.now { background: var(--gold); }
.coach.collapsed .coach-dots { margin-top: 6px; }
.coach-actions { display: flex; flex-direction: column; margin-top: -4px; }
.coach-enter-active, .coach-leave-active { transition: opacity 0.3s, transform 0.3s; }
.coach-enter-from, .coach-leave-to { opacity: 0; transform: translateY(-8px); }
@media (max-width: 600px) {
  .coach { gap: 10px; padding: 12px 6px 10px 12px; }
  .coach-icon { width: 38px; height: 38px; }
  .coach-title { font-size: 16px; }
}
</style>
