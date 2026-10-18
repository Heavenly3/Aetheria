<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { requestNotify } from '../game/sound.js'
import { TEXT_SIZES, TOAST_LEVELS } from '../game/data/settings.js'
import { CHANGELOG } from '../game/data/changelog.js'
import GameIcon from '../components/GameIcon.vue'
import LanguageSelect from '../components/LanguageSelect.vue'
import ThemeSelect from '../components/ThemeSelect.vue'
import UpdateLog from '../components/UpdateLog.vue'
import AudioSettings from '../components/AudioSettings.vue'
import CueSettings from '../components/CueSettings.vue'
import SaveSettings from '../components/SaveSettings.vue'
import FeedbackSettings from '../components/FeedbackSettings.vue'
import { startTutorial, skipTutorial } from '../game/tutorial.js'

const { t } = useI18n()
const st = state.settings

// Settings in eight sections, listed at the side (or across the top on phones); the last one opened
// is remembered on this device
const STORE = 'aetheria-settings-tab'
const SECTIONS = [
  { id: 'game', icon: 'pi pi-cog' },
  { id: 'display', icon: 'pi pi-desktop' },
  { id: 'sound', icon: 'pi pi-volume-up' },
  { id: 'alerts', icon: 'pi pi-bell' },
  { id: 'access', icon: 'pi pi-eye' },
  { id: 'save', icon: 'pi pi-save' },
  { id: 'feedback', icon: 'pi pi-comments' },
  { id: 'about', icon: 'pi pi-info-circle' },
]
const stored = (() => { try { return localStorage.getItem(STORE) } catch { return null } })()
// A link can open a section directly (the hero menu opens Feedback this way)
const asked = useRoute().query.tab
const valid = id => SECTIONS.some(s => s.id === id)
const tab = ref(valid(asked) ? asked : valid(stored) ? stored : 'game')
watch(tab, v => { try { localStorage.setItem(STORE, v) } catch { /* storage unavailable */ } })

const sizes = computed(() => TEXT_SIZES.map(s => ({ value: s.id, label: t(`settings.textSizes.${s.id}`) })))
const toastLevels = computed(() => TOAST_LEVELS.map(id => ({ value: id, label: t(`settings.toastLevels.${id}.name`) })))
// Accessibility switches, each with a line on what it does
const access = ['reduceMotion', 'subtitles', 'visualCues', 'softTone', 'mono']

async function toggleNotify(v) {
  if (v && !(await requestNotify())) { st.notify = false; G.toast('cross-mark', 'settings.notifyBlocked', {}, 'warn'); return }
  st.notify = v
}
function restartTutorial() { startTutorial(); G.toast('treasure-map', 'settings.tutorialRestarted', {}, 'success') }
function skipIt() { skipTutorial(); G.toast('treasure-map', 'settings.tutorialSkipped', {}, 'success') }
function openAll() { G.openAllScreens(); G.toast('open-book', 'settings.allScreensOpened', {}, 'success') }
</script>

