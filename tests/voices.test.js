import { describe, it, expect } from 'vitest'
import { timeline, VOICES, VOICE_SPEEDS } from '../src/game/voices.js'
import { CHARACTERS } from '../src/game/data/journal.js'

describe('character voices', () => {
  it('give every character of the journal a voice of their own', () => {
    for (const c of CHARACTERS) expect(VOICES[c.id], c.id).toBeTruthy()
  })

  it('say the same text the same way every time', () => {
    const a = timeline('Welcome back, friend!', 'keeper')
    const b = timeline('Welcome back, friend!', 'keeper')
    expect(a).toEqual(b)
    expect(a.at).toHaveLength([...'Welcome back, friend!'].length)
  })

  it('show every letter in order and pause on punctuation', () => {
    const { at } = timeline('Hi. Yes', 'keeper')
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThanOrEqual(at[i - 1])
    // the pause after the full stop is far longer than between two letters
    expect(at[4] - at[2]).toBeGreaterThan((at[1] - at[0]) * 5)
  })

  it('raise a question at its end and let a statement fall', () => {
    const ask = timeline('Are you coming with us today?', 'keeper').sylls
    const tell = timeline('Are you coming with us today.', 'keeper').sylls
    expect(ask.at(-1).freq).toBeGreaterThan(tell.at(-1).freq)
  })

  it('talk at each character’s own pace and pitch', () => {
    const line = 'The sky remembers everything.'
    expect(timeline(line, 'wyrm').length).toBeGreaterThan(timeline(line, 'keeper').length)
    const avg = id => { const s = timeline(line, id).sylls; return s.reduce((a, x) => a + x.freq, 0) / s.length }
    expect(avg('winter')).toBeGreaterThan(avg('smith') * 2)
  })

  it('read slower or faster as chosen in the settings', () => {
    const line = 'Pull up a stool, friend. The ale is still warm.'
    const slow = timeline(line, 'keeper', VOICE_SPEEDS.slow).length
    const fast = timeline(line, 'keeper', VOICE_SPEEDS.fast).length
    expect(slow).toBeGreaterThan(timeline(line, 'keeper').length)
    expect(fast).toBeLessThan(timeline(line, 'keeper').length)
  })

  it('works with accents and other scripts', () => {
    const { sylls, at } = timeline('¿Quién está ahí?', 'narrator')
    expect(at).toHaveLength([...'¿Quién está ahí?'].length)
    expect(sylls.length).toBeGreaterThan(3)
  })
})
