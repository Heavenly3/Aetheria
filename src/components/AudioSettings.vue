<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Slider from 'primevue/slider'
import SelectButton from 'primevue/selectbutton'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { THEME_IDS, PALETTES, PROFILE_IDS } from '../game/data/audio.js'
import { nowPlaying, previewTheme, stopPreview } from '../game/music.js'
import { play } from '../game/sound.js'
import { applyProfile, saveCustomProfile, matchingProfile, resetAudio } from '../game/audioProfiles.js'
import GameIcon from './GameIcon.vue'

const { t } = useI18n()
const confirm = useConfirm()
const st = state.settings

/* ---------- profiles ---------- */
const PROFILE_ICONS = { classic: 'laurel-crown', night: 'night-sleep', focus: 'all-seeing-eye', alerts: 'scroll-unfurled', cinematic: 'crown', minimal: 'feather', custom: 'quill-ink' }
const active = computed(() => (void JSON.stringify(st), matchingProfile()))
function useProfile(id) { if (applyProfile(id)) G.toast(PROFILE_ICONS[id] || 'sparkles', 'audio.profileApplied', { name: t(`audio.profiles.${id}.name`) }, 'success') }
function saveMine() { saveCustomProfile(); G.toast('quill-ink', 'audio.profileSaved', {}, 'success') }

// The music details are folded away; whether they are open is remembered on this device
const MORE = 'aetheria-audio-more'
const more = ref((() => { try { return localStorage.getItem(MORE) === '1' } catch { return false } })())
function toggleMore() { more.value = !more.value; try { localStorage.setItem(MORE, more.value ? '1' : '') } catch { /* storage unavailable */ } }

/* ---------- mixer ---------- */
const channels = [
  { on: 'music', vol: 'musicVol', label: 'settings.music', hint: 'settings.musicHint' },
  { on: 'ambience', vol: 'ambienceVol', label: 'settings.ambience', hint: 'settings.ambienceHint' },
  { on: 'sound', vol: 'sfxVol', label: 'settings.sound', hint: 'settings.soundHint' },
]
function setChannel(c, v) { st[c.on] = v; if (v && c.on === 'sound') play('coin') }

/* ---------- music ---------- */
const THEME_ICONS = {
  calm: 'candle-light', adventure: 'pine-tree', dark: 'mushroom', cold: 'ice-spell-cast', ominous: 'crowned-skull', celestial: 'sun',
  town: 'beer-horn', farm: 'wheat', dungeon: 'locked-chest', tower: 'stone-tower', boss: 'dragon-head', frozen: 'ice-golem', dragon: 'dragon-breath',
}
const modes = computed(() => [{ value: 'auto', label: t('audio.mode.auto') }, { value: 'locked', label: t('audio.mode.locked') }])
const palettes = computed(() => PALETTES.map(p => ({ value: p, label: t(`audio.palettes.${p}.name`) })))
function pickTheme(id) {
  if (st.musicMode === 'locked') st.musicTheme = id
  previewTheme(id)
}
function lockCurrent() { st.musicTheme = nowPlaying.theme; st.musicMode = 'locked' }
const why = computed(() => {
  if (nowPlaying.reason === 'preview') return t('audio.why.preview')
  if (nowPlaying.reason === 'locked') return t('audio.why.locked')
  const parts = [t(`weather.${nowPlaying.weather}.name`), t(nowPlaying.night ? 'audio.why.night' : 'audio.why.day')]
  return t('audio.why.auto', { list: parts.join(' · ') })
})
function reset() {
  confirm.require({
    header: t('audio.resetTitle'), message: t('audio.resetMessage'), icon: 'pi pi-refresh',
    acceptLabel: t('audio.reset'), rejectLabel: t('common.cancel'), rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { resetAudio(); G.toast('gears', 'audio.resetDone', {}, 'success') },
  })
}
</script>

