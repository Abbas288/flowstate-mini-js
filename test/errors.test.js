import { describe, expect, it } from 'vitest'
import { Transition } from '../src/Transition.js'
import {
  BlockedTransitionError,
  DuplicateStateError,
  FlowStateError,
  NoTransitionError,
  UnknownStateError,
} from '../src/errors.js'
import * as errorModule from '../src/errors.js'

const stateErrors = [
  ['UnknownStateError', UnknownStateError],
  ['DuplicateStateError', DuplicateStateError],
]

const refusedEventErrors = [
  ['NoTransitionError', () => new NoTransitionError('placed', 'pay')],
  [
    'BlockedTransitionError',
    () => {
      const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })

      return new BlockedTransitionError(payment)
    },
  ],
]

describe('FlowStateError', () => {
  it('is a normal Error, so it can be thrown and caught like one', () => {
    const error = new FlowStateError('something broke')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('something broke')
  })

  it('is not a TypeError, so a caller can tell it apart from a wrong argument type', () => {
    expect(new FlowStateError('x')).not.toBeInstanceOf(TypeError)
  })

  it('is named after its own class', () => {
    expect(new FlowStateError('x').name).toBe('FlowStateError')
  })

  it('carries a stack trace', () => {
    expect(new FlowStateError('x').stack).toContain('FlowStateError')
  })
})

describe.each(stateErrors)('%s', (className, StateError) => {
  it('can be caught as a FlowStateError', () => {
    expect(new StateError('paid')).toBeInstanceOf(FlowStateError)
  })

  it('can be caught as a plain Error', () => {
    expect(new StateError('paid')).toBeInstanceOf(Error)
  })

  it('is named after its own class, not after the base class', () => {
    expect(new StateError('paid').name).toBe(className)
  })

  it('names the state in its message', () => {
    expect(new StateError('paid').message).toContain('paid')
  })

  it('hands out the state name without parsing the message', () => {
    expect(new StateError('paid').stateName).toBe('paid')
  })

  it('does not let the state name be written from outside', () => {
    const error = new StateError('paid')

    expect(() => {
      error.stateName = 'shipped'
    }).toThrow(TypeError)
    expect(error.stateName).toBe('paid')
  })
})

describe.each(refusedEventErrors)('%s', (className, createError) => {
  it('can be caught as a FlowStateError', () => {
    expect(createError()).toBeInstanceOf(FlowStateError)
  })

  it('is named after its own class, not after the base class', () => {
    expect(createError().name).toBe(className)
  })

  it('hands out the state name and the event name without parsing the message', () => {
    const error = createError()

    expect(error.fromStateName).toBe('placed')
    expect(error.eventName).toBe('pay')
  })

  it('does not let the state name or the event name be written from outside', () => {
    const error = createError()

    expect(() => {
      error.fromStateName = 'paid'
    }).toThrow(TypeError)
    expect(() => {
      error.eventName = 'ship'
    }).toThrow(TypeError)
    expect(error.fromStateName).toBe('placed')
    expect(error.eventName).toBe('pay')
  })

  it('is not one of the errors about a single state name', () => {
    const error = createError()

    expect(error).not.toBeInstanceOf(UnknownStateError)
    expect(error).not.toBeInstanceOf(DuplicateStateError)
  })

  it('has no stateName, since it carries more than one name', () => {
    expect(createError().stateName).toBeUndefined()
  })
})

describe('NoTransitionError', () => {
  it('names both the state and the event in its message', () => {
    const error = new NoTransitionError('placed', 'ship')

    expect(error.message).toContain('placed')
    expect(error.message).toContain('ship')
  })

  it('has no toStateName, since there is no transition to take one from', () => {
    expect(new NoTransitionError('placed', 'ship').toStateName).toBeUndefined()
  })
})

describe('BlockedTransitionError', () => {
  it('puts all three names of the transition in its message', () => {
    const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })
    const error = new BlockedTransitionError(payment)

    expect(error.message).toContain('placed')
    expect(error.message).toContain('paid')
    expect(error.message).toContain('pay')
  })

  it('hands out the name of the state the transition would have entered', () => {
    const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })

    expect(new BlockedTransitionError(payment).toStateName).toBe('paid')
  })

  it('does not let toStateName be written from outside', () => {
    const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })
    const error = new BlockedTransitionError(payment)

    expect(() => {
      error.toStateName = 'shipped'
    }).toThrow(TypeError)
    expect(error.toStateName).toBe('paid')
  })

  it('does not swap the two state names', () => {
    const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })
    const error = new BlockedTransitionError(payment)

    expect(error.fromStateName).toBe('placed')
    expect(error.toStateName).toBe('paid')
  })
})

describe('the error family', () => {
  it('exports the error types a caller can catch, and nothing else', () => {
    expect(Object.keys(errorModule).sort()).toEqual([
      'BlockedTransitionError',
      'DuplicateStateError',
      'FlowStateError',
      'NoTransitionError',
      'UnknownStateError',
    ])
  })

  it('lets one catch handle every error the module throws', () => {
    const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })
    const thrown = [
      new UnknownStateError('paid'),
      new DuplicateStateError('paid'),
      new NoTransitionError('placed', 'ship'),
      new BlockedTransitionError(payment),
    ]

    for (const error of thrown) {
      expect(error).toBeInstanceOf(FlowStateError)
    }
  })

  it('tells an unknown state apart from a duplicate one', () => {
    expect(new UnknownStateError('paid')).not.toBeInstanceOf(DuplicateStateError)
    expect(new DuplicateStateError('paid')).not.toBeInstanceOf(UnknownStateError)
  })

  it('tells a missing transition apart from a blocked one', () => {
    const payment = new Transition({ from: 'placed', to: 'paid', on: 'pay' })

    expect(new NoTransitionError('placed', 'pay')).not.toBeInstanceOf(BlockedTransitionError)
    expect(new BlockedTransitionError(payment)).not.toBeInstanceOf(NoTransitionError)
  })

  it('says different things about the same state name', () => {
    const unknownStateMessage = new UnknownStateError('paid').message
    const duplicateStateMessage = new DuplicateStateError('paid').message

    expect(unknownStateMessage).not.toBe(duplicateStateMessage)
  })
})
