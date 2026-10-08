<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { G, state } from '../game/engine.js'
import { ACTS, CHAPTERS, CHARACTERS, MEMORIES } from '../game/data/journal.js'
import GameIcon from '../components/GameIcon.vue'
import ItemTile from '../components/ItemTile.vue'

const { t } = useI18n()
const tab = ref('story')
const tabs = computed(() => ['story', 'people', 'memories'].map(v => ({ value: v, label: t(`journal.tabs.${v}`) })))

const names = computed(() => G.journalNames())
const j = computed(() => state.journal)
const isNew = id => !j.value.read[id]
const chaptersOf = act => CHAPTERS.filter(c => c.act === act)
const unlockedCount = computed(() => CHAPTERS.filter(c => G.chapterUnlocked(c.id)).length + MEMORIES.filter(m => G.memoryUnlocked(m)).length)
const total = CHAPTERS.length + MEMORIES.length
const unread = computed(() => G.journalUnread())

// One page is open at a time; opening it marks it as read
const open = ref(null)
function toggle(id) {
  open.value = open.value === id ? null : id
  if (open.value) G.readJournal(id)
}
const paragraphs = key => t(key, names.value).split('\n\n')
function readAll() {
  CHAPTERS.forEach(c => { if (G.chapterUnlocked(c.id)) G.readJournal(c.id) })
  MEMORIES.forEach(m => { if (G.memoryUnlocked(m)) G.readJournal(m.id) })
}
</script>

