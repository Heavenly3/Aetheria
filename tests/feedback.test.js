import { describe, it, expect, beforeEach } from 'vitest'
import { recordError, sessionErrors, clearErrors, onError, buildReport, issueUrl, fullText } from '../src/game/feedback.js'

describe('feedback', () => {
  beforeEach(clearErrors)

  it('keeps the last five errors and skips the noise browsers add', () => {
    for (let i = 0; i < 7; i++) recordError(new Error(`boom ${i}`))
    expect(recordError('Script error.')).toBe(null)
    expect(recordError({ message: 'ResizeObserver loop completed with undelivered notifications.' })).toBe(null)
    expect(sessionErrors().map(e => e.msg)).toEqual(['boom 2', 'boom 3', 'boom 4', 'boom 5', 'boom 6'])
  })

  it('tells listeners about each error kept', () => {
    const seen = []
    const off = onError(e => seen.push(e.msg))
    recordError({ reason: { message: 'rejected' } }, 'promise')
    off()
    recordError(new Error('after'))
    expect(seen).toEqual(['rejected'])
  })

  it('builds a report with the version, the hero and the errors', () => {
    recordError(new Error('bad thing'), 'render')
    const text = buildReport({ version: '1.0.0-beta.10', locale: 'es', hero: { heroLevel: 12, totalLevel: 340, role: 'mage', difficulty: 'normal', playTime: 7200, rebirths: 2, activity: 'mining / iron' } })
    expect(text).toContain('Version: 1.0.0-beta.10')
    expect(text).toContain('Language: es')
    expect(text).toContain('Hero: level 12, total skill level 340, mage, normal')
    expect(text).toContain('Play time: 2.0 h, rebirths: 2')
    expect(text).toContain('Errors this session (1):')
    expect(text).toContain('bad thing [render]')
  })

  it('opens a GitHub issue with the message first and keeps the address short enough', () => {
    const url = new URL(issueUrl('bug', 'Gold did not go up\nmore details', 'Version: x'))
    expect(url.searchParams.get('title')).toBe('[Bug] Gold did not go up')
    expect(url.searchParams.get('labels')).toBe('bug')
    expect(url.searchParams.get('body')).toBe(fullText('Gold did not go up\nmore details', 'Version: x'))
    const long = new URL(issueUrl('idea', 'x'.repeat(9000), 'r'))
    expect(long.searchParams.get('body').length).toBeLessThanOrEqual(6002)
    expect(fullText('  ', 'r')).toContain('(no description)')
  })
})
