import { describe, it, expect, beforeEach } from 'vitest'
import { BOSS_VOICES, BOSS_LINE_KINDS, BOSS_LINE_COOLDOWN } from '../src/game/data/bossLines.js'
import { BOSSES, DUNGEONS } from '../src/game/data/combat.js'
import { BOSS_PHASES } from '../src/game/data/fighting.js'
import { ECHOES } from '../src/game/data/echoes.js'
import { VOICES } from '../src/game/voices.js'
import { speakerOf, mayTalk, forgetTalk } from '../src/ui/bossTalk.js'
import { t, te } from '../src/i18n/index.js'

describe('boss lines', () => {
  beforeEach(forgetTalk)

  it('cover every world and dungeon boss, each with a voice and a line for every moment', () => {
    const bosses = [...BOSSES.map(b => b.id), ...DUNGEONS.map(d => d.boss?.id).filter(Boolean)]
    expect(Object.keys(BOSS_VOICES).sort()).toEqual([...new Set(bosses)].sort())
    for (const [id, voice] of Object.entries(BOSS_VOICES)) {
      expect(VOICES[voice], voice).toBeTruthy()
      for (const kind of BOSS_LINE_KINDS) expect(te(`bossLines.${id}.${kind}`), `${id}.${kind}`).toBe(true)
    }
  })

  it('have a line for each phase a boss goes through', () => {
    for (const ph of BOSS_PHASES) expect(BOSS_LINE_KINDS).toContain(ph.id)
  })

  it('let an echo speak as the boss it echoes, and other creatures stay quiet', () => {
    const echo = ECHOES.find(e => e.echoOf === 'kraken')
    expect(speakerOf(echo)).toBe('kraken')
    expect(speakerOf({ id: 'goblin' })).toBe(null)
    expect(t('bossLines.kraken.intro')).not.toBe('bossLines.kraken.intro')
  })

  it('say each line at most once in a while', () => {
    const now = 1_000_000
    expect(mayTalk('kraken', 'intro', now)).toBe(true)
    expect(mayTalk('kraken', 'intro', now + 60e3)).toBe(false)
    expect(mayTalk('kraken', 'defeat', now + 60e3)).toBe(true)
    expect(mayTalk('naga', 'intro', now + 60e3)).toBe(true)
    expect(mayTalk('kraken', 'intro', now + BOSS_LINE_COOLDOWN)).toBe(true)
  })
})
