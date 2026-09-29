import { describe, expect, it } from 'vitest'
import { StateMachine } from '../../src/StateMachine.js'
import { invalidNames } from '../helpers/fixtures.js'

describe('StateMachine', () => {
  describe('constructor', () => {
    it('starts in the state it was given', () => {
      const order = new StateMachine('placed')

      expect(order.currentStateName).toBe('placed')
    })

    it('rejects an initial state name that is not a non-empty string', () => {
      for (const invalidName of invalidNames) {
        expect(() => new StateMachine(invalidName)).toThrow(TypeError)
      }
    })

    it('says which name was wrong', () => {
      expect(() => new StateMachine('')).toThrow('Initial state name must be a non-empty string.')
    })

    it('keeps machines independent of each other', () => {
      const order = new StateMachine('placed')
      const invoice = new StateMachine('draft')

      expect(order.currentStateName).toBe('placed')
      expect(invoice.currentStateName).toBe('draft')
    })

    it('accepts a starting state that is not defined yet', () => {
      expect(() => new StateMachine('never-defined')).not.toThrow()
    })
  })

  describe('currentStateName', () => {
    it('does not let the current state be written from outside', () => {
      const order = new StateMachine('placed')

      expect(() => {
        order.currentStateName = 'shipped'
      }).toThrow(TypeError)
      expect(order.currentStateName).toBe('placed')
    })
  })

  describe('context', () => {
    it('starts with an empty context', () => {
      const order = new StateMachine('placed')

      expect(order.context).toEqual({})
    })

    it('keeps whatever is written into its context', () => {
      const order = new StateMachine('placed')

      order.context.amount = 250

      expect(order.context.amount).toBe(250)
    })

    it('hands out the same context object every time', () => {
      const order = new StateMachine('placed')

      expect(order.context).toBe(order.context)
    })

    it('does not let the context be swapped for another object', () => {
      const order = new StateMachine('placed')
      order.context.amount = 250

      expect(() => {
        order.context = { amount: 0 }
      }).toThrow(TypeError)
      expect(order.context.amount).toBe(250)
    })

    it('gives each machine a context of its own', () => {
      const order = new StateMachine('placed')
      const invoice = new StateMachine('placed')

      order.context.amount = 250
      invoice.context.amount = 90

      expect(order.context).not.toBe(invoice.context)
      expect(order.context.amount).toBe(250)
      expect(invoice.context.amount).toBe(90)
    })
  })
})
