import { describe, expect, it } from 'vitest'
import { State } from '../src/State.js'
import { invalidFunctions, invalidNames } from './helpers/fixtures.js'

describe('State', () => {
  it('exposes the name it was given', () => {
    const state = new State('idle')

    expect(state.name).toBe('idle')
  })

  it('rejects a name that is not a non-empty string', () => {
    for (const invalidName of invalidNames) {
      expect(() => new State(invalidName)).toThrow(TypeError)
    }
  })

  it('runs its onEnter hook with the shared context', () => {
    const context = { visits: 0 }
    const state = new State('paid', {
      onEnter: (ctx) => {
        ctx.visits += 1
      },
    })

    state.enter(context)

    expect(context.visits).toBe(1)
  })

  it('does nothing when entered without an onEnter hook', () => {
    const state = new State('idle')

    expect(() => state.enter({})).not.toThrow()
  })

  it('rejects an onEnter that is not a function', () => {
    for (const invalidHook of invalidFunctions) {
      expect(() => new State('x', { onEnter: invalidHook })).toThrow(TypeError)
    }
  })

  it('runs its onExit hook with the shared context', () => {
    const context = { departures: 0 }
    const state = new State('paid', {
      onExit: (ctx) => {
        ctx.departures += 1
      },
    })

    state.exit(context)

    expect(context.departures).toBe(1)
  })

  it('does nothing when exited without an onExit hook', () => {
    const state = new State('idle')

    expect(() => state.exit({})).not.toThrow()
  })

  it('keeps onEnter and onExit independent of each other', () => {
    const calls = []
    const state = new State('paid', {
      onEnter: () => calls.push('enter'),
      onExit: () => calls.push('exit'),
    })

    state.enter({})
    state.exit({})

    expect(calls).toEqual(['enter', 'exit'])
  })

  it('rejects an onExit that is not a function', () => {
    for (const invalidHook of invalidFunctions) {
      expect(() => new State('x', { onExit: invalidHook })).toThrow(TypeError)
    }
  })
})
