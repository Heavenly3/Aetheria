<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { G } from '../game/engine.js'
import { ALPHABET, plain, shiftText } from '../game/data/enigmas.js'

// The sealed letter: the dials turn the letters back, and the place it names is typed in
const props = defineProps({ affair: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['answer'])
const { t } = useI18n()
const e = computed(() => props.affair.enigma)
// Written in the language being played, then shifted
const clear = computed(() => plain(t(`affairs.messages.${e.value.message}`, { word: t(`affairs.wordsWith.${e.value.word}`) })))
const coded = computed(() => shiftText(clear.value, e.value.key))
const dials = ref(Array(e.value.key.length).fill(0))
const turn = (i, d) => { dials.value[i] = (dials.value[i] + d + 26) % 26 }
const reading = computed(() => shiftText(coded.value, dials.value, -1))

// What the leads and hints have told about the key
const known = computed(() => G.affairKnown())
const keyLine = computed(() => {
  const a = props.affair, k = e.value.key
  if (k.length === 3) {
    const shown = Math.min(3, Math.floor(3 * known.value))
    return shown ? t('affairs.cipher.keyWord', { word: k.map((s, i) => (i < shown ? ALPHABET[s] : '_')).join(' ') }) : t('affairs.cipher.keyHidden')
  }
  if (known.value < 0.5) return t('affairs.cipher.keyHidden')
  if (a.level === 0) return t('affairs.cipher.keyShift', { n: k[0] })
  // One letter of the letter, coded and plain
  const i = [...clear.value].findIndex(ch => ch !== ' ')
  return t('affairs.cipher.keyPair', { a: coded.value[i], b: clear.value[i] })
})

// A guild mate's help: the first letters of the place
const starts = computed(() => {
  const n = props.affair.lettersShown || 0
  return n ? plain(t(`affairs.words.${e.value.word}`)).slice(0, n) : ''
})
const answer = ref('')
</script>

<template>
  <div class="cipher">
    <div class="sheet">
      <div class="small muted">{{ $t('affairs.cipher.letter') }}</div>
      <p class="coded">{{ coded }}</p>
      <div class="small muted">{{ $t('affairs.cipher.reading') }}</div>
      <p class="reading">{{ reading }}</p>
    </div>
    <p class="cipher-key small">{{ keyLine }}</p>
    <p v-if="starts" class="cipher-key small ok-text">{{ $t('affairs.cipher.starts', { letters: starts.split('').join(' ') }) }}</p>

    <div class="dials">
      <div v-for="(d, i) in dials" :key="i" class="dial">
        <div class="small muted">{{ $t('affairs.cipher.dial', { n: i + 1 }) }}</div>
        <div class="row" style="gap:6px">
          <Button icon="pi pi-chevron-left" size="small" text :aria-label="'-1'" @click="turn(i, -1)" />
          <b class="tnum dial-face">{{ ALPHABET[d] }} <small class="muted">{{ d }}</small></b>
          <Button icon="pi pi-chevron-right" size="small" text :aria-label="'+1'" @click="turn(i, 1)" />
        </div>
      </div>
    </div>

    <form class="row wrap answer" @submit.prevent="answer.trim() && emit('answer', answer)">
      <label class="small muted" for="cipher-answer">{{ $t('affairs.cipher.answer') }}</label>
      <InputText id="cipher-answer" v-model="answer" size="small" autocomplete="off" :disabled="disabled" />
      <Button type="submit" :label="$t('affairs.cipher.check')" size="small" :disabled="disabled || !answer.trim()" />
    </form>
  </div>
</template>

<style scoped>
.sheet { padding: 12px 14px; border-radius: 10px; background: color-mix(in srgb, #c9a04a 10%, var(--panel)); border: 1px solid color-mix(in srgb, #c9a04a 35%, var(--line)); }
.coded, .reading { margin: 4px 0 10px; font-family: ui-monospace, Consolas, monospace; letter-spacing: 0.18em; word-break: break-word; line-height: 1.6; }
.coded { color: var(--ink-2); }
.reading { color: color-mix(in srgb, var(--gold) 72%, var(--ink)); margin-bottom: 0; }
.cipher-key { margin: 10px 0; font-style: italic; color: var(--ink-2); }
.dials { display: flex; flex-wrap: wrap; gap: 14px; }
.dial { padding: 6px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--tint-1); }
.dial-face { min-width: 52px; text-align: center; font-size: 18px; }
.answer { gap: 8px; margin-top: 14px; }
</style>
