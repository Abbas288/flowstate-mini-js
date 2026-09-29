import { describe, expect, it } from 'vitest'
import { StateMachine } from '../../src/StateMachine.js'
import { DuplicateStateError } from '../../src/errors.js'
import { invalidNames } from '../helpers/fixtures.js'

describe('StateMachine', () => {
  describe('defineState', () => {
    it('hands back the machine so definitions can be chained', () => {
      const order = new StateMachine('placed')

      order.defineState('placed').defineState('paid')

      expect(order.stateNames).toEqual(['placed', 'paid'])
    })

    it('passes a bad state name straight on as a TypeError', () => {
      const order = new StateMachine('placed')

      for (const invalidName of invalidNames) {
        expect(() => order.defineState(invalidName)).toThrow(TypeError)
      }
    })

    it('passes a bad hook straight on as a TypeError', () => {
      const order = new StateMachine('placed')

      expect(() => order.defineState('paid', { onEnter: 'not-a-function' })).toThrow(TypeError)
    })

    it('accepts a state without any hooks', () => {
      const order = new StateMachine('placed')

      expect(() => order.defineState('paid')).not.toThrow()
    })

    it('refuses to define the same state name twice', () => {
      const order = new StateMachine('placed')

      order.defineState('paid')

      expect(() => order.defineState('paid')).toThrow(DuplicateStateError)
    })

    it('refuses a duplicate state name even when the hooks differ', () => {
      const order = new StateMachine('placed')

      order.defineState('paid', { onEnter: () => {} })

      expect(() => order.defineState('paid', { onExit: () => {} })).toThrow(DuplicateStateError)
    })

    it('does not list a state name twice when it refuses a duplicate', () => {
      const order = new StateMachine('placed')

      order.defineState('paid')
      expect(() => order.defineState('paid')).toThrow(DuplicateStateError)

      expect(order.stateNames).toEqual(['paid'])
    })

    it('keeps the current state untouched when states are defined', () => {
      const order = new StateMachine('placed')

      order.defineState('paid')

      expect(order.currentStateName).toBe('placed')
    })
  })

  describe('stateNames', () => {
    it('knows about no states before any are defined', () => {
      const order = new StateMachine('placed')

      expect(order.stateNames).toEqual([])
    })

    it('lists the states it has been told about, in definition order', () => {
      const order = new StateMachine('placed')

      order.defineState('placed')
      order.defineState('paid')
      order.defineState('shipped')

      expect(order.stateNames).toEqual(['placed', 'paid', 'shipped'])
    })

    it('cannot be changed through the list of names it returns', () => {
      const order = new StateMachine('placed')
      order.defineState('placed')

      order.stateNames.push('forged')

      expect(order.stateNames).toEqual(['placed'])
    })
  })
})