<template>
  <div class="stack">
    <!-- Mixer -->
    <div class="panel pad">
      <h3 class="panel-title"><i class="pi pi-sliders-h" style="color:var(--gold)" /> {{ $t('audio.mixer') }}</h3>
      <div class="vol">
        <span class="grow">{{ $t('settings.masterVol') }}</span>
        <Slider v-model="st.masterVol" :min="0" :max="100" :disabled="st.muted" class="vol-slider" :aria-label="$t('settings.masterVol')" />
        <span class="tnum small muted vol-n">{{ st.masterVol }}</span>
      </div>
      <div v-for="c in channels" :key="c.on" class="vol">
        <ToggleSwitch :inputId="'pref-' + c.on" :modelValue="st[c.on]" @update:modelValue="v => setChannel(c, v)" />
        <label class="grow" :for="'pref-' + c.on">{{ $t(c.label) }}<span class="small faint block">{{ $t(c.hint) }}</span></label>
        <Slider v-model="st[c.vol]" :min="0" :max="100" :disabled="!st[c.on] || st.muted" class="vol-slider" :aria-label="$t(c.label)" />
        <span class="tnum small muted vol-n">{{ st[c.vol] }}</span>
      </div>
      <label class="pref" for="pref-hidden"><span class="grow">{{ $t('settings.muteHidden') }}<span class="small faint block">{{ $t('audio.muteHiddenHint') }}</span></span><ToggleSwitch v-model="st.muteHidden" inputId="pref-hidden" /></label>
      <label class="pref" for="pref-muted"><span class="grow">{{ $t('settings.muteAll') }}</span><ToggleSwitch v-model="st.muted" inputId="pref-muted" /></label>
      <label class="pref" for="pref-area"><span class="grow">{{ $t('audio.areaAmbience') }}<span class="small faint block">{{ $t('audio.areaAmbienceHint') }}</span></span><ToggleSwitch v-model="st.areaAmbience" inputId="pref-area" /></label>
    </div>

    <!-- Profiles -->
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="sparkles" /> {{ $t('audio.profilesTitle') }}</h3>
      <p class="small muted" style="margin-top:0">{{ $t('audio.profilesIntro') }}</p>
      <div class="profiles">
        <button v-for="id in [...PROFILE_IDS, ...(st.customProfile ? ['custom'] : [])]" :key="id" class="profile" :class="{ on: active === id }" @click="useProfile(id)">
          <GameIcon :name="PROFILE_ICONS[id]" :size="18" />
          <b>{{ $t(`audio.profiles.${id}.name`) }}</b>
          <span class="small muted">{{ $t(`audio.profiles.${id}.desc`) }}</span>
        </button>
      </div>
      <div class="row wrap" style="margin-top:12px;gap:8px">
        <span class="small muted grow">{{ active ? $t('audio.profileNow', { name: $t(`audio.profiles.${active}.name`) }) : $t('audio.profileEdited') }}</span>
        <Button :label="$t('audio.saveMine')" icon="pi pi-save" size="small" severity="secondary" outlined @click="saveMine" />
        <Button :label="$t('audio.reset')" icon="pi pi-refresh" size="small" severity="secondary" text @click="reset" />
      </div>
    </div>

    <!-- The rest of the music settings stay folded until asked for -->
    <button class="fold" :aria-expanded="more" @click="toggleMore">
      <GameIcon name="magic-swirl" :size="16" />
      <span class="grow"><b>{{ $t('audio.moreTitle') }}</b><span class="small muted block">{{ $t('audio.moreHint') }}</span></span>
      <i class="pi" :class="more ? 'pi-angle-up' : 'pi-angle-down'" />
    </button>
    <div v-show="more" class="stack">
    <!-- Now playing -->
    <div class="panel pad now">
      <h3 class="panel-title"><GameIcon :name="THEME_ICONS[nowPlaying.theme] || 'candle-light'" /> {{ $t('audio.nowPlaying') }}</h3>
      <div class="now-theme">{{ $t(`audio.themes.${nowPlaying.theme}`) }}</div>
      <div class="small muted">{{ why }}</div>
      <div class="row wrap" style="gap:8px;margin-top:12px">
        <SelectButton v-model="st.musicMode" :options="modes" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" />
        <Button v-if="st.musicMode === 'auto'" :label="$t('audio.keepThis')" icon="pi pi-lock" size="small" severity="secondary" outlined @click="lockCurrent" />
        <Button v-if="nowPlaying.preview" :label="$t('audio.stopPreview')" icon="pi pi-stop" size="small" severity="secondary" @click="stopPreview" />
      </div>
      <p class="small faint" style="margin:10px 0 0">{{ $t(st.musicMode === 'locked' ? 'audio.mode.lockedHint' : 'audio.mode.autoHint') }}</p>
    </div>

    <!-- Themes -->
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="crystal-ball" /> {{ $t('audio.themesTitle') }}</h3>
      <p class="small muted" style="margin-top:0">{{ $t(st.musicMode === 'locked' ? 'audio.themesLocked' : 'audio.themesIntro') }}</p>
      <div class="themes">
        <button v-for="id in THEME_IDS" :key="id" class="theme" :class="{ playing: nowPlaying.theme === id, chosen: st.musicMode === 'locked' && st.musicTheme === id }" @click="pickTheme(id)">
          <GameIcon :name="THEME_ICONS[id]" :size="18" />
          <span class="grow">{{ $t(`audio.themes.${id}`) }}</span>
          <i class="pi" :class="nowPlaying.preview === id ? 'pi-volume-up' : 'pi-play'" />
        </button>
      </div>
    </div>

    <!-- How the music sounds -->
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="magic-swirl" /> {{ $t('audio.styleTitle') }}</h3>
      <div class="stack" style="gap:14px">
        <div>
          <div class="small muted" style="margin-bottom:6px">{{ $t('audio.palette') }}</div>
          <SelectButton v-model="st.palette" :options="palettes" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" @update:modelValue="previewTheme(nowPlaying.theme, 10)" />
          <div class="small faint" style="margin-top:6px">{{ $t(`audio.palettes.${st.palette}.desc`) }}</div>
        </div>
        <div>
          <div class="row small"><span class="muted grow">{{ $t('audio.tempo') }}</span><b class="tnum">{{ st.tempo }}%</b></div>
          <Slider v-model="st.tempo" :min="60" :max="140" :step="5" :aria-label="$t('audio.tempo')" />
        </div>
        <div>
          <div class="row small"><span class="muted grow">{{ $t('audio.density') }}</span><b class="tnum">{{ st.density }}%</b></div>
          <Slider v-model="st.density" :min="0" :max="100" :step="5" :aria-label="$t('audio.density')" />
          <div class="small faint" style="margin-top:6px">{{ $t('audio.densityHint') }}</div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.fold { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); color: inherit; font: inherit; text-align: start; cursor: pointer; }
