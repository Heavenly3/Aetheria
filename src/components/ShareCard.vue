<script setup>
import { ref, watch, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { state } from '../game/engine.js'
import { drawCard } from '../ui/heroCard.js'

// A picture of the hero, or of one find, to save or share. It is made on the device when opened
const visible = defineModel('visible', { type: Boolean })
const props = defineProps({ item: { type: String, default: null } })
const url = ref(null)
const failed = ref(false)
const note = ref('')
let blob = null

const canShare = ref(false)
const canCopy = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
const fileName = () => `aetheria-${(state.name || 'hero').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hero'}${props.item ? '-' + props.item : ''}.png`
const file = () => new File([blob], fileName(), { type: 'image/png' })

function clear() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = null
  blob = null
}
async function make() {
  clear()
  failed.value = false
  note.value = ''
  try {
    blob = await drawCard(props.item ? 'find' : 'hero', props.item)
    url.value = URL.createObjectURL(blob)
    canShare.value = !!navigator.canShare?.({ files: [file()] })
  } catch {
    failed.value = true
  }
}
watch(visible, v => (v ? make() : clear()), { immediate: true })
onUnmounted(clear)

async function share() {
  try { await navigator.share({ files: [file()], text: 'Aetheria' }) } catch { /* closed or not allowed */ }
}
async function copy() {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    note.value = 'share.copied'
  } catch {
    note.value = 'share.copyFailed'
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="$t(item ? 'share.findTitle' : 'share.title')" style="width: min(680px, calc(100vw - 24px))">
    <div class="share">
      <div class="share-frame">
        <img v-if="url" :src="url" :alt="$t(item ? 'share.findTitle' : 'share.title')" />
        <p v-else-if="failed" class="small muted">{{ $t('share.failed') }}</p>
        <i v-else class="pi pi-spin pi-spinner" aria-hidden="true" />
      </div>
      <p class="small faint">{{ $t('share.hint') }}</p>
      <div class="row wrap share-actions">
        <Button v-if="canShare" :label="$t('share.share')" icon="pi pi-share-alt" :disabled="!url" @click="share" />
        <a v-if="url" class="p-button p-component" :class="{ 'p-button-outlined p-button-secondary': canShare }" :href="url" :download="fileName()">
          <i class="pi pi-download p-button-icon p-button-icon-left" aria-hidden="true" /><span class="p-button-label">{{ $t('share.download') }}</span>
        </a>
        <Button v-if="canCopy" :label="$t('share.copy')" icon="pi pi-copy" severity="secondary" outlined :disabled="!url" @click="copy" />
      </div>
      <p v-if="note" class="small muted" role="status">{{ $t(note) }}</p>
    </div>
  </Dialog>
</template>

<style scoped>
.share { display: flex; flex-direction: column; gap: 10px; }
.share-frame { aspect-ratio: 16 / 9; display: grid; place-items: center; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #0c0b14; color: var(--muted); }
.share-frame img { width: 100%; height: 100%; display: block; }
.share-actions { gap: 8px; justify-content: flex-end; }
.share-actions a { text-decoration: none; }
</style>
