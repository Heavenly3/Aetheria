import { describe, it, expect, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { G, state, newHero } from './helpers.js'
import { fmt, fmtDec, fmtNum, fmtHour } from '../src/game/format.js'
import { throttled } from '../src/ui/throttled.js'
import { setLocale } from '../src/i18n/index.js'

describe('number formatting', () => {
  it('follows the active language with cached formatters', async () => {
    await setLocale('en')
    expect(fmt(1234)).toBe('1,234')
    expect(fmt(12_345)).toBe('12.3K')
    expect(fmt(2_500_000)).toBe('2.5M')
    expect(fmtDec(1.25, 1)).toBe('1.3')
    expect(fmtNum(5000)).toBe('5,000')
    await setLocale('es')
    expect(fmt(12_345)).toBe('12,3K')
    expect(fmtDec(1.5)).toBe('1,5')
    expect(fmtNum(50000)).toBe('50.000')
    expect(fmtHour(new Date(2026, 0, 1, 9, 5).getTime())).toBe('09:05')
    await setLocale('en')
  })
})

describe('throttled values', () => {
  it('refreshes at most once per interval, however often its inputs change', async () => {
    vi.useFakeTimers()
    try {
      newHero()
      const fn = vi.fn(() => state.hp)
      const scope = effectScope()
      const v = scope.run(() => throttled(fn, 1000))
      expect(fn).toHaveBeenCalledTimes(1)
      for (let i = 0; i < 10; i++) { state.hp = i + 1; await nextTick() }
      expect(fn).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1000)
      expect(fn).toHaveBeenCalledTimes(2)
      expect(v.value).toBe(10)
      // Stopped with its component: no more work
      state.hp = 3
      scope.stop()
      vi.advanceTimersByTime(1000)
      expect(fn).toHaveBeenCalledTimes(2)
    } finally { vi.useRealTimers() }
  })

  it('shares the modifier cache across the refreshes that fall due together', async () => {
    vi.useFakeTimers()
    try {
      newHero()
      const spy = vi.spyOn(G, 'modNow')
      const scope = effectScope()
      scope.run(() => { for (let i = 0; i < 5; i++) throttled(() => (void state.hp, G.mod('speed')), 1000) })
      state.hp = 5
      await nextTick()
      spy.mockClear()
      vi.advanceTimersByTime(1000)
      expect(spy).toHaveBeenCalledTimes(1)
      scope.stop()
    } finally { vi.useRealTimers() }
  })
})
