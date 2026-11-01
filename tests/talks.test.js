import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { TALKS, talksFor, CHARACTERS, RUMORS } from '../src/game/data/journal.js'
import { te } from '../src/i18n/index.js'

describe('talking to the people of the journal', () => {
  beforeEach(() => newHero())

  it('gives everyone met in the story something to say, and every line its text', () => {
    for (const c of CHARACTERS) if (c.id !== 'keeper') expect(TALKS[c.id], c.id).toBeTruthy()
    for (const [who, lines] of Object.entries(TALKS)) for (const l of lines) expect(te(`journal.talk.${who}.${l.id}`), `${who}.${l.id}`).toBe(true)
    for (const r of RUMORS) expect(te(`journal.rumors.${r.id}`), r.id).toBe(true)
  })

  it('lets them say more as the story goes on', () => {
    const before = talksFor(G, 'priest').length
    expect(talksFor(G, 'astrologer').map(l => l.id)).not.toContain('prophecy')
    state.journal.chapters.empty_tomb = Date.now()
    expect(talksFor(G, 'astrologer').map(l => l.id)).toContain('prophecy')
    expect(talksFor(G, 'priest')).toHaveLength(before)
    // The last king only speaks once he has been met as the Void Emperor
    expect(talksFor(G, 'king')).toEqual([])
    state.journal.chapters.the_emperor = Date.now()
    expect(talksFor(G, 'king').length).toBeGreaterThan(0)
  })
})
