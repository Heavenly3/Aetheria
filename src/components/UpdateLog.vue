<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHANGELOG } from '../game/data/changelog.js'
import { LOCALES } from '../i18n/index.js'
import ItemTile from './ItemTile.vue'
import UpdateNotes from './UpdateNotes.vue'

// Every update, newest first; the newest one starts open
const { locale } = useI18n()
const open = ref({ [CHANGELOG[0].id]: true })
const date = d => new Date(d + 'T12:00:00').toLocaleDateString(LOCALES[locale.value]?.intl, { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <div class="log">
    <div v-for="e in CHANGELOG" :key="e.id" class="upd" :class="{ open: open[e.id] }">
      <button class="upd-head" :aria-expanded="!!open[e.id]" @click="open[e.id] = !open[e.id]">
        <ItemTile :icon="e.icon" size="sm" :tip="false" />
        <span class="grow">
          <span class="upd-title">{{ $t(`changelog.entries.${e.id}.title`) }}</span>
          <span class="small muted">{{ e.version ? `${$t('changelog.beta', { v: e.version.split('beta.')[1] })} · ${date(e.date)}` : $t('changelog.live') }}</span>
        </span>
        <i class="pi muted" :class="open[e.id] ? 'pi-angle-up' : 'pi-angle-down'" />
      </button>
      <UpdateNotes v-if="open[e.id]" :entry="e" class="upd-body" />
    </div>
  </div>
</template>

<style scoped>
.upd { border-top: 1px solid var(--line); }
.upd:first-child { border-top: 0; }
.upd-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 0; background: none; border: 0; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.upd-title { display: block; font-weight: 700; }
.upd-body { padding: 0 0 14px 52px; }
@media (max-width: 520px) { .upd-body { padding-inline-start: 0; } }
</style>
