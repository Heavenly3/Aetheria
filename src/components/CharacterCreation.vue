<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Stepper from 'primevue/stepper'
import StepList from 'primevue/steplist'
import Step from 'primevue/step'
import StepPanels from 'primevue/steppanels'
import StepPanel from 'primevue/steppanel'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { ROLES, DIFFICULTIES, AVATARS, TINTS, ATTRIBUTES, TALENTS, ORIGINS, ROLE_RATINGS, RATING_AXES, STARTER_ROLE, roleCombat } from '../game/data/character.js'
import { SKILLS } from '../game/data/skills.js'
import { rollName } from '../game/data/journal.js'
import { modText } from '../i18n/mods.js'
import GameIcon from './GameIcon.vue'
import ItemTile from './ItemTile.vue'

defineProps({ slotIndex: Number })
const emit = defineEmits(['cancel', 'create'])
const { t } = useI18n()

/* ---------- the steps ---------- */
const STEPS = ['role', 'look', 'difficulty', 'origin', 'begin']
// Each step is a tab of the list: the tab says whether it is the one shown, its wrapper stays plain
const stepPt = v => ({ root: { 'aria-current': undefined }, header: { 'aria-selected': String(step.value === v) } })

/* ---------- choices ---------- */
const role = ref(STARTER_ROLE)
const portraitOf = k => (AVATARS.includes(ROLES[k].icon) ? ROLES[k].icon : AVATARS[0])
const avatar = ref(portraitOf(STARTER_ROLE))
const tint = ref(ROLES[STARTER_ROLE].color)
const name = ref('')
const difficulty = ref('normal')
const origin = ref('wanderer')
// How the game starts: with the guided tutorial, and with the menu found screen by screen
const tutorial = ref(true)
const gradual = ref(true)
const step = ref('1')

const r = computed(() => ROLES[role.value])
const d = computed(() => DIFFICULTIES[difficulty.value])
const o = computed(() => ORIGINS[origin.value])
const validName = computed(() => name.value.trim().length >= 2)
const randomName = () => { name.value = rollName(Math.random, Math.random() < 0.5 ? 'he' : 'she') }
// The class suggests its portrait and colour until the player picks their own
const touched = ref(false)
function pickRole(k) {
  role.value = k
  if (touched.value) return
  avatar.value = portraitOf(k)
  tint.value = ROLES[k].color
}
function create() {
  emit('create', { name: name.value.trim().slice(0, 20), avatar: avatar.value, tint: tint.value, role: role.value, difficulty: difficulty.value, origin: origin.value, tutorial: tutorial.value, gradual: gradual.value })
}

/* ---------- what each choice means ---------- */
const MAX_ATTR = 8
const talentsOf = k => TALENTS.filter(x => x.role === k)
const TOOLS = ['bronze_pickaxe', 'bronze_axe', 'rod']
const kit = computed(() => {
  const items = {}
  r.value.equip.forEach(id => { items[id] = (items[id] || 0) + 1 })
  for (const src of [r.value.items, o.value.items || {}]) for (const [id, q] of Object.entries(src)) items[id] = (items[id] || 0) + q
  TOOLS.forEach(id => { items[id] = 1 })
  return Object.entries(items)
})
// Skills at their start: the class's, raised by the origin
const startSkills = computed(() => {
  const out = { ...r.value.skills }
  for (const [k, l] of Object.entries(o.value.skills || {})) out[k] = Math.max(out[k] || 1, l)
  return Object.entries(out)
})
const gold = computed(() => (r.value.gold || 0) + (o.value.gold || 0))
// Difficulty in plain words, from its real numbers
const pct = v => Math.round(Math.abs(v - 1) * 100)
function diffLines(k) {
  const df = DIFFICULTIES[k]
  const cmp = (v, key, up, down) => (v > 1 ? t(`creation.diff.${key}.${up}`, { n: pct(v) }) : v < 1 ? t(`creation.diff.${key}.${down}`, { n: pct(v) }) : t(`creation.diff.${key}.same`))
  return [
    t(`creation.diff.pace.${k}`),
    cmp(df.monster, 'monsters', 'more', 'less'),
    cmp(df.gold, 'gold', 'more', 'less'),
    df.offline >= 1 ? t('creation.diff.offline.full') : t('creation.diff.offline.part', { n: Math.round(df.offline * 100) }),
    df.death ? t('creation.diff.death.some', { n: Math.round(df.death * 100) }) : t('creation.diff.death.none'),
  ]
}

