<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import { G, state } from '../game/engine.js'
import { CONDITIONS, ACTIONS_LIST, MAX_RULES, TEMPLATES, SLAYER_KINDS } from '../game/data/routines.js'
import { ACTIONS, findAction } from '../game/data/actions.js'
import { AREAS, MONSTERS } from '../game/data/combat.js'
import { ITEMS } from '../game/data/items.js'
import { WEATHERS } from '../game/data/weather.js'
import { SKILLS } from '../game/data/skills.js'
import { fmtTime } from '../game/format.js'
import GameIcon from '../components/GameIcon.vue'

const { t } = useI18n()
const now = ref(Date.now())
let timer
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onUnmounted(() => clearInterval(timer))

const r = computed(() => (G.ensureRoutines(), state.routines))
const rules = computed(() => r.value.rules)

/* ---------- options for every picker ---------- */
const whenOpts = computed(() => Object.keys(CONDITIONS).map(k => ({ value: k, label: t(`routines.whenNames.${k}`) })))
const thenOpts = computed(() => Object.keys(ACTIONS_LIST).map(k => ({ value: k, label: t(`routines.thenNames.${k}`) })))
const itemOpts = computed(() => Object.values(ITEMS).filter(it => !it.festival || G.qty(it.id) > 0)
  .map(it => ({ value: it.id, label: it.name })).sort((a, b) => a.label.localeCompare(b.label)))
const weatherOpts = computed(() => WEATHERS.map(w => ({ value: w.id, label: t(`weather.${w.id}.name`) })))
const skillOpts = computed(() => Object.keys(ACTIONS).filter(k => ACTIONS[k]?.length).map(k => ({ value: k, label: SKILLS[k].name })))
const actionOpts = skill => (ACTIONS[skill] || []).map(a => ({ value: a.id, label: `${a.name} · ${t('common.lvlShort', { n: a.lvl })}`, disabled: G.level(skill) < a.lvl }))
const monsterOpts = computed(() => AREAS.flatMap(a => a.monsters.map(m => ({ value: m.id, label: `${a.name} · ${m.name}` }))))
const kindOpts = computed(() => SLAYER_KINDS.map(k => ({ value: k, label: t(`slayer.kinds.${k}`) })))

/* ---------- editing ---------- */
const defaults = {
  itemBelow: { item: 'shrimp', n: 20 }, itemAtLeast: { item: 'oak_logs', n: 100 }, weather: { weather: 'rain' }, patrons: { n: 1 },
  skill: { skill: 'mining', action: ACTIONS.mining[0].id }, fight: { monster: 'chicken' }, sell: { item: 'bones', n: 0 }, slayerTask: { kind: 'standard' },
}
function setWhen(rule, type) { rule.when = { type, ...(defaults[type] || {}) } }
function setThen(rule, type) { rule.then = { type, ...(defaults[type] || {}) } }
function setSkill(rule, skill) { rule.then.skill = skill; rule.then.action = (ACTIONS[skill] || []).find(a => G.level(skill) >= a.lvl)?.id || ACTIONS[skill][0].id }
function addRule() { G.addRule({ when: { type: 'idle' }, then: { type: 'skill', ...defaults.skill } }) }
const canTemplate = id => rules.value.length < MAX_RULES && !!G.ruleTemplate(id)

/* ---------- live state and the log ---------- */
function status(rule) {
  void now.value
  if (!rule.on || !r.value.on) return null
  let holds = false
  try { holds = G.ruleHolds(rule.when) } catch { holds = false }
  if (!holds) return null
  if (ACTIONS_LIST[rule.then.type].activity && G.ruleTarget(rule.then) === null) return 'blocked'
  return 'holds'
}
function sentence(e) {
  const w = e.when, d = e.then
  const item = id => ITEMS[id]?.name || id
  const whenText = t(`routines.when.${w.type}`, { item: item(w.item), n: w.n ?? 0, weather: w.weather ? t(`weather.${w.weather}.name`) : '' })
  const params = {
    action: d.type === 'skill' ? findAction(d.skill, d.action)?.name || d.action : '',
    monster: MONSTERS[d.monster]?.name || '', item: item(d.item), n: d.n ?? 0, kind: d.kind ? t(`slayer.kinds.${d.kind}`) : '',
  }
  return `${whenText} → ${t(`routines.then.${d.type}`, params)}`
}
const ago = at => t('routines.ago', { time: fmtTime(Math.max(1, (now.value - at) / 1000)) })
</script>

