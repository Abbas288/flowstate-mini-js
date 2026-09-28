import { describe, expect, it } from 'vitest'
import { Transition } from '../src/Transition.js'
import { TransitionRegistry } from '../src/TransitionRegistry.js'
import { expectSameItems } from './expectSameItems.js'

const payMove = { from: 'placed', to: 'paid', on: 'pay' }
const shipMove = { from: 'paid', to: 'shipped', on: 'ship' }

describe('TransitionRegistry', () => {
  it('finds a transition by the state it leaves and the event it answers to', () => {
    const registry = new TransitionRegistry()
    const pay = new Transition(payMove)

    registry.register(pay)

    expectSameItems(registry.findAll({ from: 'placed', on: 'pay' }), [pay])
  })

  it('finds nothing while empty', () => {
    const registry = new TransitionRegistry()

    expect(registry.findAll({ from: 'placed', on: 'pay' })).toEqual([])
  })

  it('finds nothing when the event does not match', () => {
    const registry = new TransitionRegistry()
    registry.register(new Transition(payMove))

    expect(registry.findAll({ from: 'placed', on: 'ship' })).toEqual([])
  })

  it('finds nothing when the state does not match', () => {
    const registry = new TransitionRegistry()
    registry.register(new Transition(payMove))

    expect(registry.findAll({ from: 'paid', on: 'pay' })).toEqual([])
  })

  it('tells two transitions apart that share an event name', () => {
    const registry = new TransitionRegistry()
    const cancelPlaced = new Transition({ from: 'placed', to: 'void', on: 'cancel' })
    const cancelPaid = new Transition({ from: 'paid', to: 'refunded', on: 'cancel' })

    registry.register(cancelPlaced)
    registry.register(cancelPaid)

    expectSameItems(registry.findAll({ from: 'placed', on: 'cancel' }), [cancelPlaced])
    expectSameItems(registry.findAll({ from: 'paid', on: 'cancel' }), [cancelPaid])
  })

  it('finds every match in registration order, alike ones included', () => {
    const registry = new TransitionRegistry()
    const first = new Transition(payMove)
    const second = new Transition(payMove)

    registry.register(first)
    registry.register(second)

    expectSameItems(registry.findAll({ from: 'placed', on: 'pay' }), [first, second])
  })

  it('ignores guards when searching', () => {
    const registry = new TransitionRegistry()
    const guardedPay = new Transition({ ...payMove, guard: () => false })

    registry.register(guardedPay)

    expectSameItems(registry.findAll({ from: 'placed', on: 'pay' }), [guardedPay])
  })

  it('keeps registries independent of each other', () => {
    const orders = new TransitionRegistry()
    const invoices = new TransitionRegistry()

    orders.register(new Transition(payMove))

    expect(invoices.findAll({ from: 'placed', on: 'pay' })).toEqual([])
  })

  it('cannot be changed through the matches it returns', () => {
    const registry = new TransitionRegistry()
    const pay = new Transition(payMove)
    registry.register(pay)

    registry.findAll({ from: 'placed', on: 'pay' }).push(new Transition(payMove))

    expectSameItems(registry.findAll({ from: 'placed', on: 'pay' }), [pay])
  })

  it('lists every way out of a state, in registration order', () => {
    const registry = new TransitionRegistry()
    const pay = new Transition(payMove)
    const cancel = new Transition({ from: 'placed', to: 'void', on: 'cancel' })

    registry.register(pay)
    registry.register(cancel)

    expectSameItems(registry.findAll({ from: 'placed' }), [pay, cancel])
  })

  it('lists no way out of a state that has none', () => {
    const registry = new TransitionRegistry()
    registry.register(new Transition(payMove))

    expect(registry.findAll({ from: 'shipped' })).toEqual([])
  })

  it('lists no way out while empty', () => {
    const registry = new TransitionRegistry()

    expect(registry.findAll({ from: 'placed' })).toEqual([])
  })

  it('leaves out transitions that start somewhere else', () => {
    const registry = new TransitionRegistry()
    const pay = new Transition(payMove)

    registry.register(pay)
    registry.register(new Transition(shipMove))

    expectSameItems(registry.findAll({ from: 'placed' }), [pay])
  })

  it('lists a transition even when its guard says no', () => {
    const registry = new TransitionRegistry()
    const guardedPay = new Transition({ ...payMove, guard: () => false })

    registry.register(guardedPay)

    expectSameItems(registry.findAll({ from: 'placed' }), [guardedPay])
  })

  it('lists a transition that returns to the same state', () => {
    const registry = new TransitionRegistry()
    const confirm = new Transition({ from: 'paid', to: 'paid', on: 'confirm' })

    registry.register(confirm)

    expectSameItems(registry.findAll({ from: 'paid' }), [confirm])
  })

  it('cannot be changed through the list it returns', () => {
    const registry = new TransitionRegistry()
    const pay = new Transition(payMove)
    registry.register(pay)

    registry.findAll({ from: 'placed' }).push(new Transition(shipMove))

    expectSameItems(registry.findAll({ from: 'placed' }), [pay])
  })

  it('rejects values that are not transitions', () => {
    const registry = new TransitionRegistry()
    const nonTransitions = ['pay', 42, {}, payMove, null, undefined]

    for (const nonTransition of nonTransitions) {
      expect(() => registry.register(nonTransition)).toThrow(TypeError)
    }
  })
})