/* ---------- layout: the class sheet folds away on narrow screens ---------- */
const wide = ref(true)
let mq
const onMq = () => { wide.value = !mq.matches }
onMounted(() => { mq = matchMedia('(max-width: 900px)'); onMq(); mq.addEventListener?.('change', onMq) })
onUnmounted(() => mq?.removeEventListener?.('change', onMq))
</script>

<template>
  <div class="creator">
    <div class="row" style="margin-bottom:18px">
      <div class="grow">
        <h1 class="cc-title">{{ $t('creation.title') }}</h1>
        <div class="muted small">{{ $t('creation.slot', { n: slotIndex + 1 }) }}</div>
      </div>
      <Button :label="$t('common.cancel')" icon="pi pi-times" text severity="secondary" @click="emit('cancel')" />
    </div>

    <div class="cc-layout">
      <!-- The hero as chosen so far -->
      <aside class="preview panel pad" :style="{ '--c': r.color }">
        <div class="pv-head">
          <div class="pv-portrait"><ItemTile :icon="avatar" :tint="tint" :size="wide ? 'xl' : 'lg'" :tip="false" /></div>
          <div class="pv-who">
            <div class="pv-name">{{ name.trim() || $t('creation.unnamed') }}</div>
            <div class="row wrap pv-tags">
              <span class="tag" :style="{ color: r.color }"><GameIcon :name="r.icon" :size="13" /> {{ r.name }}</span>
              <span class="tag"><GameIcon :name="o.icon" :size="13" /> {{ o.name }}</span>
              <span class="tag hue" :style="{ '--hue': d.color }">{{ d.name }}</span>
            </div>
          </div>
        </div>
        <details class="pv-more" :open="wide || undefined">
          <summary>{{ $t('creation.details') }}</summary>
          <div v-for="(a, k) in ATTRIBUTES" :key="k" class="attr-row">
            <GameIcon :name="a.icon" :size="15" :style="{ color: a.color }" />
            <span class="attr-short">{{ a.short }}</span>
            <span class="bar thin grow" :style="{ '--c': a.color }"><i :style="{ width: (r.attrs[k] / MAX_ATTR) * 100 + '%' }" /></span>
            <b class="tnum">{{ r.attrs[k] }}</b>
          </div>
          <div class="section-title" style="margin:16px 0 8px">{{ $t('creation.perks') }}</div>
          <ul class="perks"><li v-for="p in r.perks" :key="p">{{ p }}</li></ul>
          <div class="section-title" style="margin:16px 0 8px">{{ $t('creation.talents') }}</div>
          <div class="row wrap" style="gap:6px">
            <span v-for="tal in talentsOf(role)" :key="tal.id" class="tag" v-tooltip.top="$t('talents.perRank', { effect: modText(tal.mod, tal.per) })"><GameIcon :name="tal.icon" :size="12" /> {{ tal.name }}</span>
          </div>
          <div class="section-title" style="margin:16px 0 8px">{{ $t('creation.startsWith') }}</div>
          <div class="row wrap" style="gap:6px">
            <span v-for="[sk, l] in startSkills" :key="sk" class="tag">{{ SKILLS[sk].name }} {{ l }}</span>
            <span v-if="gold" class="tag gold"><GameIcon name="two-coins" :size="12" /> {{ gold }}</span>
          </div>
          <div class="row wrap" style="gap:6px;margin-top:8px">
            <span v-for="[id, q] in kit" :key="id"><ItemTile :item="id" size="sm" :qty="q > 1 ? q : null" /></span>
          </div>
        </details>
      </aside>

      <Stepper v-model:value="step" linear class="cc-stepper" role="group" :aria-label="$t('creation.title')">
        <StepList role="tablist">
          <Step v-for="(k, i) in STEPS" :key="k" :value="String(i + 1)" :pt="stepPt(String(i + 1))">{{ $t(`creation.steps.${k}`) }}</Step>
        </StepList>
        <StepPanels>
          <!-- 1 · Class -->
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="cards">
              <button v-for="(ro, k) in ROLES" :key="k" class="choice" :class="{ on: role === k }" :style="{ '--c': ro.color }" :aria-pressed="role === k" @click="pickRole(k)">
                <div class="row" style="gap:12px;align-items:flex-start">
                  <ItemTile :icon="ro.icon" :tint="ro.color" size="md" :tip="false" />
                  <div class="grow" style="min-width:0">
                    <div class="row wrap" style="gap:6px"><b class="grow">{{ ro.name }}</b><span v-if="k === STARTER_ROLE" class="tag gold">{{ $t('creation.starter') }}</span></div>
                    <div class="small muted">{{ ro.desc }}</div>
                    <div class="small style-line">{{ $t('creation.styleLabel') }} {{ $t(`creation.styles.${roleCombat(ro)}`) }}</div>
                  </div>
                </div>
                <div class="ratings">
                  <span v-for="ax in RATING_AXES" :key="ax" class="rating">
                    <span class="small muted">{{ $t(`creation.axes.${ax}`) }}</span>
                    <span class="pips" :aria-label="`${ROLE_RATINGS[k][ax]}/3`"><i v-for="n in 3" :key="n" :class="{ on: n <= ROLE_RATINGS[k][ax] }" /></span>
                  </span>
                </div>
              </button>
            </div>
            <div class="cc-nav"><span /><Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('2')" /></div>
          </StepPanel>

          <!-- 2 · Appearance and name -->
          <StepPanel v-slot="{ activateCallback }" value="2">
            <div class="stack">
              <label for="cc-name" class="small muted">{{ $t('creation.name') }}</label>
              <div class="row">
                <InputText id="cc-name" v-model="name" maxlength="20" :placeholder="$t('creation.namePlaceholder')" class="grow" @keyup.enter="validName && activateCallback('3')" />
                <Button icon="pi pi-sync" severity="secondary" outlined :aria-label="$t('creation.randomName')" v-tooltip.top="$t('creation.randomName')" @click="randomName" />
              </div>
              <p class="small faint" style="margin:6px 0 0">{{ $t('creation.lookHint') }}</p>
              <div class="small muted" style="margin-top:8px">{{ $t('creation.portrait') }}</div>
              <div class="avatars">
                <button v-for="a in AVATARS" :key="a" class="av" :class="{ on: avatar === a }" :aria-pressed="avatar === a" :aria-label="$t('creation.portrait') + ' ' + (AVATARS.indexOf(a) + 1)" @click="avatar = a; touched = true">
                  <ItemTile :icon="a" :tint="tint" size="md" :tip="false" />
                </button>
              </div>
              <div class="small muted" style="margin-top:8px">{{ $t('creation.colour') }}</div>
              <div class="row wrap" style="gap:8px">
                <button v-for="(c, i) in TINTS" :key="c" class="swatch" :class="{ on: tint === c }" :style="{ background: c }" :aria-pressed="tint === c" :aria-label="$t('creation.colour') + ' ' + (i + 1)" @click="tint = c; touched = true" />
              </div>
            </div>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('1')" />
              <Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" :disabled="!validName" @click="activateCallback('3')" />
            </div>
          </StepPanel>

          <!-- 3 · Difficulty -->
          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="cards">
              <button v-for="(df, k) in DIFFICULTIES" :key="k" class="choice" :class="{ on: difficulty === k }" :style="{ '--c': df.color }" :aria-pressed="difficulty === k" @click="difficulty = k">
                <div class="row" style="gap:12px;align-items:flex-start">
                  <ItemTile :icon="df.icon" :tint="df.color" size="md" :tip="false" />
                  <div class="grow">
                    <div class="row wrap" style="gap:6px"><b class="grow">{{ df.name }}</b><span v-if="k === 'normal'" class="tag gold">{{ $t('creation.recommended') }}</span></div>
                    <div class="small muted">{{ $t(`creation.diff.for.${k}`) }}</div>
                  </div>
                </div>
                <ul class="facts small">
                  <li v-for="(line, i) in diffLines(k)" :key="i" :class="{ warn: i === 4 && df.death }">{{ line }}</li>
                </ul>
              </button>
            </div>
            <p class="small muted">{{ $t('creation.note', { n: slotIndex + 1 }) }}</p>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('2')" />
              <Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('4')" />
            </div>
          </StepPanel>

          <!-- 4 · Origin -->
          <StepPanel v-slot="{ activateCallback }" value="4">
            <p class="small muted" style="margin-top:0">{{ $t('creation.originIntro') }}</p>
            <div class="cards">
              <button v-for="(or, k) in ORIGINS" :key="k" class="choice" :class="{ on: origin === k }" :style="{ '--c': or.color }" :aria-pressed="origin === k" @click="origin = k">
                <div class="row" style="gap:12px;align-items:flex-start">
                  <ItemTile :icon="or.icon" :tint="or.color" size="md" :tip="false" />
                  <div class="grow">
                    <b>{{ or.name }}</b>
                    <div class="small muted">{{ or.desc }}</div>
                  </div>
                </div>
                <div class="row wrap gives">
                  <template v-if="or.skills || or.items || or.gold">
                    <span class="small muted">{{ $t('creation.originGives') }}</span>
                    <span v-for="(l, sk) in or.skills || {}" :key="sk" class="tag">{{ SKILLS[sk].name }} {{ l }}</span>
                    <span v-if="or.gold" class="tag gold"><GameIcon name="two-coins" :size="12" /> {{ or.gold }}</span>
                    <span v-for="(q, id) in or.items || {}" :key="id"><ItemTile :item="id" size="xs" :qty="q" /></span>
                  </template>
                  <span v-else class="small muted">{{ $t('creation.noBonus') }}</span>
                </div>
              </button>
            </div>
            <blockquote class="memory">“{{ $t(`origins.${origin}.memory`) }}”</blockquote>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('3')" />
              <Button :label="$t('common.next')" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('5')" />
            </div>
          </StepPanel>

          <!-- 5 · Begin -->
          <StepPanel v-slot="{ activateCallback }" value="5">
            <div class="summary">
              <ItemTile :icon="avatar" :tint="tint" size="lg" :tip="false" />
              <div class="grow">
                <div class="pv-name" style="text-align:start">{{ name.trim() }}</div>
                <dl class="sum-rows">
                  <dt>{{ $t('creation.sum.role') }}</dt><dd :style="{ color: r.color }">{{ r.name }}</dd>
                  <dt>{{ $t('creation.sum.origin') }}</dt><dd>{{ o.name }}</dd>
                  <dt>{{ $t('creation.sum.difficulty') }}</dt><dd><span class="hue" :style="{ '--hue': d.color }">{{ d.name }}</span></dd>
                </dl>
              </div>
            </div>
            <p class="small muted">{{ $t('creation.ready') }}</p>
            <div class="start-opts">
              <label class="start-opt" for="cc-tutorial">
                <span class="grow"><b>{{ $t('creation.tutorial') }}</b><span class="small muted">{{ $t('creation.tutorialHint') }}</span></span>
                <ToggleSwitch v-model="tutorial" inputId="cc-tutorial" />
              </label>
              <label class="start-opt" for="cc-gradual">
                <span class="grow"><b>{{ $t('creation.gradual') }}</b><span class="small muted">{{ $t('creation.gradualHint') }}</span></span>
                <ToggleSwitch v-model="gradual" inputId="cc-gradual" />
              </label>
              <p class="small faint" style="margin:0">{{ $t('creation.startLater') }}</p>
            </div>
            <div class="cc-nav">
              <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="activateCallback('4')" />
              <Button :label="$t('creation.begin')" icon="pi pi-play" size="large" @click="create" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>
  </div>
