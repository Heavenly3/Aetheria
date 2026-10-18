import { describe, it, expect } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { listBackups, writeBackup, readBackup } from '../src/game/backup.js'
import { TEXT_SIZES, TOAST_LEVELS, zoomFor } from '../src/game/data/settings.js'
import { i18n } from '../src/i18n/index.js'

const DAY = 86400e3

describe('backups', () => {
  it('quietly does nothing where the browser has no IndexedDB', async () => {
    expect(await writeBackup(0, '{}', {})).toBe(true)
    expect(await listBackups(0)).toEqual([])
    expect(await readBackup(0, 'recent')).toBe(null)
    newHero()
    await expect(G.backupNow()).resolves.toBe(true)
  })

  it('reminds to keep a copy outside the browser only after long play, a week without one, and not too often', () => {
    newHero()
    const now = Date.now()
    state.stats.playTime = 3600
    expect(G.backupReminderDue(now)).toBe(false) // not enough play yet
    state.stats.playTime = 3 * 3600
    expect(G.backupReminderDue(now)).toBe(true)
    G.markExported()
    expect(G.backupReminderDue(now + DAY)).toBe(false) // a copy was just kept
    expect(G.backupReminderDue(now + 8 * DAY)).toBe(true)
    state.settings.remindedAt = now + 7 * DAY
    expect(G.backupReminderDue(now + 8 * DAY)).toBe(false) // reminded a day ago
    state.settings.backupReminder = false
    expect(G.backupReminderDue(now + 30 * DAY)).toBe(false)
  })
})

describe('settings', () => {
  it('has texts for every section, size and message level', () => {
    for (const id of ['game', 'display', 'sound', 'alerts', 'access', 'save', 'about']) expect(i18n.global.te(`settings.sections.${id}.name`, 'en')).toBe(true)
    for (const s of TEXT_SIZES) expect(i18n.global.te(`settings.textSizes.${s.id}`, 'en')).toBe(true)
    for (const l of TOAST_LEVELS) expect(i18n.global.te(`settings.toastLevels.${l}.desc`, 'en')).toBe(true)
    expect(zoomFor('normal')).toBe(1)
    expect(zoomFor('nonsense')).toBe(1)
  })

  it('starts with sensible defaults and turns the old quiet pop-ups into the new choice', () => {
    newHero()
    expect(state.settings).toMatchObject({ textSize: 'normal', toasts: 'all', goalBar: true, offlineSummary: true, backupReminder: true })
    state.settings.quietToasts = true
    G.migrateState()
    expect(state.settings.toasts).toBe('important')
    expect(state.settings.quietToasts).toBe(false)
  })
})
