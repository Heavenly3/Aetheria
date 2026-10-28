<script setup>
import { computed, reactive } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import Slider from 'primevue/slider'
import { G, state } from '../game/engine.js'
import { CUES, CUE_CATS, PACKS } from '../game/data/audio.js'
import { cueSettings, setCue, previewCue, previewPack, requestNotify } from '../game/sound.js'
import GameIcon from './GameIcon.vue'

const st = state.settings
const CAT_ICONS = { progress: 'laurel-crown', loot: 'locked-chest', combat: 'crossed-swords', world: 'crystal-ball', town: 'beer-horn', system: 'gears' }
const groups = computed(() => CUE_CATS.map(cat => ({ cat, list: CUES.filter(c => c.cat === cat) })))
// Read through the settings so every switch and slider follows what is saved
const conf = id => (void st.cues, cueSettings(id))
function pickPack(p) { st.sfxPack = p; previewPack(p) }
async function setNotify(id, v) {
  if (v && !st.notify) {
    if (!(await requestNotify())) { G.toast('cross-mark', 'settings.notifyBlocked', {}, 'warn'); return }
    st.notify = true
  }
  setCue(id, { notify: v })
}
const allOn = computed(() => CUES.every(c => conf(c.id).on))
function setAll(v) { for (const c of CUES) setCue(c.id, { on: v }) }
// Each category folds away, showing how many of its alerts are on; which are open is remembered on this device
const OPEN = 'aetheria-cue-groups'
const open = reactive((() => { try { return JSON.parse(localStorage.getItem(OPEN)) || {} } catch { return {} } })())
function toggleGroup(cat) { open[cat] = !open[cat]; try { localStorage.setItem(OPEN, JSON.stringify(open)) } catch { /* storage unavailable */ } }
const onCount = g => g.list.filter(c => conf(c.id).on).length
const groupOn = g => onCount(g) > 0
function setGroup(g, v) { for (const c of g.list) setCue(c.id, { on: v }) }
</script>

<template>
  <div class="stack">
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="sparkles" /> {{ $t('audio.packTitle') }}</h3>
      <div class="packs">
        <button v-for="p in PACKS" :key="p" class="pack" :class="{ on: st.sfxPack === p }" @click="pickPack(p)">
          <b>{{ $t(`audio.packs.${p}.name`) }}</b>
          <span class="small muted">{{ $t(`audio.packs.${p}.desc`) }}</span>
          <i class="pi pi-play" />
        </button>
      </div>
      <p class="small faint" style="margin:12px 0 0">{{ $t('audio.cuesIntro') }}</p>
      <div v-if="st.sound === false || st.muted" class="small warn-text" style="margin-top:8px"><i class="pi pi-info-circle" /> {{ $t('audio.soundOffHint') }}</div>
    </div>

    <div class="panel pad">
      <div class="row wrap" style="gap:10px;margin-bottom:6px">
        <h3 class="panel-title grow" style="margin:0"><GameIcon name="scroll-unfurled" /> {{ $t('audio.cuesTitle') }}</h3>
        <label class="row small muted" for="cue-all" style="gap:8px;cursor:pointer">{{ $t('audio.allCues') }} <ToggleSwitch :modelValue="allOn" inputId="cue-all" @update:modelValue="setAll" /></label>
      </div>
      <p class="small faint" style="margin:0 0 6px">{{ $t('audio.groupsHint') }}</p>
      <div v-for="g in groups" :key="g.cat" class="cue-group">
        <div class="group-head">
          <button class="group-btn" :aria-expanded="!!open[g.cat]" @click="toggleGroup(g.cat)">
            <GameIcon :name="CAT_ICONS[g.cat]" :size="15" />
            <b class="grow">{{ $t(`audio.cats.${g.cat}`) }}</b>
            <span class="small muted tnum">{{ $t('audio.groupCount', { on: onCount(g), n: g.list.length }) }}</span>
            <i class="pi" :class="open[g.cat] ? 'pi-angle-up' : 'pi-angle-down'" />
          </button>
          <ToggleSwitch :modelValue="groupOn(g)" :aria-label="$t(`audio.cats.${g.cat}`)" @update:modelValue="v => setGroup(g, v)" />
        </div>
        <template v-if="open[g.cat]">
        <div class="cue-head small faint">
          <span class="grow">{{ $t('audio.col.alert') }}</span>
          <span class="c-vol">{{ $t('audio.col.volume') }}</span>
          <span class="c-flag" v-tooltip.top="$t('audio.col.bgHint')">{{ $t('audio.col.bg') }}</span>
          <span class="c-flag" v-tooltip.top="$t('audio.col.notifyHint')">{{ $t('audio.col.notify') }}</span>
        </div>
        <div v-for="c in g.list" :key="c.id" class="cue" :class="{ off: !conf(c.id).on }">
          <ToggleSwitch :modelValue="conf(c.id).on" :inputId="'cue-' + c.id" @update:modelValue="v => setCue(c.id, { on: v })" />
          <label class="grow cue-name" :for="'cue-' + c.id">
            {{ $t(`audio.cues.${c.id}.name`) }}
            <span v-if="c.prio === 'high'" class="prio" v-tooltip.top="$t('audio.highHint')">{{ $t('audio.high') }}</span>
            <span class="small faint block">{{ $t(`audio.cues.${c.id}.desc`) }}</span>
          </label>
          <button class="mini" :aria-label="$t('audio.preview')" v-tooltip.top="$t('audio.preview')" @click="previewCue(c.id)"><i class="pi pi-play" /></button>
          <Slider class="c-vol" :modelValue="conf(c.id).vol" :min="0" :max="150" :step="10" :disabled="!conf(c.id).on" @update:modelValue="v => setCue(c.id, { vol: v })" :aria-label="$t('audio.col.volume')" />
          <span class="c-flag"><span class="m-label small muted">{{ $t('audio.col.bg') }}</span><ToggleSwitch :modelValue="conf(c.id).bg" :disabled="!conf(c.id).on" :aria-label="$t('audio.col.bg')" @update:modelValue="v => setCue(c.id, { bg: v })" /></span>
          <span class="c-flag"><span class="m-label small muted">{{ $t('audio.col.notify') }}</span><ToggleSwitch :modelValue="conf(c.id).notify && st.notify" :aria-label="$t('audio.col.notify')" @update:modelValue="v => setNotify(c.id, v)" /></span>
        </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-head { display: flex; align-items: center; gap: 10px; padding: 4px 0; border-top: 1px solid var(--line); }
