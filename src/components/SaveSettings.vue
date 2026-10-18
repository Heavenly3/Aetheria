<script setup>
import { ref, toRaw, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { useConfirm } from 'primevue/useconfirm'
import { G, state } from '../game/engine.js'
import { exitToTitle } from '../game/loop.js'
import { ROLES, DIFFICULTIES } from '../game/data/character.js'
import { encodeCode, decodeAny, makeLink, downloadFile, pickFile } from '../game/transfer.js'
import { listBackups, readBackup } from '../game/backup.js'
import { fmtTime } from '../game/format.js'
import GameIcon from './GameIcon.vue'

// Everything about the save: the hero's name, automatic backups, copies outside the browser and the slot itself
const { t } = useI18n()
const confirm = useConfirm()
const name = ref(state.name)
const saveText = ref('')
const showCode = ref(false)
const canShare = typeof navigator !== 'undefined' && !!navigator.share

function rename() {
  const v = name.value.trim().slice(0, 24)
  if (!v) return
  state.name = v
  G.toast('scroll-quill', 'settings.renamed', {}, 'success')
}

/* ---------- automatic backups ---------- */
const backups = ref([])
const refreshBackups = async () => { backups.value = await listBackups(G.slot) }
onMounted(refreshBackups)
const when = ts => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
async function backupNow() { await G.backupNow(); await refreshBackups(); G.toast('locked-chest', 'backup.made', {}, 'success') }
function restore(b) {
  confirm.require({
    header: t('backup.restoreTitle'),
    message: t('backup.restoreMessage', { when: when(b.at), name: b.info?.name || '' }),
    icon: 'pi pi-history',
    acceptLabel: t('backup.restore'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      const save = await readBackup(G.slot, b.tier)
      if (!save) { G.toast('cross-mark', 'backup.failed', {}, 'warn'); return }
      G.loadSave(save)
      name.value = state.name
      G.toast('locked-chest', 'backup.restored', {}, 'success')
    },
  })
}

/* ---------- copies outside the browser ---------- */
const snapshot = () => { G.save(); return JSON.parse(JSON.stringify(toRaw(state))) }
async function copy(text, okKey) {
  try { await navigator.clipboard.writeText(text); G.toast('scroll-unfurled', okKey, {}, 'success') }
  catch { G.toast('scroll-unfurled', 'settings.copyManually') }
}
function download() { downloadFile(snapshot()); G.markExported(); G.toast('locked-chest', 'settings.downloaded', {}, 'success') }
async function copyLink() {
  const link = await makeLink(snapshot())
  saveText.value = link
  G.markExported()
  if (canShare) {
    try { await navigator.share({ title: 'Aetheria', text: t('settings.shareText', { name: state.name }), url: link }); return }
    catch (e) { if (e?.name === 'AbortError') return }
  }
  copy(link, 'settings.linkCopied')
}
async function exportCode() {
  saveText.value = await encodeCode(snapshot())
  G.markExported()
  copy(saveText.value, 'settings.copied')
}
// Loading replaces the game in this slot, so it always asks first
function askReplace(save) {
  confirm.require({
    header: t('settings.replaceTitle'),
    message: t('settings.replaceMessage', { name: save.name, n: G.slot + 1, current: state.name }),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('settings.replaceConfirm'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { G.loadSave(save); name.value = state.name; saveText.value = ''; G.toast('scroll-unfurled', 'settings.imported', {}, 'success') },
  })
}
async function importCode() {
  try { askReplace(await decodeAny(saveText.value)) }
  catch { G.toast('cross-mark', 'settings.invalidSave', {}, 'warn') }
}
async function loadFile() {
  try { const save = await pickFile(); if (save) askReplace(save) }
  catch { G.toast('cross-mark', 'settings.invalidSave', {}, 'warn') }
}

/* ---------- the slot ---------- */
function remove() {
  confirm.require({
    header: t('settings.deleteTitle'),
    message: t('settings.deleteMessage', { name: state.name, n: G.slot + 1 }),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('settings.deleteConfirm'), rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { const i = G.slot; exitToTitle(); G.deleteSlot(i) },
  })
}
</script>

<template>
  <div class="stack">
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="scroll-quill" /> {{ $t('settings.heroName') }}</h3>
      <div class="row">
        <InputText id="hero-name" v-model="name" maxlength="24" class="grow" @keyup.enter="rename" />
        <Button :label="$t('common.save')" icon="pi pi-check" @click="rename" />
      </div>
    </div>

    <!-- Automatic backups in this browser -->
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="locked-chest" /> {{ $t('backup.title') }}</h3>
      <p class="small muted" style="margin-top:0">{{ $t('backup.intro') }}</p>
      <div v-if="backups.length" class="backups">
        <div v-for="b in backups" :key="b.tier" class="backup row">
          <i class="pi pi-history muted" />
          <div class="grow">
            <b>{{ $t(`backup.tiers.${b.tier}`) }}</b>
            <div class="small muted">{{ when(b.at) }} · {{ b.info?.name }} · {{ $t('stats.totalLevel') }} {{ b.info?.totalLevel }} · {{ fmtTime(b.info?.playTime || 0) }}</div>
          </div>
          <Button :label="$t('backup.restore')" icon="pi pi-replay" size="small" severity="secondary" outlined @click="restore(b)" />
        </div>
      </div>
      <p v-else class="small faint">{{ $t('backup.none') }}</p>
      <Button :label="$t('backup.now')" icon="pi pi-save" size="small" severity="secondary" text style="margin-top:6px" @click="backupNow" />
    </div>

    <!-- Copies outside the browser -->
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="scroll-unfurled" /> {{ $t('settings.backup') }}</h3>
      <p class="small muted" style="margin-top:0">{{ $t('backup.outsideIntro') }}</p>
      <div class="backup-grid">
        <Button :label="$t('settings.downloadFile')" icon="pi pi-download" @click="download" />
        <Button :label="$t('settings.loadFile')" icon="pi pi-folder-open" severity="secondary" outlined @click="loadFile" />
        <Button :label="$t(canShare ? 'settings.shareLink' : 'settings.copyLink')" :icon="canShare ? 'pi pi-share-alt' : 'pi pi-link'" severity="secondary" class="span-2" @click="copyLink" />
      </div>
      <p class="small faint">{{ state.settings.lastExport ? $t('backup.lastExport', { when: when(state.settings.lastExport) }) : $t('backup.neverExported') }}</p>
      <label class="pref" for="pref-remind"><span class="grow">{{ $t('backup.reminder') }}<span class="small faint block">{{ $t('backup.reminderHint') }}</span></span><ToggleSwitch v-model="state.settings.backupReminder" inputId="pref-remind" /></label>
      <button class="link-btn" :aria-expanded="showCode" @click="showCode = !showCode">
        <i class="pi" :class="showCode ? 'pi-angle-up' : 'pi-angle-down'" /> {{ $t('backup.codeTitle') }}
      </button>
      <div v-show="showCode">
        <p class="small faint">{{ $t('settings.linkHint') }}</p>
        <Textarea id="save-text" v-model="saveText" rows="4" :placeholder="$t('settings.pastePlaceholder')" fluid style="font-family:ui-monospace,monospace;font-size:12px" />
        <div class="row" style="margin-top:10px">
          <Button :label="$t('settings.export')" icon="pi pi-copy" severity="secondary" text @click="exportCode" />
          <Button :label="$t('settings.import')" icon="pi pi-sign-in" severity="secondary" outlined :disabled="!saveText.trim()" @click="importCode" />
        </div>
      </div>
    </div>

    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="cog" /> {{ $t('settings.game') }}</h3>
      <div class="kv"><span>{{ $t('settings.slot') }}</span><b>{{ $t('settings.slotOf', { n: G.slot + 1, total: 4 }) }}</b></div>
      <div class="kv"><span>{{ $t('settings.role') }}</span><b>{{ ROLES[state.role].name }}</b></div>
      <div class="kv"><span>{{ $t('settings.difficulty') }}</span><b class="hue" :style="{ '--hue': DIFFICULTIES[state.difficulty].color }">{{ DIFFICULTIES[state.difficulty].name }}</b></div>
      <div class="row wrap" style="margin-top:14px">
        <Button :label="$t('settings.saveAndExit')" icon="pi pi-sign-out" severity="secondary" @click="exitToTitle" />
        <Button :label="$t('settings.deleteGame')" icon="pi pi-trash" severity="danger" outlined @click="remove" />
      </div>
      <p class="small faint" style="margin-bottom:0">{{ $t('backup.deleteNote') }}</p>
    </div>
  </div>
</template>

<style scoped>
.pref { display: flex; align-items: center; gap: 12px; padding: 8px 0; cursor: pointer; }
.block { display: block; }
.backups { display: flex; flex-direction: column; gap: 8px; }
.backup { gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--tint-1); }
.backup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.backup-grid .span-2 { grid-column: 1 / -1; }
.link-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 4px 0; border: 0; background: none; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }
.link-btn:hover { color: var(--ink); }
@media (max-width: 420px) { .pref { flex-wrap: wrap; } .backup-grid { grid-template-columns: 1fr; } .backup { flex-wrap: wrap; } }
</style>
