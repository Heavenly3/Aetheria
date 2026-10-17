/* =========================================================
   JOURNAL — the story, unlocked chapter by chapter and kept forever.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { CHAPTERS, CHAPTER_MAP, MEMORIES, NAMED, rollNames, rollName } from './data/journal.js'
import { QUESTS } from './data/progression.js'

// Where the next page of the story is earned; every other hint is a creature or a boss to beat
const GOAL_ROUTE = { firstQuest: '/quests', abyssGates: '/quests', smithing: '/skill/smithing', coldIron: '/skill/smithing', guild: '/guilds', crownWhole: '/crown' }

export const journalState = () => ({
  // names: the characters' names rolled for this save · chapters: id -> when it was unlocked · read: ids already read
  journal: { names: null, chapters: {}, read: {} },
})

export const journal = {
  ensureJournal() {
    const j = this.s.journal
    if (!j.names) j.names = rollNames()
    // Characters added after the save was made get a name of their own
    for (const [id, kind] of Object.entries(NAMED)) {
      if (j.names[id]) continue
      let n
      do n = rollName(Math.random, kind)
      while (Object.values(j.names).includes(n))
      j.names[id] = n
    }
    j.chapters ||= {}
    j.read ||= {}
    return j
  },
  // Names used in the texts; the ones already in the game stay fixed
  journalNames() { return { ...this.ensureJournal().names, edmund: 'Edmund', morwen: 'Morwen' } },
  chapterUnlocked(id) { return !!this.s.journal.chapters[id] },
  // The one next thing worth doing, for the goal bar: a quest to hand in, the ending to choose,
  // or else the next page of the story
  nextGoal() {
    const q = QUESTS.find(x => this.questReady(x))
    if (q) return { kind: 'quest', to: '/quests', icon: 'scroll-unfurled', quest: q }
    if (this.canChooseEnding?.()) return { kind: 'ending', to: '/crown', icon: 'crown' }
    // Omens come by luck, so waiting for one is no goal
    const c = CHAPTERS.find(x => x.act !== 'festivals' && !x.ending && x.hint !== 'firstOmen' && !this.chapterUnlocked(x.id))
    return c ? { kind: 'story', to: GOAL_ROUTE[c.hint] || '/combat', icon: c.icon, hint: c.hint, act: c.act } : null
  },
  memoryUnlocked(m) { return (this.s.ascension?.count || 0) >= m.n },
  // Everything new the hero has not opened yet: chapters, and memories of past lives
  journalUnread() {
    const j = this.s.journal
    let n = 0
    for (const id in j.chapters) if (!j.read[id]) n++
    for (const m of MEMORIES) if (this.memoryUnlocked(m) && !j.read[m.id]) n++
    return n
  },
  readJournal(id) { this.s.journal.read[id] = true },
  // Called on a timer; unlocks every chapter whose moment has come. `quiet` (on load) skips the fanfare,
  // so a save from before the journal does not announce everything at once
  checkJournal(quiet = false) {
    this.checkCrown?.(quiet)
    const j = this.ensureJournal()
    for (const c of CHAPTERS) {
      if (j.chapters[c.id]) continue
      let ok = false
      try { ok = c.check(this) } catch { ok = false }
      if (!ok) continue
      j.chapters[c.id] = Date.now()
      // The first page is there from the start: no fanfare for it
      if (quiet || c.id === 'awakening') continue
      this.log(c.icon, 'log.chapter', { chapter: '@chapter:' + c.id })
      this.emit('chapter', CHAPTER_MAP[c.id])
    }
  },
}
