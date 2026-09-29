import { describe, expect, it, vi } from 'vitest'
import { StateMachine } from '../../src/StateMachine.js'
import { BlockedTransitionError, NoTransitionError, UnknownStateError } from '../../src/errors.js'
import { expectSameItems } from '../helpers/expectSameItems.js'
import { invalidNames } from '../helpers/fixtures.js'
import { machineWithStates } from '../helpers/machineWithStates.js'

describe('StateMachine', () => {
  describe('send', () => {
    it('moves along the transition the event triggers', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      order.send('pay')

      expect(order.currentStateName).toBe('paid')
    })

    it('returns nothing, so that moving and asking stay separate', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(order.send('pay')).toBeUndefined()
    })

    it('follows several events in a row', () => {
      const order = machineWithStates('placed', 'paid', 'shipped')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })
      order.defineTransition({ from: 'paid', to: 'shipped', on: 'ship' })

      order.send('pay')
      expect(order.currentStateName).toBe('paid')

      order.send('ship')
      expect(order.currentStateName).toBe('shipped')
    })

    it('picks the transition that leaves its current state', () => {
      const order = machineWithStates('placed', 'paid', 'shipped')
      // Current state is 'placed', so the first transition is the one that matters
      order.defineTransition({ from: 'placed', to: 'paid', on: 'go' })
      order.defineTransition({ from: 'paid', to: 'shipped', on: 'go' })

      order.send('go')

      expect(order.currentStateName).toBe('paid')
    })

    it('can take a transition that starts and ends in the same state', () => {
      const order = machineWithStates('placed')
      order.defineTransition({ from: 'placed', to: 'placed', on: 'edit' })

      order.send('edit')

      expect(order.currentStateName).toBe('placed')
    })

    it('refuses an event that has no transition from the current state', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('ship')).toThrow(NoTransitionError)
    })

    it('names both the state and the event in the error it throws', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('ship')).toThrow(/placed/)
      expect(() => order.send('ship')).toThrow(/ship/)
    })

    it('stays in the state it was in when it refuses the event', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('ship')).toThrow(NoTransitionError)

      expect(order.currentStateName).toBe('placed')
    })

    it('refuses an event whose transition leaves a state it is not in', () => {
      const currentStateName = 'placed'
      const otherStateName = 'paid'
      const order = machineWithStates(currentStateName, otherStateName, 'shipped')
      order.defineTransition({ from: otherStateName, to: 'shipped', on: 'ship' })

      expect(() => order.send('ship')).toThrow(NoTransitionError)
    })

    it('throws a TypeError when the event name is not a non-empty string', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      for (const invalidName of invalidNames) {
        expect(() => order.send(invalidName)).toThrow(TypeError)
      }
    })

    it('throws an UnknownStateError instead of a NoTransitionError when the starting state was never defined', () => {
      const order = new StateMachine('draft')
      order.defineState('placed').defineState('paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('pay')).toThrow(UnknownStateError)
      expect(() => order.send('pay')).toThrow(expect.objectContaining({ stateName: 'draft' }))
    })

    it('moves when the guard allows the transition', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => true })

      order.send('pay')

      expect(order.currentStateName).toBe('paid')
    })

    it('refuses the event when the guard blocks the transition', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })

      expect(() => order.send('pay')).toThrow(BlockedTransitionError)
    })

    it('stays in the state it was in when the guard blocks the transition', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })

      expect(() => order.send('pay')).toThrow(BlockedTransitionError)
      expect(order.currentStateName).toBe('placed')
    })

    it('runs no hook when the guard blocks the transition', () => {
      const calls = []
      const order = new StateMachine('placed')
      order.defineState('placed', { onExit: () => calls.push('exit') })
      order.defineState('paid', { onEnter: () => calls.push('enter') })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })

      expect(() => order.send('pay')).toThrow(BlockedTransitionError)
      expect(calls).toEqual([])
    })

    it('passes its own context object to the guard', () => {
      const guard = vi.fn(() => true)
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard })

      order.send('pay')

      expect(guard).toHaveBeenCalledOnce()
      expectSameItems(guard.mock.lastCall, [order.context])
    })

    it('moves on a later send once the guard allows it', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({
        from: 'placed',
        to: 'paid',
        on: 'pay',
        guard: (ctx) => ctx.amount > 0,
      })

      order.context.amount = 0
      expect(() => order.send('pay')).toThrow(BlockedTransitionError)

      order.context.amount = 250
      order.send('pay')
      expect(order.currentStateName).toBe('paid')
    })

    it('asks the guard before it runs the exit hook', () => {
      const calls = []
      const order = new StateMachine('placed')
      order.defineState('placed', { onExit: () => calls.push('exit') })
      order.defineState('paid', { onEnter: () => calls.push('enter') })
      order.defineTransition({
        from: 'placed',
        to: 'paid',
        on: 'pay',
        guard: () => {
          calls.push('guard')

          return true
        },
      })

      order.send('pay')

      expect(calls).toEqual(['guard', 'exit', 'enter'])
    })

    it('stays in the state it was in when the guard throws an error', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({
        from: 'placed',
        to: 'paid',
        on: 'pay',
        guard: () => {
          throw new Error('guard failed')
        },
      })

      expect(() => order.send('pay')).toThrow('guard failed')
      expect(order.currentStateName).toBe('placed')
    })

    it('takes the first transition on the event whose guard allows it', () => {
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: () => true })

      order.send('pay')

      expect(order.currentStateName).toBe('rejected')
    })

    it('takes the earlier of two transitions whose guards both allow it', () => {
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => true })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: () => true })

      order.send('pay')

      expect(order.currentStateName).toBe('paid')
    })

    it('does not ask a later guard once an earlier one allows the move', () => {
      const laterGuard = vi.fn(() => true)
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => true })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: laterGuard })

      order.send('pay')

      expect(laterGuard).not.toHaveBeenCalled()
    })

    it('reports the first transition when every guard on the event blocks its transition', () => {
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: () => false })

      expect(() => order.send('pay')).toThrow(expect.objectContaining({ toStateName: 'paid' }))
    })

    it('asks each guard once when every guard on the event blocks its transition', () => {
      const earlierGuard = vi.fn(() => false)
      const laterGuard = vi.fn(() => false)
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: earlierGuard })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: laterGuard })

      expect(() => order.send('pay')).toThrow(BlockedTransitionError)
      expect(earlierGuard).toHaveBeenCalledOnce()
      expect(laterGuard).toHaveBeenCalledOnce()
    })

    it('runs the exit hook, then the enter hook, and no other hook', () => {
      const calls = []
      const order = new StateMachine('placed')
      order.defineState('placed', {
        onEnter: () => calls.push('enter placed'),
        onExit: () => calls.push('exit placed'),
      })
      order.defineState('paid', {
        onEnter: () => calls.push('enter paid'),
        onExit: () => calls.push('exit paid'),
      })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      order.send('pay')

      expect(calls).toEqual(['exit placed', 'enter paid'])
    })

    it('passes its own context object to the exit and enter hooks', () => {
      const receivedContexts = []
      const order = new StateMachine('placed')
      order.defineState('placed', { onExit: (ctx) => receivedContexts.push(ctx) })
      order.defineState('paid', { onEnter: (ctx) => receivedContexts.push(ctx) })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      order.send('pay')

      expectSameItems(receivedContexts, [order.context, order.context])
    })

    it('moves after the exit hook runs and before the enter hook runs', () => {
      const stateNamesSeenByHooks = []
      const order = new StateMachine('placed')
      order.defineState('placed', {
        onExit: () => stateNamesSeenByHooks.push(order.currentStateName),
      })
      order.defineState('paid', {
        onEnter: () => stateNamesSeenByHooks.push(order.currentStateName),
      })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      order.send('pay')

      expect(stateNamesSeenByHooks).toEqual(['placed', 'paid'])
    })

    it('runs the exit and enter hooks when leaving and re-entering the same state', () => {
      const calls = []
      const order = new StateMachine('placed')
      order.defineState('placed', {
        onEnter: () => calls.push('enter'),
        onExit: () => calls.push('exit'),
      })
      order.defineTransition({ from: 'placed', to: 'placed', on: 'edit' })

      order.send('edit')

      expect(calls).toEqual(['exit', 'enter'])
    })

    it('runs no hook when it refuses the event', () => {
      const calls = []
      const order = new StateMachine('placed')
      order.defineState('placed', { onExit: () => calls.push('exit') })
      order.defineState('paid', { onEnter: () => calls.push('enter') })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('ship')).toThrow(NoTransitionError)
      expect(calls).toEqual([])
    })

    it('stays in the state it was in when the exit hook throws an error', () => {
      const order = new StateMachine('placed')
      order.defineState('placed', {
        onExit: () => {
          throw new Error('exit failed')
        },
      })
      order.defineState('paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('pay')).toThrow('exit failed')
      expect(order.currentStateName).toBe('placed')
    })

    it('has already moved when the enter hook throws an error', () => {
      const order = new StateMachine('placed')
      order.defineState('placed')
      order.defineState('paid', {
        onEnter: () => {
          throw new Error('enter failed')
        },
      })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.send('pay')).toThrow('enter failed')
      expect(order.currentStateName).toBe('paid')
    })
  })
})
