import { describe, expect, it, vi } from 'vitest'
import { StateMachine } from '../../src/StateMachine.js'
import { UnknownStateError } from '../../src/errors.js'
import { expectSameItems } from '../helpers/expectSameItems.js'
import { invalidNames } from '../helpers/fixtures.js'
import { machineWithStates } from '../helpers/machineWithStates.js'

describe('StateMachine', () => {
  describe('canSend', () => {
    it('answers true for an event that would move the machine', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(order.canSend('pay')).toBe(true)
    })

    it('answers false for an event that has no transition from the current state', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(order.canSend('ship')).toBe(false)
    })

    it('answers false when the guard blocks the transition', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })

      expect(order.canSend('pay')).toBe(false)
    })

    it('answers true when a later transition on the event is allowed', () => {
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: () => true })

      expect(order.canSend('pay')).toBe(true)
    })

    it('changes its answer when the context changes', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({
        from: 'placed',
        to: 'paid',
        on: 'pay',
        guard: (ctx) => ctx.amount > 0,
      })

      order.context.amount = 0
      expect(order.canSend('pay')).toBe(false)

      order.context.amount = 250
      expect(order.canSend('pay')).toBe(true)
    })

    it('does not move the machine when it answers true', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(order.canSend('pay')).toBe(true)
      expect(order.currentStateName).toBe('placed')
    })

    it('runs no hook', () => {
      const calls = []
      const order = new StateMachine('placed')
      order.defineState('placed', { onExit: () => calls.push('exit') })
      order.defineState('paid', { onEnter: () => calls.push('enter') })
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      order.canSend('pay')

      expect(calls).toEqual([])
    })

    it('passes its own context object to the guard', () => {
      const guard = vi.fn(() => true)
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard })

      order.canSend('pay')

      expect(guard).toHaveBeenCalledOnce()
      expectSameItems(guard.mock.lastCall, [order.context])
    })

    it('does not ask a later guard once an earlier one allows the move', () => {
      const laterGuard = vi.fn(() => true)
      const order = machineWithStates('placed', 'paid', 'rejected')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => true })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: laterGuard })

      order.canSend('pay')

      expect(laterGuard).not.toHaveBeenCalled()
    })

    it('throws a TypeError when the event name is not a non-empty string', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      for (const invalidName of invalidNames) {
        expect(() => order.canSend(invalidName)).toThrow(TypeError)
      }
    })

    it('throws an UnknownStateError instead of returning false when the starting state was never defined', () => {
      const order = new StateMachine('draft')
      order.defineState('placed').defineState('paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      // draft is not defined, so the machine cannot know whether it could move on 'pay' or not
      expect(() => order.canSend('pay')).toThrow(UnknownStateError)
      expect(() => order.canSend('pay')).toThrow(expect.objectContaining({ stateName: 'draft' }))
    })
  })
})
