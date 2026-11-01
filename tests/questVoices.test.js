import { describe, it, expect } from 'vitest'
import { QUEST_VOICES, welcomeKind } from '../src/game/data/questVoices.js'
import { QUESTS } from '../src/game/data/progression.js'
import { VOICES } from '../src/game/voices.js'
import { te } from '../src/i18n/index.js'

describe('quest givers', () => {
  it('speak for every quest in a voice that exists, and thank the hero for it', () => {
    expect(Object.keys(QUEST_VOICES).sort()).toEqual(QUESTS.map(q => q.id).sort())
    for (const [id, voice] of Object.entries(QUEST_VOICES)) {
      expect(VOICES[voice], `${id}: ${voice}`).toBeTruthy()
      expect(te(`questThanks.${id}`), id).toBe(true)
    }
  })
})

describe('the welcome back', () => {
  it('grows warmer the longer the hero was away', () => {
    const h = 3600
    expect(welcomeKind(20 * 60)).toBe('short')
    expect(welcomeKind(5 * h)).toBe('hours')
    expect(welcomeKind(20 * h)).toBe('day')
    expect(welcomeKind(3 * 24 * h)).toBe('days')
    expect(welcomeKind(30 * 24 * h)).toBe('long')
    for (const kind of ['short', 'hours', 'day', 'days', 'long']) expect(te(`offline.welcome.${kind}`), kind).toBe(true)
  })
})