</template>

<style scoped>
.creator { position: relative; z-index: 1; width: 100%; max-width: 1120px; min-width: 0; }
.cc-title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 34px; background: var(--gold-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cc-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: start; }
.cc-layout > .preview { order: 2; }
.cc-stepper { min-width: 0; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; backdrop-filter: blur(14px); }
.cc-stepper :deep(.p-steppanels) { background: transparent; padding: 18px 2px 0; }
.cc-stepper :deep(.p-steppanel) { background: transparent; }
.cc-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; }

.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.choice { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 14px; text-align: start; color: var(--ink); font: inherit; cursor: pointer;
  background: var(--tint-1); border: 1px solid var(--line); transition: border-color 0.18s, background 0.18s; }
.choice:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.choice.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 10%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 40%, transparent); }
.choice b { font-size: 16px; }
.style-line { margin-top: 4px; color: color-mix(in srgb, var(--c) 60%, var(--ink)); font-weight: 600; }
.ratings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; }
.rating { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pips { display: inline-flex; gap: 3px; }
.pips i { width: 14px; height: 6px; border-radius: 3px; background: var(--tint-2); border: 1px solid var(--line); }
.pips i.on { background: var(--c); border-color: transparent; }
.facts { margin: 0; padding-inline-start: 18px; display: grid; gap: 2px; color: var(--ink-2); }
.facts li.warn { color: color-mix(in srgb, var(--danger) 80%, var(--ink)); font-weight: 600; }
.gives { gap: 6px; align-items: center; }
.memory { margin: 16px 0 0; padding: 10px 14px; border-inline-start: 3px solid color-mix(in srgb, var(--gold) 60%, transparent); background: var(--tint-1); border-radius: 0 10px 10px 0; font-style: italic; color: var(--ink-2); }

.avatars { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
.av { padding: 4px; border-radius: 14px; border: 2px solid transparent; background: none; cursor: pointer; display: grid; place-items: center; }
.av.on { border-color: var(--gold); box-shadow: 0 0 18px -4px rgba(226, 182, 90, 0.6); }
.swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--tint-border); cursor: pointer; }
.swatch.on { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(226, 182, 90, 0.5); }

