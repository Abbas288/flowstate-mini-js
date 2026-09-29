import { describe, expect, it } from 'vitest'
import { StateMachine } from '../../src/StateMachine.js'
import { UnknownStateError } from '../../src/errors.js'
import { invalidFunctions, invalidNames, validPayMove } from '../helpers/fixtures.js'
import { machineWithStates } from '../helpers/machineWithStates.js'

describe('StateMachine', () => {
  describe('defineTransition', () => {
    it('hands back the machine so transitions can be chained', () => {
      const order = machineWithStates('placed', 'paid', 'shipped')

      order
        .defineTransition({ from: 'placed', to: 'paid', on: 'pay' })
        .defineTransition({ from: 'paid', to: 'shipped', on: 'ship' })

      expect(order.eventNamesFrom('paid')).toEqual(['ship'])
    })

    it('accepts a transition with a guard', () => {
      const order = machineWithStates('placed', 'paid')

      order.defineTransition({
        from: 'placed',
        to: 'paid',
        on: 'pay',
        guard: (ctx) => ctx.amount > 0,
      })

      expect(order.eventNamesFrom('placed')).toEqual(['pay'])
    })

    it('accepts a transition that starts and ends in the same state', () => {
      const order = machineWithStates('placed')

      order.defineTransition({ from: 'placed', to: 'placed', on: 'edit' })

      expect(order.eventNamesFrom('placed')).toEqual(['edit'])
    })

    it.each(['from', 'to', 'on'])('throws a TypeError when %s is not a non-empty string', (field) => {
      const order = machineWithStates('placed', 'paid')

      for (const invalidName of invalidNames) {
        expect(() => order.defineTransition({ ...validPayMove, [field]: invalidName })).toThrow(TypeError)
      }
    })

    it('throws a TypeError when the guard is not a function', () => {
      const order = machineWithStates('placed', 'paid')

      for (const invalidGuard of invalidFunctions) {
        expect(() => order.defineTransition({ ...validPayMove, guard: invalidGuard })).toThrow(TypeError)
      }
    })

    it('throws a TypeError when no move is given at all', () => {
      const order = new StateMachine('placed')

      expect(() => order.defineTransition()).toThrow(TypeError)
    })

    it('refuses a transition from a state that was never defined', () => {
      const order = machineWithStates('placed', 'paid')

      expect(() => order.defineTransition({ from: 'packed', to: 'paid', on: 'pay' })).toThrow(UnknownStateError)
    })

    it('refuses a transition to a state that was never defined', () => {
      const order = machineWithStates('placed', 'paid')

      expect(() => order.defineTransition({ from: 'placed', to: 'shipped', on: 'ship' })).toThrow(UnknownStateError)
    })

    it('names the state that was never defined in the error', () => {
      const order = machineWithStates('placed', 'paid')

      expect(() => order.defineTransition({ from: 'placed', to: 'shipped', on: 'ship' })).toThrow(/shipped/)
    })

    it('checks the field types before it checks that the states exist', () => {
      const order = machineWithStates('placed', 'paid')

      expect(() => order.defineTransition({ from: 42, to: 'shipped', on: 'ship' })).toThrow(TypeError)
    })

    it('does not register a transition it refuses', () => {
      const order = machineWithStates('placed', 'paid')

      expect(() => order.defineTransition({ from: 'placed', to: 'shipped', on: 'ship' })).toThrow(UnknownStateError)

      expect(order.eventNamesFrom('placed')).toEqual([])
    })
  })

  describe('eventNamesFrom', () => {
    it('sees no way out of a state before any transition is defined', () => {
      const order = machineWithStates('placed')

      expect(order.eventNamesFrom('placed')).toEqual([])
    })

    it('lists the events that lead out of a state, in definition order', () => {
      const order = machineWithStates('placed', 'paid', 'void')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })
      order.defineTransition({ from: 'placed', to: 'void', on: 'cancel' })

      expect(order.eventNamesFrom('placed')).toEqual(['pay', 'cancel'])
    })

    it('lists an event once even when several transitions share it', () => {
      const order = machineWithStates('placed', 'paid', 'rejected')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay' })

      expect(order.eventNamesFrom('placed')).toEqual(['pay'])
    })

    it('keeps a shared event where it was first defined', () => {
      const order = machineWithStates('placed', 'paid', 'void', 'rejected')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })
      order.defineTransition({ from: 'placed', to: 'void', on: 'cancel' })
      order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay' })

      expect(order.eventNamesFrom('placed')).toEqual(['pay', 'cancel'])
    })

    it('lists only events that leave the state it was asked about', () => {
      const order = machineWithStates('placed', 'paid', 'shipped')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })
      order.defineTransition({ from: 'paid', to: 'shipped', on: 'ship' })

      expect(order.eventNamesFrom('placed')).toEqual(['pay'])
    })

    it('sees no way out of a state that no transition leaves', () => {
      const order = machineWithStates('placed', 'paid')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(order.eventNamesFrom('paid')).toEqual([])
    })

    it('throws an UnknownStateError for a state that was never defined', () => {
      const order = machineWithStates('placed', 'paid')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      expect(() => order.eventNamesFrom('shipped')).toThrow(UnknownStateError)
      expect(() => order.eventNamesFrom('shipped')).toThrow(expect.objectContaining({ stateName: 'shipped' }))
    })

    it('throws a TypeError when the state name is not a non-empty string', () => {
      const order = machineWithStates('placed')

      for (const invalidName of invalidNames) {
        expect(() => order.eventNamesFrom(invalidName)).toThrow(TypeError)
      }
    })

    it('lists a guarded event even though the guard refuses the move', () => {
      const order = machineWithStates('placed', 'paid')

      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })

      expect(order.eventNamesFrom('placed')).toEqual(['pay'])
    })

    it('cannot be changed through the list of events it returns', () => {
      const order = machineWithStates('placed', 'paid')
      order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

      order.eventNamesFrom('placed').push('forge')

      expect(order.eventNamesFrom('placed')).toEqual(['pay'])
    })
  })
})
