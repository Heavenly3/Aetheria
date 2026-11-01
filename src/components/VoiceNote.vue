<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SpokenText from './SpokenText.vue'

// A line of text with a small speaker: pressing it has `voice` say the line, pressing again stops
const props = defineProps({
  text: { type: String, required: true },
  voice: { type: String, default: 'narrator' },
  // Who speaks, for the button's name
  who: { type: String, default: '' },
})
const { t } = useI18n()
const playing = ref(false)
const label = () => (playing.value ? t('voice.stop') : props.who ? t('voice.hear', { name: props.who }) : t('voice.listen'))
</script>

<template>
  <div class="voice-note">
    <SpokenText class="grow" :text="text" :voice="voice" :play="playing" @done="playing = false" />
    <button class="voice-btn" :class="{ on: playing }" :aria-label="label()" v-tooltip.top="label()" @click="playing = !playing">
      <i :class="playing ? 'pi pi-stop' : 'pi pi-volume-up'" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.voice-note { display: flex; align-items: flex-start; gap: 8px; }
.voice-btn { flex-shrink: 0; width: 28px; height: 28px; margin-top: -2px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 8px; background: none; color: var(--voice-c, var(--gold)); cursor: pointer; font-size: 12px; }
.voice-btn:hover, .voice-btn.on { background: color-mix(in srgb, var(--voice-c, var(--gold)) 14%, transparent); border-color: color-mix(in srgb, var(--voice-c, var(--gold)) 45%, var(--line)); }
</style>
