<script setup>
import { ref, computed, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { CHANGELOG } from '../game/data/changelog.js'
import { ITCH_URL, buildReport, fullText, issueUrl, sessionErrors } from '../game/feedback.js'
import GameIcon from './GameIcon.vue'

// A bug or an idea: the player writes it here, the game adds the details that help, and the player
// sends it where they like. Nothing leaves the game on its own
const { t, locale } = useI18n()
const kind = ref('bug')
const message = ref('')
const showReport = ref(false)
const kinds = computed(() => ['bug', 'idea'].map(id => ({ value: id, label: t(`feedback.kinds.${id}`) })))
const errors = sessionErrors().length

function hero() {
  const s = toRaw(state)
  const sum = G.summarize(s)
  const act = s.activity
  return {
    ...sum,
    rebirths: s.ascension?.count || 0,
    activity: !act ? '' : act.type === 'skill' ? `${act.skill} / ${act.action}` : `combat / ${act.kind} / ${act.target}${act.floor ? ` floor ${act.floor}` : ''}`,
  }
}
const report = () => buildReport({ version: CHANGELOG[0].version, locale: locale.value, hero: hero() })
const preview = computed(() => (showReport.value ? report() : ''))

async function copy() {
  try { await navigator.clipboard.writeText(fullText(message.value, report())); G.toast('scroll-unfurled', 'feedback.copied', {}, 'success'); return true }
  catch { G.toast('scroll-unfurled', 'settings.copyManually'); showReport.value = true; return false }
}
const open = url => window.open(url, '_blank', 'noopener')
async function toItch() { await copy(); open(ITCH_URL) }
function toGitHub() { open(issueUrl(kind.value, message.value, report())) }
</script>

<template>
  <div class="stack">
    <div class="panel pad">
      <h3 class="panel-title"><GameIcon name="quill-ink" /> {{ $t('feedback.title') }}</h3>
      <p class="small muted" style="margin-top:0">{{ $t('feedback.intro') }}</p>
      <SelectButton v-model="kind" :options="kinds" optionLabel="label" optionValue="value" :allowEmpty="false" size="small" />
      <label class="fb-label" for="fb-message">{{ $t(`feedback.ask.${kind}`) }}</label>
      <Textarea id="fb-message" v-model="message" rows="5" autoResize class="fb-text" :maxlength="3000" :placeholder="$t(`feedback.placeholder.${kind}`)" />
      <p v-if="errors" class="small fb-errors"><i class="pi pi-exclamation-triangle" /> {{ $t(errors === 1 ? 'feedback.errorsOne' : 'feedback.errorsMany', { n: errors }) }}</p>
      <div class="fb-actions">
        <Button :label="$t('feedback.itch')" icon="pi pi-comments" size="small" @click="toItch" />
        <Button :label="$t('feedback.github')" icon="pi pi-github" size="small" severity="secondary" outlined @click="toGitHub" />
        <Button :label="$t('feedback.copy')" icon="pi pi-copy" size="small" severity="secondary" text @click="copy" />
      </div>
      <p class="small faint">{{ $t('feedback.itchHint') }}</p>
    </div>

    <div class="panel pad">
      <button class="fb-fold" :aria-expanded="showReport" @click="showReport = !showReport">
        <i :class="showReport ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
        <span class="grow"><b>{{ $t('feedback.reportTitle') }}</b><span class="hint">{{ $t('feedback.reportHint') }}</span></span>
      </button>
      <pre v-if="showReport" class="fb-report">{{ preview }}</pre>
    </div>
  </div>
</template>

<style scoped>
.fb-text { width: 100%; }
.fb-label { display: block; margin: 14px 0 6px; font-size: 14px; }
.fb-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.fb-errors { color: var(--gold); margin: 8px 0 0; }
.fb-fold { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: start; cursor: pointer; }
.fb-fold i { color: var(--muted); }
.hint { display: block; font-size: 12.5px; color: var(--faint); margin-top: 2px; }
.fb-report { margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; background: var(--tint-2); border: 1px solid var(--line); font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 320px; overflow: auto; }
</style>
