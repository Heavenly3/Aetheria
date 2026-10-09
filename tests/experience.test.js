import { describe, it, expect, beforeEach } from 'vitest'
import { G, state, newHero, run } from './helpers.js'
import { STEPS, TUTORIAL_REWARD, currentStep, checkTutorial, skipTutorial, startTutorial } from '../src/game/tutorial.js'
import { encodeCode, decodeAny, makeLink } from '../src/game/transfer.js'

describe('tutorial', () => {
  beforeEach(() => newHero())

  it('starts for a new hero but not for an old save', () => {
    expect(state.tutorial.done).toBe(false)
    expect(currentStep().id).toBe('openMining')
    const old = JSON.parse(JSON.stringify(state))
    delete old.tutorial
    G.loadSave(old)
    expect(state.tutorial.done).toBe(true)
  })

  it('advances on screens, actions and counted goals', () => {
    expect(checkTutorial('/inventory')).toBe(false)
    expect(checkTutorial('/skill/mining')).toBe(true)
    G.startSkill('mining', 'copper_ore')
    expect(checkTutorial('/skill/mining')).toBe(true)
    expect(currentStep().id).toBe('gatherOre')
    // Ore the hero already had does not count, only what is gathered during the step
    expect(checkTutorial('/skill/mining')).toBe(false)
    run(60)
    expect(checkTutorial('/skill/mining')).toBe(true)
    expect(currentStep().id).toBe('openSmithing')
  })

  it('pays a reward at the end and can be skipped or restarted', () => {
    state.tutorial.step = STEPS.length - 1
    const gold = state.gold
    checkTutorial(STEPS[STEPS.length - 1].route) // the last step: the journal
    expect(state.tutorial.done).toBe(true)
    expect(state.gold).toBe(gold + TUTORIAL_REWARD)
    startTutorial()
    expect(currentStep().id).toBe('openMining')
    skipTutorial()
    expect(currentStep()).toBe(null)
    expect(state.gold).toBe(gold + TUTORIAL_REWARD)
  })
})

describe('save transfer', () => {
  beforeEach(() => newHero({ name: 'Ñandú' }))

  it('round-trips a save through a compressed code', async () => {
    state.gold = 12345
    const code = await encodeCode(JSON.parse(JSON.stringify(state)))
    expect(code.startsWith('AE1.')).toBe(true)
    expect(code).not.toMatch(/[+/=]/)
    const back = await decodeAny(code)
    expect(back.name).toBe('Ñandú')
    expect(back.gold).toBe(12345)
  })

  it('reads links, file contents and the old export codes', async () => {
    globalThis.location ??= { href: 'https://example.com/game/' }
    const save = JSON.parse(JSON.stringify(state))
    expect((await decodeAny(await makeLink(save))).name).toBe('Ñandú')
    expect((await decodeAny(JSON.stringify({ game: 'aetheria', format: 1, save }))).name).toBe('Ñandú')
    expect((await decodeAny(G.exportSave())).name).toBe('Ñandú')
  })

  it('rejects anything that is not a save', async () => {
    await expect(decodeAny('hello')).rejects.toThrow()
    await expect(decodeAny('{"foo":1}')).rejects.toThrow()
  })
})