.cue-group:first-of-type .group-head { border-top: 0; }
.group-btn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 10px 4px; border: 0; background: none; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.group-btn .gi { color: var(--gold); }
.group-btn:hover b { color: var(--gold-hi); }
.packs { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
.pack { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: start;
  border: 1px solid var(--line); background: var(--tint-1); color: inherit; font: inherit; }
.pack .pi { position: absolute; top: 10px; inset-inline-end: 12px; font-size: 11px; color: var(--muted); }
.pack:hover { border-color: var(--line-hi); }
.pack.on { border-color: var(--gold); background: rgba(226, 182, 90, 0.08); }
.cue-head { display: flex; align-items: center; gap: 10px; padding: 4px 0 2px; border-bottom: 1px solid var(--line); }
.cue-head .grow { padding-inline-start: 52px; }
.cue { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--line); }
.cue.off .cue-name { opacity: 0.55; }
.cue-name { cursor: pointer; font-weight: 600; font-size: 14px; min-width: 0; }
.block { display: block; font-weight: 400; }
.c-vol { width: 120px; flex-shrink: 0; }
.c-flag { width: 64px; flex-shrink: 0; display: flex; justify-content: center; text-align: center; }
.prio { margin-inline-start: 6px; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; color: var(--gold-hi); background: rgba(226, 182, 90, 0.12); border: 1px solid rgba(226, 182, 90, 0.35); }
.mini { background: none; border: 0; color: var(--muted); padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.mini:hover { background: var(--tint-2); color: var(--ink); }
.section-title.sm { margin: 16px 0 4px; font-size: 12px; }
.warn-text { color: var(--warn); }
/* Labels for the two switches, only on phones where the column titles are hidden */
.m-label { display: none; }
/* Phones: volume and the two switches go under the alert's name */
@media (max-width: 640px) {
  .cue-head { display: none; }
  .cue { flex-wrap: wrap; row-gap: 6px; }
  .cue-name { flex: 1 1 calc(100% - 110px); }
  .c-vol { flex: 1 1 100%; width: auto; margin: 0 6px; }
  .c-flag { width: auto; flex: 1 1 40%; justify-content: flex-start; align-items: center; gap: 8px; }
  .m-label { display: inline; }
}
</style>
