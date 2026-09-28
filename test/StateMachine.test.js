import { describe, expect, it } from 'vitest'
import { StateMachine } from '../src/StateMachine.js'
import {
  BlockedTransitionError,
  DuplicateStateError,
  FlowStateError,
  NoTransitionError,
  UnknownStateError,
} from '../src/errors.js'
import { expectSameItems } from './helpers/expectSameItems.js'

const invalidNames = [undefined, null, '', '   ', 42, {}, ['placed']]
const invalidFunctions = ['always', 42, {}, null, true, ['guard']]
const validMove = { from: 'placed', to: 'paid', on: 'pay' }

/**
 * Builds a machine that starts in the first name given and has all of them
 * defined, since a transition may only connect states the machine knows about.
 *
 * @param {string} initialStateName - Name of the state the machine starts in.
 * @param {...string} otherStateNames - Further names to define on it.
 * @returns {StateMachine} - A fresh machine with every name defined.
 */
const machineWithStates = (initialStateName, ...otherStateNames) => {
  const order = new StateMachine(initialStateName)

  for (const stateName of [initialStateName, ...otherStateNames]) {
    order.defineState(stateName)
  }

  return order
}

describe('StateMachine', () => {
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

  it('does not let the current state be written from outside', () => {
    const order = new StateMachine('placed')

    expect(() => {
      order.currentStateName = 'shipped'
    }).toThrow(TypeError)
    expect(order.currentStateName).toBe('placed')
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

  it('throws a FlowStateError, not a TypeError, for a duplicate state name', () => {
    const order = new StateMachine('placed')

    order.defineState('paid')

    expect(() => order.defineState('paid')).toThrow(FlowStateError)
    expect(() => order.defineState('paid')).not.toThrow(TypeError)
  })

  it('does not list a state name twice when it refuses a duplicate', () => {
    const order = new StateMachine('placed')

    order.defineState('paid')
    expect(() => order.defineState('paid')).toThrow(DuplicateStateError)

    expect(order.stateNames).toEqual(['paid'])
  })

  it('cannot be changed through the list of names it returns', () => {
    const order = new StateMachine('placed')
    order.defineState('placed')

    order.stateNames.push('forged')

    expect(order.stateNames).toEqual(['placed'])
  })

  it('keeps the current state untouched when states are defined', () => {
    const order = new StateMachine('placed')

    order.defineState('paid')

    expect(order.currentStateName).toBe('placed')
  })

  it('sees no way out of a state before any transition is defined', () => {
    const order = new StateMachine('placed')

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

  it('sees no way out of a state nobody mentioned', () => {
    const order = machineWithStates('placed', 'paid')

    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

    expect(order.eventNamesFrom('shipped')).toEqual([])
  })

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

  it('lists a guarded event even though the guard refuses the move', () => {
    const order = machineWithStates('placed', 'paid')

    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })

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
      expect(() => order.defineTransition({ ...validMove, [field]: invalidName })).toThrow(TypeError)
    }
  })

  it('throws a TypeError when the guard is not a function', () => {
    const order = machineWithStates('placed', 'paid')

    for (const invalidGuard of invalidFunctions) {
      expect(() => order.defineTransition({ ...validMove, guard: invalidGuard })).toThrow(TypeError)
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

  it('throws a FlowStateError, not a TypeError, for a state that was never defined', () => {
    const order = machineWithStates('placed', 'paid')
    const moveToUnknownState = { from: 'placed', to: 'shipped', on: 'ship' }

    expect(() => order.defineTransition(moveToUnknownState)).toThrow(FlowStateError)
    expect(() => order.defineTransition(moveToUnknownState)).not.toThrow(TypeError)
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
    const receivedContexts = []
    const order = machineWithStates('placed', 'paid')
    order.defineTransition({
      from: 'placed',
      to: 'paid',
      on: 'pay',
      guard: (ctx) => {
        receivedContexts.push(ctx)

        return true
      },
    })

    order.send('pay')

    expectSameItems(receivedContexts, [order.context])
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
    let laterGuardWasAsked = false
    const order = machineWithStates('placed', 'paid', 'rejected')
    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => true })
    order.defineTransition({
      from: 'placed',
      to: 'rejected',
      on: 'pay',
      guard: () => {
        laterGuardWasAsked = true

        return true
      },
    })

    order.send('pay')

    expect(laterGuardWasAsked).toBe(false)
  })

  it('reports the first transition when every guard on the event blocks its transition', () => {
    const order = machineWithStates('placed', 'paid', 'rejected')
    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => false })
    order.defineTransition({ from: 'placed', to: 'rejected', on: 'pay', guard: () => false })

    expect(() => order.send('pay')).toThrow(expect.objectContaining({ toStateName: 'paid' }))
  })

  it('asks each guard once when every guard on the event blocks its transition', () => {
    const askedGuards = []
    const order = machineWithStates('placed', 'paid', 'rejected')
    order.defineTransition({
      from: 'placed',
      to: 'paid',
      on: 'pay',
      guard: () => {
        askedGuards.push('paid')

        return false
      },
    })
    order.defineTransition({
      from: 'placed',
      to: 'rejected',
      on: 'pay',
      guard: () => {
        askedGuards.push('rejected')

        return false
      },
    })

    expect(() => order.send('pay')).toThrow(BlockedTransitionError)
    expect(askedGuards).toEqual(['paid', 'rejected'])
  })

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

  it('runs no hook while answering', () => {
    const calls = []
    const order = new StateMachine('placed')
    order.defineState('placed', { onExit: () => calls.push('exit') })
    order.defineState('paid', { onEnter: () => calls.push('enter') })
    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

    order.canSend('pay')

    expect(calls).toEqual([])
  })

  it('passes its own context object to the guard while answering', () => {
    const receivedContexts = []
    const order = machineWithStates('placed', 'paid')
    order.defineTransition({
      from: 'placed',
      to: 'paid',
      on: 'pay',
      guard: (ctx) => {
        receivedContexts.push(ctx)

        return true
      },
    })

    order.canSend('pay')

    expectSameItems(receivedContexts, [order.context])
  })

  it('answers without asking a later guard once an earlier one allows the move', () => {
    let laterGuardWasAsked = false
    const order = machineWithStates('placed', 'paid', 'rejected')
    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: () => true })
    order.defineTransition({
      from: 'placed',
      to: 'rejected',
      on: 'pay',
      guard: () => {
        laterGuardWasAsked = true

        return true
      },
    })

    order.canSend('pay')

    expect(laterGuardWasAsked).toBe(false)
  })

  it('throws a TypeError instead of answering when the event name is not a non-empty string', () => {
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

  it('cannot be changed through the list of events it returns', () => {
    const order = machineWithStates('placed', 'paid')
    order.defineTransition({ from: 'placed', to: 'paid', on: 'pay' })

    order.eventNamesFrom('placed').push('forge')

    expect(order.eventNamesFrom('placed')).toEqual(['pay'])
  })
})
