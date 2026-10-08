/* =========================================================
   JOURNAL — the story, unlocked chapter by chapter and kept forever.
   Mixed into G (engine.js); `this` is the engine.
   ========================================================= */
import { CHAPTERS, CHAPTER_MAP, MEMORIES, rollNames } from './data/journal.js'

export const journalState = () => ({
  // names: the characters' names rolled for this save · chapters: id -> when it was unlocked · read: ids already read
  journal: { names: null, chapters: {}, read: {} },
})

export const journal = {
  ensureJournal() {
    const j = this.s.journal
    if (!j.names) j.names = rollNames()
    j.chapters ||= {}
    j.read ||= {}
    return j
  },
  // Names used in the texts; the ones already in the game stay fixed
  journalNames() { return { ...this.ensureJournal().names, edmund: 'Edmund', morwen: 'Morwen' } },
  chapterUnlocked(id) { return !!this.s.journal.chapters[id] },
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