<template>
  <div>
    <div class="panel pad" style="margin-bottom:18px">
      <div class="row wrap">
        <p class="intro grow" style="margin:0;flex-basis:260px">{{ $t('journal.intro') }}</p>
        <span class="tag gold tnum"><GameIcon name="quill-ink" :size="13" /> {{ $t('journal.progress', { n: unlockedCount, total }) }}</span>
        <Button v-if="unread" :label="$t('journal.readAll')" icon="pi pi-check" size="small" severity="secondary" outlined @click="readAll" />
      </div>
      <div class="bar thick" style="margin-top:14px"><i :style="{ width: (unlockedCount / total) * 100 + '%' }" /></div>
    </div>

    <SelectButton v-model="tab" :options="tabs" optionLabel="label" optionValue="value" :allowEmpty="false" style="margin-bottom:18px" />

    <!-- The story, act by act -->
    <template v-if="tab === 'story'">
      <section v-for="a in ACTS" :key="a.id" class="act">
        <div class="section-title"><GameIcon :name="a.icon" :size="15" /> {{ $t(`journal.acts.${a.id}`) }}</div>
        <p v-if="a.soon" class="soon small faint">{{ $t('journal.soon') }}</p>
        <div v-for="c in chaptersOf(a.id)" :key="c.id" class="page" :class="{ locked: !G.chapterUnlocked(c.id), open: open === c.id }">
          <button v-if="G.chapterUnlocked(c.id)" class="page-head" :aria-expanded="open === c.id" @click="toggle(c.id)">
            <ItemTile :icon="c.icon" size="sm" :tip="false" />
            <span class="grow page-title">{{ $t(`journal.chapters.${c.id}.title`) }}</span>
            <span v-if="isNew(c.id)" class="tag gold">{{ $t('journal.new') }}</span>
            <i class="pi muted" :class="open === c.id ? 'pi-angle-up' : 'pi-angle-down'" />
          </button>
          <div v-else class="page-head">
            <ItemTile icon="padlock" tint="#2a2838" size="sm" :tip="false" />
            <span class="grow">
              <span class="page-title faint">{{ $t('journal.locked') }}</span>
              <span class="small muted hint">{{ $t(`journal.hints.${c.hint}`) }}</span>
            </span>
          </div>
          <div v-if="open === c.id" class="page-text">
            <p v-for="(p, i) in paragraphs(`journal.chapters.${c.id}.text`)" :key="i">{{ p }}</p>
          </div>
        </div>
      </section>
    </template>

    <!-- The people met along the way -->
    <div v-else-if="tab === 'people'" class="grid-wide">
      <div v-for="p in CHARACTERS" :key="p.id" class="card person" :class="{ unknown: !G.chapterUnlocked(p.met) }" :style="{ '--c': p.tint }">
        <div class="row">
          <ItemTile :icon="G.chapterUnlocked(p.met) ? p.icon : 'hood'" :tint="G.chapterUnlocked(p.met) ? p.tint : '#2a2838'" size="md" :tip="false" />
          <div class="grow" style="min-width:0">
            <template v-if="G.chapterUnlocked(p.met)">
              <div class="card-name">{{ $t(`journal.people.${p.id}.name`, names) }}</div>
              <div class="card-sub">{{ $t(`journal.people.${p.id}.role`) }}</div>
            </template>
            <template v-else>
              <div class="card-name">???</div>
              <div class="card-sub">{{ $t('journal.unknownPerson') }}</div>
            </template>
          </div>
        </div>
        <p v-if="G.chapterUnlocked(p.met)" class="small muted" style="margin:10px 0 0">{{ $t(`journal.people.${p.id}.desc`, names) }}</p>
      </div>
    </div>

    <!-- Memories of past lives, one per ascension -->
    <template v-else>
      <p class="intro">{{ $t('journal.memoriesIntro') }}</p>
      <div v-for="m in MEMORIES" :key="m.id" class="page" :class="{ locked: !G.memoryUnlocked(m), open: open === m.id }">
        <button v-if="G.memoryUnlocked(m)" class="page-head" :aria-expanded="open === m.id" @click="toggle(m.id)">
          <ItemTile icon="ankh" tint="#a98bff" size="sm" :tip="false" />
          <span class="grow page-title">{{ $t(`journal.memories.${m.id}.title`) }}</span>
          <span v-if="isNew(m.id)" class="tag gold">{{ $t('journal.new') }}</span>
          <i class="pi muted" :class="open === m.id ? 'pi-angle-up' : 'pi-angle-down'" />
        </button>
        <div v-else class="page-head">
          <ItemTile icon="padlock" tint="#2a2838" size="sm" :tip="false" />
          <span class="grow">
            <span class="page-title faint">{{ $t('journal.locked') }}</span>
            <span class="small muted hint">{{ $t('journal.memoryLocked', { n: m.n }) }}</span>
          </span>
        </div>
        <div v-if="open === m.id" class="page-text">
          <p v-for="(p, i) in paragraphs(`journal.memories.${m.id}.text`)" :key="i">{{ p }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.act { margin-bottom: 8px; }
.act .section-title { display: flex; align-items: center; gap: 8px; }
.soon { margin: -4px 0 14px; font-style: italic; }
.page { border-radius: var(--radius); background: var(--panel); border: 1px solid var(--line); margin-bottom: 10px; overflow: hidden; }
.page.open { border-color: var(--line-hi); }
.page.locked { opacity: 0.6; }
.page-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; background: none; border: 0; color: inherit; font: inherit; text-align: start; }
button.page-head { cursor: pointer; }
button.page-head:hover { background: var(--tint-1); }
.page-title { display: block; font-family: var(--font-display); font-size: 17px; letter-spacing: 0.03em; }
.hint { display: block; margin-top: 2px; }
/* The open page reads like a book */
.page-text { padding: 4px 22px 20px 70px; max-width: 78ch; }
.page-text p { margin: 0 0 12px; font-size: 16.5px; line-height: 1.7; color: var(--ink-2); }
.page-text p:first-child::first-letter { font-family: var(--font-display); font-size: 2.4em; float: inline-start; line-height: 0.9; margin: 4px 8px 0 0; color: var(--gold); }
.person.unknown { opacity: 0.6; }
@media (max-width: 640px) { .page-text { padding: 2px 16px 16px; } }
</style>
