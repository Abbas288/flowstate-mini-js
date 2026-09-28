import { describe, expect, it } from 'vitest'
import * as flowstate from '../src/index.js'

describe('flowstate-mini-js', () => {
  it('exports the state machine and the error types a caller can catch, and nothing else', () => {
    expect(Object.keys(flowstate).sort()).toEqual([
      'BlockedTransitionError',
      'DuplicateStateError',
      'FlowStateError',
      'NoTransitionError',
      'StateMachine',
      'UnknownStateError',
    ])
  })

  it('lets a caller catch an error from the machine by the type it imported', () => {
    const order = new flowstate.StateMachine('placed')
    order.defineState('placed')

    expect(() => order.send('pay')).toThrow(flowstate.NoTransitionError)
    expect(() => order.send('pay')).toThrow(flowstate.FlowStateError)
  })
})
