import { describe, expect, it } from 'vitest'
import { Transition } from '../src/Transition.js'
import { invalidFunctions, invalidNames, validPayMove } from './helpers/fixtures.js'

describe('Transition', () => {
  it('exposes the move it was given', () => {
    const transition = new Transition({ from: 'placed', to: 'paid', on: 'pay' })

    expect(transition.fromStateName).toBe('placed')
    expect(transition.toStateName).toBe('paid')
    expect(transition.eventName).toBe('pay')
  })

  it('allows a move that returns to the same state', () => {
    const transition = new Transition({ from: 'paid', to: 'paid', on: 'confirm' })

    expect(transition.fromStateName).toBe(transition.toStateName)
  })

  it.each(['from', 'to', 'on'])('rejects %s unless it is a non-empty string', (field) => {
    for (const invalidName of invalidNames) {
      expect(() => new Transition({ ...validPayMove, [field]: invalidName })).toThrow(TypeError)
    }
  })

  it('is triggered by the event it was built with', () => {
    const transition = new Transition(validPayMove)

    expect(transition.isTriggeredBy('pay')).toBe(true)
  })

  it('is not triggered by any other event', () => {
    const transition = new Transition(validPayMove)

    expect(transition.isTriggeredBy('ship')).toBe(false)
  })

  it('tells events apart by case', () => {
    const transition = new Transition(validPayMove)

    expect(transition.isTriggeredBy('Pay')).toBe(false)
  })

  it('answers false instead of throwing an error when the event name is not a non-empty string', () => {
    const transition = new Transition(validPayMove)

    for (const invalidName of invalidNames) {
      expect(transition.isTriggeredBy(invalidName)).toBe(false)
    }
  })

  it('accepts a move without a guard', () => {
    expect(() => new Transition(validPayMove)).not.toThrow()
  })

  it('accepts a function as a guard', () => {
    const validGuard = (ctx) => ctx.amount > 0

    expect(() => new Transition({ ...validPayMove, guard: validGuard })).not.toThrow()
  })

  it('rejects a guard that is not a function', () => {
    for (const invalidGuard of invalidFunctions) {
      expect(() => new Transition({ ...validPayMove, guard: invalidGuard })).toThrow(TypeError)
    }
  })

  it('is allowed in any context when it has no guard', () => {
    const transition = new Transition(validPayMove)

    expect(transition.isAllowedIn({})).toBe(true)
  })

  it('is allowed when its guard returns true', () => {
    const transition = new Transition({ ...validPayMove, guard: () => true })

    expect(transition.isAllowedIn({})).toBe(true)
  })

  it('is not allowed when its guard returns false', () => {
    const transition = new Transition({ ...validPayMove, guard: () => false })

    expect(transition.isAllowedIn({})).toBe(false)
  })

  it('passes the context on to its guard', () => {
    const transition = new Transition({
      ...validPayMove,
      guard: (ctx) => ctx.amount > 0,
    })

    expect(transition.isAllowedIn({ amount: 250 })).toBe(true)
    expect(transition.isAllowedIn({ amount: 0 })).toBe(false)
  })

  it.each([
    ['a non-empty string', 'yes'],
    ['a positive number', 250],
    ['an empty array', []],
    ['an empty object', {}],
  ])('allows the move when its guard returns %s', (_description, guardResult) => {
    const transition = new Transition({ ...validPayMove, guard: () => guardResult })

    expect(transition.isAllowedIn({})).toBe(true)
  })

  it.each([
    ['zero', 0],
    ['an empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
  ])('blocks the move when its guard returns %s', (_description, guardResult) => {
    const transition = new Transition({ ...validPayMove, guard: () => guardResult })

    expect(transition.isAllowedIn({})).toBe(false)
  })

  it('asks its guard again on every call', () => {
    let allowed = false
    const transition = new Transition({ ...validPayMove, guard: () => allowed })

    expect(transition.isAllowedIn({})).toBe(false)
    allowed = true
    expect(transition.isAllowedIn({})).toBe(true)
  })

  it('rejects being built without a move at all', () => {
    expect(() => new Transition()).toThrow(TypeError)
  })

  it('says in the error message that the event name is missing', () => {
    expect(() => new Transition({ from: 'placed', to: 'paid' })).toThrow('EventName must be')
  })
})