.fold:hover { border-color: var(--line-hi); }
.fold .gi { color: var(--gold); }
.profiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.profile { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: start;
  border: 1px solid var(--line); background: var(--tint-1); color: inherit; font: inherit; }
.profile .gi { color: var(--muted); }
.profile:hover { border-color: var(--line-hi); }
.profile.on { border-color: var(--gold); background: rgba(226, 182, 90, 0.08); }
.profile.on .gi { color: var(--gold); }
.pref { display: flex; align-items: center; gap: 12px; padding: 8px 0; cursor: pointer; }
.vol { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.vol label { cursor: pointer; }
.vol-slider { width: 130px; flex-shrink: 0; }
.vol-n { width: 26px; text-align: end; }
.block { display: block; }
.now-theme { font-family: var(--font-display); font-size: 24px; color: var(--gold-hi); line-height: 1.2; }
.themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 6px; }
.theme { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; cursor: pointer; border: 1px solid var(--line); background: var(--panel); color: inherit; font: inherit; text-align: start; }
.theme .gi { color: var(--muted); }
.theme:hover { border-color: var(--line-hi); }
.theme.playing { border-color: color-mix(in srgb, var(--gold) 60%, transparent); }
.theme.playing .gi, .theme.chosen .gi { color: var(--gold); }
.theme.chosen { background: rgba(226, 182, 90, 0.08); }
@media (max-width: 520px) { .vol { flex-wrap: wrap; } .vol > .grow { flex: 1 1 calc(100% - 64px); } .vol-slider { width: auto; flex: 1 1 calc(100% - 60px); margin: 4px 8px 6px; } }
</style>