<template>
  <div>
    <div class="panel pad">
      <div class="row wrap" style="gap:12px">
        <div class="grow" style="min-width:240px">
          <h3 class="panel-title" style="margin:0"><GameIcon name="gears" /> {{ $t('routines.title') }}</h3>
          <p class="small muted" style="margin:6px 0 0">{{ $t('routines.intro') }}</p>
          <p class="small faint" style="margin:6px 0 0">{{ $t('routines.openOnly') }}</p>
        </div>
        <label class="row small" for="routines-on" style="gap:8px;cursor:pointer"><b>{{ $t('routines.on') }}</b> <ToggleSwitch v-model="state.routines.on" inputId="routines-on" /></label>
      </div>
      <div class="section-title sm">{{ $t('routines.templates') }}</div>
      <div class="row wrap" style="gap:6px">
        <Button v-for="id in TEMPLATES" :key="id" :label="$t(`routines.templatesList.${id}`)" icon="pi pi-plus" size="small" severity="secondary" outlined :disabled="!canTemplate(id)" @click="G.addTemplate(id)" />
      </div>
    </div>

    <div class="row" style="margin:20px 0 10px">
      <div class="section-title grow" style="margin:0">{{ $t('routines.count', { n: rules.length, max: MAX_RULES }) }}</div>
      <Button :label="$t('routines.add')" icon="pi pi-plus" size="small" :disabled="rules.length >= MAX_RULES" @click="addRule" />
    </div>
    <div v-if="!rules.length" class="panel pad small muted">{{ $t('routines.empty') }}</div>

    <div class="rules">
      <div v-for="(rule, i) in rules" :key="rule.id" class="rule" :class="{ off: !rule.on || !state.routines.on, [status(rule) || '']: true }">
        <div class="rule-head">
          <span class="n">{{ i + 1 }}</span>
          <ToggleSwitch v-model="rule.on" :aria-label="$t('routines.on')" />
          <span v-if="status(rule) === 'holds'" class="tag ok small">{{ $t('routines.holdsNow') }}</span>
          <span v-else-if="status(rule) === 'blocked'" class="tag bad small">{{ $t('routines.blocked') }}</span>
          <span class="grow" />
          <span class="small faint">{{ rule.last ? $t('routines.lastRun', { time: ago(rule.last) }) : $t('routines.never') }}</span>
          <button class="mini" :disabled="i === 0" :aria-label="$t('routines.up')" v-tooltip.top="$t('routines.up')" @click="G.moveRule(rule.id, -1)"><i class="pi pi-arrow-up" /></button>
          <button class="mini" :disabled="i === rules.length - 1" :aria-label="$t('routines.down')" v-tooltip.top="$t('routines.down')" @click="G.moveRule(rule.id, 1)"><i class="pi pi-arrow-down" /></button>
          <button class="mini" :aria-label="$t('routines.remove')" v-tooltip.top="$t('routines.remove')" @click="G.removeRule(rule.id)"><i class="pi pi-trash" /></button>
        </div>
        <div class="rule-body">
          <!-- When -->
          <div class="part">
            <span class="word">{{ $t('routines.if') }}</span>
            <Select :modelValue="rule.when.type" :options="whenOpts" optionLabel="label" optionValue="value" size="small" class="pick" @update:modelValue="v => setWhen(rule, v)" />
            <Select v-if="CONDITIONS[rule.when.type].params.includes('item')" v-model="rule.when.item" :options="itemOpts" optionLabel="label" optionValue="value" filter size="small" class="pick wide" :aria-label="$t('routines.params.item')" />
            <InputNumber v-if="CONDITIONS[rule.when.type].params.includes('n')" v-model="rule.when.n" :min="0" :max="999999" size="small" class="num" :aria-label="$t('routines.params.n')" />
            <Select v-if="CONDITIONS[rule.when.type].params.includes('weather')" v-model="rule.when.weather" :options="weatherOpts" optionLabel="label" optionValue="value" size="small" class="pick" :aria-label="$t('routines.params.weather')" />
          </div>
          <!-- Then -->
          <div class="part">
            <span class="word">→ {{ $t('routines.thenWord') }}</span>
            <Select :modelValue="rule.then.type" :options="thenOpts" optionLabel="label" optionValue="value" size="small" class="pick" @update:modelValue="v => setThen(rule, v)" />
            <template v-if="rule.then.type === 'skill'">
              <Select :modelValue="rule.then.skill" :options="skillOpts" optionLabel="label" optionValue="value" size="small" class="pick" :aria-label="$t('routines.params.skill')" @update:modelValue="v => setSkill(rule, v)" />
              <Select v-model="rule.then.action" :options="actionOpts(rule.then.skill)" optionLabel="label" optionValue="value" optionDisabled="disabled" filter size="small" class="pick wide" :aria-label="$t('routines.params.action')" />
            </template>
            <Select v-if="rule.then.type === 'fight'" v-model="rule.then.monster" :options="monsterOpts" optionLabel="label" optionValue="value" filter size="small" class="pick wide" :aria-label="$t('routines.params.monster')" />
            <template v-if="rule.then.type === 'sell'">
              <Select v-model="rule.then.item" :options="itemOpts" optionLabel="label" optionValue="value" filter size="small" class="pick wide" :aria-label="$t('routines.params.item')" />
              <span class="word">{{ $t('routines.keep') }}</span>
              <InputNumber v-model="rule.then.n" :min="0" :max="999999" size="small" class="num" :aria-label="$t('routines.params.n')" />
            </template>
            <Select v-if="rule.then.type === 'slayerTask'" v-model="rule.then.kind" :options="kindOpts" optionLabel="label" optionValue="value" size="small" class="pick" :aria-label="$t('routines.params.kind')" />
          </div>
          <label v-if="ACTIONS_LIST[rule.then.type].activity" class="row small interrupt" :for="'int-' + rule.id">
            <ToggleSwitch v-model="rule.interrupt" :inputId="'int-' + rule.id" />
            <span class="grow"><b>{{ $t('routines.interrupt') }}</b> <span class="faint">· {{ $t('routines.interruptHint') }}</span></span>
          </label>
        </div>
      </div>
    </div>

    <div class="section-title">{{ $t('routines.logTitle') }}</div>
    <div class="panel pad">
      <div v-if="!state.routines.log.length" class="small muted">{{ $t('routines.logEmpty') }}</div>
      <div v-for="(e, i) in state.routines.log" :key="i" class="row small log">
        <GameIcon :name="ACTIONS_LIST[e.then.type]?.icon || 'gears'" :size="14" />
        <span class="grow">{{ sentence(e) }}</span>
        <span class="faint tnum">{{ ago(e.at) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title.sm { margin: 16px 0 8px; font-size: 12px; }
.rules { display: flex; flex-direction: column; gap: 10px; }
.rule { padding: 12px 14px; border-radius: var(--radius); border: 1px solid var(--line); background: var(--panel); }
.rule.holds { border-color: color-mix(in srgb, var(--ok) 45%, transparent); }
.rule.blocked { border-color: color-mix(in srgb, var(--tag-bad) 40%, transparent); }
.rule.off { opacity: 0.6; }
.rule-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.n { width: 22px; text-align: center; font-family: var(--font-display); color: var(--gold); }
.rule-body { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.part { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.word { font-size: 13px; color: var(--muted); font-weight: 600; min-width: 46px; }
.pick { min-width: 170px; }
.pick.wide { min-width: 230px; }
.num { width: 110px; }
.num :deep(input) { width: 100%; }
.interrupt { gap: 8px; cursor: pointer; padding-top: 6px; border-top: 1px dashed var(--line); }
.mini { background: none; border: 0; color: var(--muted); padding: 5px 7px; border-radius: 8px; cursor: pointer; }
.mini:not(:disabled):hover { background: var(--tint-2); color: var(--ink); }
.mini:disabled { opacity: 0.3; cursor: default; }
.log { gap: 8px; padding: 5px 0; border-bottom: 1px dashed var(--line); }
@media (max-width: 600px) { .pick, .pick.wide { min-width: 0; flex: 1 1 100%; } .word { min-width: 0; } }
</style>
