<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { exitToTitle } from '../game/loop.js'
import { ROLES, DIFFICULTIES } from '../game/data/character.js'
import { play, requestNotify } from '../game/sound.js'
import GameIcon from '../components/GameIcon.vue'
import LanguageSelect from '../components/LanguageSelect.vue'

const { t } = useI18n()
const confirm = useConfirm()
const name = ref(state.name)
const saveText = ref('')

async function toggleNotify(v) {
  if (v && !(await requestNotify())) { state.settings.notify = false; G.toast('cross-mark', 'settings.notifyBlocked', {}, 'warn'); return }
  state.settings.notify = v
}
function toggleSound(v) { state.settings.sound = v; if (v) play('coin') }

function rename() {
  const v = name.value.trim().slice(0, 24)
  if (!v) return
  state.name = v
  G.toast('scroll-quill', 'settings.renamed', {}, 'success')
}
async function exportSave() {
  saveText.value = G.exportSave()
  try { await navigator.clipboard.writeText(saveText.value); G.toast('scroll-unfurled', 'settings.copied', {}, 'success') }
  catch { G.toast('scroll-unfurled', 'settings.copyManually') }
}
function importSave() {
  try { G.importSave(saveText.value); name.value = state.name; G.toast('scroll-unfurled', 'settings.imported', {}, 'success') }
  catch { G.toast('cross-mark', 'settings.invalidSave', {}, 'warn') }
}
function reset() {
  confirm.require({
    header: t('settings.deleteTitle'),
    message: t('settings.deleteMessage', { name: state.name, n: G.slot + 1 }),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('settings.deleteConfirm'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { const i = G.slot; exitToTitle(); G.deleteSlot(i) },
  })
}
</script>

<template>
  <div class="two-col">
    <div class="stack">
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="scroll-quill" /> {{ $t('settings.heroName') }}</h3>
        <div class="row">
          <InputText id="hero-name" v-model="name" maxlength="24" class="grow" @keyup.enter="rename" />
          <Button :label="$t('common.save')" icon="pi pi-check" @click="rename" />
        </div>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="cog" /> {{ $t('settings.preferences') }}</h3>
        <div class="pref"><span class="grow">{{ $t('settings.language') }}</span><LanguageSelect input-id="settings-language" /></div>
        <label class="pref" for="pref-chain"><span class="grow">{{ $t('settings.autoChain') }}<span class="small faint" style="display:block">{{ $t('settings.autoChainHint') }}</span></span><ToggleSwitch v-model="state.settings.autoChain" inputId="pref-chain" /></label>
        <label class="pref" for="pref-sound"><span class="grow">{{ $t('settings.sound') }}</span><ToggleSwitch inputId="pref-sound" :modelValue="state.settings.sound" @update:modelValue="toggleSound" /></label>
        <label class="pref" for="pref-notify"><span class="grow">{{ $t('settings.notify') }}</span><ToggleSwitch inputId="pref-notify" :modelValue="state.settings.notify" @update:modelValue="toggleNotify" /></label>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="locked-chest" /> {{ $t('settings.backup') }}</h3>
        <p class="small muted" style="margin-top:0">{{ $t('settings.backupIntro', { n: G.slot + 1 }) }}</p>
        <Textarea id="save-text" v-model="saveText" rows="4" :placeholder="$t('settings.pastePlaceholder')" fluid style="font-family:ui-monospace,monospace;font-size:12px" />
        <div class="row" style="margin-top:10px">
          <Button :label="$t('settings.export')" icon="pi pi-upload" severity="secondary" @click="exportSave" />
          <Button :label="$t('settings.import')" icon="pi pi-download" severity="secondary" outlined :disabled="!saveText.trim()" @click="importSave" />
        </div>
      </div>
      <div class="panel pad">
        <h3 class="panel-title"><GameIcon name="locked-chest" /> {{ $t('settings.game') }}</h3>
        <div class="kv"><span>{{ $t('settings.slot') }}</span><b>{{ $t('settings.slotOf', { n: G.slot + 1, total: 4 }) }}</b></div>
        <div class="kv"><span>{{ $t('settings.role') }}</span><b>{{ ROLES[state.role].name }}</b></div>
        <div class="kv"><span>{{ $t('settings.difficulty') }}</span><b :style="{ color: DIFFICULTIES[state.difficulty].color }">{{ DIFFICULTIES[state.difficulty].name }}</b></div>
        <div class="row wrap" style="margin-top:14px">
          <Button :label="$t('settings.saveAndExit')" icon="pi pi-sign-out" severity="secondary" @click="exitToTitle" />
          <Button :label="$t('settings.deleteGame')" icon="pi pi-trash" severity="danger" outlined @click="reset" />
        </div>
      </div>
    </div>
    <div class="panel pad" style="align-self:start">
      <h3 class="panel-title"><GameIcon name="open-book" /> {{ $t('settings.about') }}</h3>
      <p class="muted" style="margin-top:0">{{ $t('settings.aboutText') }}</p>
      <div class="kv"><span>{{ $t('settings.interface') }}</span><b>Vue 3 + PrimeVue 4</b></div>
      <div class="kv"><span>{{ $t('settings.icons') }}</span><b><a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> · CC BY 3.0</b></div>
      <div class="kv"><span>{{ $t('settings.offline') }}</span><b>{{ $t('settings.upTo', { n: +G.offlineCapHours().toFixed(1) }) }}</b></div>
      <p class="small faint">{{ $t('settings.credits') }}</p>
    </div>
  </div>
</template>

<style scoped>
.pref { display: flex; align-items: center; gap: 12px; padding: 8px 0; cursor: pointer; }
</style>
