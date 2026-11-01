<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { state } from '../game/engine.js'
import { speak, voicesOn } from '../game/voices.js'

/* Text that a character says: it appears letter by letter in step with their voice, and a click or a
   key shows the rest at once. Paragraphs are split on blank lines. The words not yet said keep their
   place, so nothing below moves while it plays. With voices off or less motion it simply shows */
const props = defineProps({
  text: { type: String, required: true },
  voice: { type: String, default: 'narrator' },
  // Whether to play it; when false (or changed to false) the whole text shows at once
  play: { type: Boolean, default: true },
  tag: { type: String, default: 'div' },
})
const emit = defineEmits(['done'])

const shown = ref(Infinity)
let line = null, raf = 0, startedAt = 0, at = []

const paragraphs = computed(() => {
  let offset = 0
  return props.text.split('\n\n').map(p => {
    const chars = [...p]
    const part = { chars, offset }
    offset += chars.length + 2
    return part
  })
})
const playing = computed(() => shown.value !== Infinity)

function finish() {
  cancelAnimationFrame(raf)
  line?.stop()
  line = null
  if (shown.value !== Infinity) { shown.value = Infinity; emit('done') }
}
function tick() {
  const t = (performance.now() - startedAt) / 1000
  let n = shown.value
  while (n < at.length && at[n] <= t) n++
  shown.value = n
  if (n >= at.length) finish()
  else raf = requestAnimationFrame(tick)
}
function start() {
  finish()
  if (!props.play || !voicesOn() || state.settings?.reduceMotion) return
  line = speak(props.text, props.voice)
  at = line.timeline.at
  shown.value = 0
  startedAt = performance.now() + 50
  raf = requestAnimationFrame(tick)
}
watch(() => [props.text, props.voice, props.play], start, { immediate: true })
onUnmounted(finish)
</script>

<template>
  <component :is="tag" class="spoken" :class="{ playing }" :aria-busy="playing" @click="finish" @keydown.enter.space="finish">
    <span v-if="playing" class="sr-only">{{ text }}</span>
    <p v-for="(p, i) in paragraphs" :key="i" :aria-hidden="playing || undefined">
      <template v-if="!playing">{{ p.chars.join('') }}</template>
      <template v-else><span>{{ p.chars.slice(0, Math.max(0, shown - p.offset)).join('') }}</span><span class="spoken-rest">{{ p.chars.slice(Math.max(0, shown - p.offset)).join('') }}</span></template>
    </p>
  </component>
</template>

<style scoped>
.spoken.playing { cursor: pointer; }
.spoken-rest { color: transparent; }
:where(.spoken) p { margin: 0; }
:where(.spoken) p + p { margin-top: 0.8em; }
</style>
