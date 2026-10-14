import { describe, it, expect } from 'vitest'
import { G, state, newHero } from './helpers.js'
import { WALLET, walletLines } from '../src/game/data/wallet.js'
import { i18n } from '../src/i18n/index.js'

describe('the purse', () => {
  it('names every currency and where it comes from', () => {
    for (const w of WALLET) for (const k of ['name', 'from']) expect(i18n.global.te(`wallet.items.${w.id}.${k}`, 'en')).toBe(true)
  })

  it('shows each currency with its amount, and hides ascension shards until the first ascension', () => {
    newHero()
    state.tower.tokens = 12
    const ids = walletLines(G).map(w => w.id)
    expect(ids).toContain('gold')
    expect(ids).not.toContain('shards')
    expect(walletLines(G).find(w => w.id === 'tower').value).toBe(12)
    state.ascension.shards = 3
    expect(walletLines(G).find(w => w.id === 'shards').value).toBe(3)
  })
})