<template>
  <div class="set-layout">
    <nav class="set-nav" :aria-label="$t('settings.sectionsLabel')">
      <button v-for="s in SECTIONS" :key="s.id" class="set-tab" :class="{ on: tab === s.id }" :aria-current="tab === s.id ? 'page' : undefined" @click="tab = s.id">
        <i :class="s.icon" />
        <span class="grow">
          <b>{{ $t(`settings.sections.${s.id}.name`) }}</b>
          <span class="set-tab-desc">{{ $t(`settings.sections.${s.id}.desc`) }}</span>
        </span>
      </button>
    </nav>

    <div class="set-body">
      <!-- Game: how the game plays and how much it guides you -->
      <div v-if="tab === 'game'" class="stack">
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="cog" /> {{ $t('settings.groups.general') }}</h3>
          <div class="pref"><span class="grow">{{ $t('settings.language') }}</span><LanguageSelect input-id="settings-language" /></div>
          <label class="pref" for="pref-chain"><span class="grow">{{ $t('settings.autoChain') }}<span class="hint">{{ $t('settings.autoChainHint') }}</span></span><ToggleSwitch v-model="st.autoChain" inputId="pref-chain" /></label>
          <label class="pref" for="pref-summary"><span class="grow">{{ $t('settings.offlineSummary') }}<span class="hint">{{ $t('settings.offlineSummaryHint') }}</span></span><ToggleSwitch v-model="st.offlineSummary" inputId="pref-summary" /></label>
        </div>
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="treasure-map" /> {{ $t('settings.groups.guide') }}</h3>
          <div class="pref"><span class="grow">{{ $t('settings.tutorial') }}<span class="hint">{{ $t('settings.tutorialHint') }}</span></span>
            <Button v-if="state.tutorial.done" :label="$t('settings.tutorialRestart')" icon="pi pi-replay" size="small" severity="secondary" outlined @click="restartTutorial" />
            <Button v-else :label="$t('settings.tutorialSkip')" icon="pi pi-forward" size="small" severity="secondary" outlined @click="skipIt" /></div>
          <label class="pref" for="pref-goal"><span class="grow">{{ $t('settings.goalBar') }}<span class="hint">{{ $t('settings.goalBarHint') }}</span></span><ToggleSwitch v-model="st.goalBar" inputId="pref-goal" /></label>
          <div class="pref"><span class="grow">{{ $t('settings.allScreens') }}<span class="hint">{{ G.closedScreens().length ? $t('settings.allScreensHint', { n: G.closedScreens().length }) : $t('settings.allScreensDone') }}</span></span>
            <Button :label="$t('settings.allScreensOpen')" icon="pi pi-lock-open" size="small" severity="secondary" outlined :disabled="!G.closedScreens().length" @click="openAll" /></div>
        </div>
      </div>

      <!-- Display: how the screen looks and how talkative it is -->
      <div v-else-if="tab === 'display'" class="stack">
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="sun" /> {{ $t('settings.groups.look') }}</h3>
          <div class="pref"><span class="grow">{{ $t('settings.theme') }}</span><ThemeSelect /></div>
          <label class="pref" for="pref-numbers"><span class="grow">{{ $t('settings.compactNumbers') }}<span class="hint">{{ $t('settings.compactNumbersHint') }}</span></span><ToggleSwitch v-model="st.compactNumbers" inputId="pref-numbers" /></label>
        </div>
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="scroll-unfurled" /> {{ $t('settings.groups.messages') }}</h3>
          <div class="pref col"><span>{{ $t('settings.toasts') }}<span class="hint">{{ $t(`settings.toastLevels.${st.toasts}.desc`) }}</span></span>
            <SelectButton v-model="st.toasts" :options="toastLevels" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" /></div>
        </div>
      </div>

      <!-- Sound: volumes and profiles first, the music in detail folded below -->
      <AudioSettings v-else-if="tab === 'sound'" />

      <!-- Alerts: browser notifications, then every sound alert -->
      <div v-else-if="tab === 'alerts'" class="stack">
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="crystal-ball" /> {{ $t('settings.groups.notify') }}</h3>
          <label class="pref" for="pref-notify"><span class="grow">{{ $t('settings.notify') }}<span class="hint">{{ $t('settings.notifyHint') }}</span></span><ToggleSwitch inputId="pref-notify" :modelValue="st.notify" @update:modelValue="toggleNotify" /></label>
        </div>
        <CueSettings />
      </div>

      <!-- Accessibility -->
      <div v-else-if="tab === 'access'" class="stack">
        <div class="panel pad">
          <h3 class="panel-title"><i class="pi pi-eye" style="color:var(--gold)" /> {{ $t('settings.sections.access.name') }}</h3>
          <p class="small muted" style="margin-top:0">{{ $t('audio.accessIntro') }}</p>
          <div class="pref col"><span>{{ $t('settings.textSize') }}<span class="hint">{{ $t('settings.textSizeHint') }}</span></span>
            <SelectButton v-model="st.textSize" :options="sizes" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" /></div>
          <label v-for="k in access" :key="k" class="pref" :for="'acc-' + k">
            <span class="grow">{{ $t(`audio.access.${k}.name`) }}<span class="hint">{{ $t(`audio.access.${k}.desc`) }}</span></span>
            <ToggleSwitch v-model="st[k]" :inputId="'acc-' + k" />
          </label>
        </div>
      </div>

      <!-- Save: name, backups and the slot -->
      <SaveSettings v-else-if="tab === 'save'" />

      <!-- Feedback: report a bug or share an idea -->
      <FeedbackSettings v-else-if="tab === 'feedback'" />

      <!-- About -->
      <div v-else class="stack">
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="quill-ink" /> {{ $t('changelog.title') }}</h3>
          <p class="small muted" style="margin-top:0">{{ $t('changelog.intro') }}</p>
          <UpdateLog />
        </div>
        <div class="panel pad">
          <h3 class="panel-title"><GameIcon name="open-book" /> {{ $t('settings.about') }}</h3>
          <p class="muted" style="margin-top:0">{{ $t('settings.aboutText') }}</p>
          <div class="kv"><span>{{ $t('settings.version') }}</span><b>{{ CHANGELOG[0].version }}</b></div>
          <div class="kv"><span>{{ $t('settings.interface') }}</span><b>Vue 3 + PrimeVue 4</b></div>
          <div class="kv"><span>{{ $t('settings.icons') }}</span><b><a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> · CC BY 3.0</b></div>
          <div class="kv"><span>{{ $t('settings.offline') }}</span><b>{{ $t('settings.upTo', { n: +G.offlineCapHours().toFixed(1) }) }}</b></div>
          <p class="small faint">{{ $t('settings.credits') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.set-layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 20px; align-items: start; }
.set-nav { position: sticky; top: 90px; display: flex; flex-direction: column; gap: 4px; }
.set-tab { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid transparent; background: none; color: var(--ink-2); font: inherit; text-align: start; cursor: pointer; }
.set-tab i { width: 18px; color: var(--muted); }
.set-tab b { display: block; font-size: 14px; }
.set-tab-desc { display: block; font-size: 12px; color: var(--faint); line-height: 1.3; }
.set-tab:hover { background: var(--tint-2); color: var(--ink); }
.set-tab.on { background: linear-gradient(90deg, rgba(226, 182, 90, 0.14), rgba(226, 182, 90, 0.02)); border-color: rgba(226, 182, 90, 0.22); color: var(--ink); }
.set-tab.on i { color: var(--gold); }
.set-body { max-width: 820px; min-width: 0; }
.pref { display: flex; align-items: center; gap: 12px; padding: 10px 0; cursor: pointer; border-top: 1px solid var(--line); }
.panel-title + .pref, .panel-title + p + .pref { border-top: 0; }
.pref.col { flex-direction: column; align-items: flex-start; gap: 8px; cursor: default; }
.hint { display: block; font-size: 12.5px; color: var(--faint); margin-top: 2px; }
/* Phones and narrow windows: the sections become one sliding row of chips above the content */
@media (max-width: 900px) {
  .set-layout { grid-template-columns: 1fr; gap: 14px; }
  .set-nav { position: static; flex-direction: row; overflow-x: auto; scrollbar-width: none; margin-inline: -16px; padding: 2px 16px;
    mask-image: linear-gradient(90deg, transparent, #000 12px, #000 calc(100% - 28px), transparent); }
  .set-nav::-webkit-scrollbar { display: none; }
  .set-tab { flex-shrink: 0; padding: 8px 12px; border-color: var(--line); background: var(--panel); }
  .set-tab-desc { display: none; }
  .set-tab b { font-size: 13.5px; }
}
@media (max-width: 420px) { .pref { flex-wrap: wrap; } }
</style>