.summary { display: flex; gap: 16px; align-items: center; padding: 14px; border-radius: 14px; background: var(--tint-1); border: 1px solid var(--line); }
.sum-rows { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 6px 0 0; font-size: 14px; }
.sum-rows dt { color: var(--muted); }
.sum-rows dd { margin: 0; font-weight: 700; }
.start-opts { display: flex; flex-direction: column; gap: 8px; margin: 4px 0 6px; }
.start-opt { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--tint-2); cursor: pointer; }
.start-opt b, .start-opt .small { display: block; }

.preview { position: sticky; top: 20px; }
.pv-portrait { display: grid; place-items: center; margin-bottom: 10px; }
.pv-name { text-align: center; font-family: var(--font-display); font-size: 24px; margin-bottom: 8px; overflow-wrap: anywhere; }
.pv-tags { justify-content: center; gap: 6px; margin-bottom: 14px; }
.pv-more summary { display: none; }
.attr-row { display: flex; align-items: center; gap: 8px; margin: 7px 0; font-size: 13px; }
.attr-short { width: 32px; color: var(--muted); font-weight: 700; }
.perks { margin: 0; padding-inline-start: 18px; color: var(--muted); font-size: 14px; line-height: 1.6; }

@media (max-width: 900px) {
  .cc-layout { grid-template-columns: minmax(0, 1fr); }
  .cc-layout > .preview { order: 0; position: sticky; top: 0; z-index: 3; padding: 10px 14px; }
  .pv-head { display: flex; align-items: center; gap: 12px; }
  .pv-portrait { margin: 0; }
  .pv-name { text-align: start; font-size: 20px; margin-bottom: 4px; }
  .pv-tags { justify-content: flex-start; margin-bottom: 0; }
  .pv-more summary { display: list-item; margin-top: 8px; font-size: 13px; color: var(--gold); cursor: pointer; }
  .cards { grid-template-columns: minmax(0, 1fr); }
  .avatars { grid-template-columns: repeat(4, 1fr); }
}
/* Phones: the steps shrink to their numbers, the current one keeps its name */
@media (max-width: 600px) {
  .cc-title { font-size: 28px; }
  .cc-stepper { padding: 14px 12px; }
  .cc-stepper :deep(.p-steplist) { gap: 6px; justify-content: space-between; }
  .cc-stepper :deep(.p-step:not(.p-step-active) .p-step-title) { display: none; }
  .cc-stepper :deep(.p-stepper-separator) { display: none; }
  .cc-stepper :deep(.p-step-header) { padding: 0; gap: 6px; }
  .cc-stepper :deep(.p-step) { flex: 0 0 auto; }
  .cc-stepper :deep(.p-steppanels) { padding-top: 14px; }
  .avatars { gap: 6px; }
  .av { padding: 2px; }
  .choice { padding: 12px; }
  .summary { flex-direction: column; text-align: center; }
  .sum-rows { justify-content: center; }
}
</style>
