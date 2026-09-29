import { StateMachine } from '../../src/StateMachine.js'

/**
 * Builds a machine that starts in the first name given and has all of them
 * defined, since a transition may only connect states the machine knows about.
 *
 * @param {string} initialStateName - Name of the state the machine starts in.
 * @param {...string} otherStateNames - Further names to define on it.
 * @returns {StateMachine} A fresh machine with every name defined.
 */
export const machineWithStates = (initialStateName, ...otherStateNames) => {
  const order = new StateMachine(initialStateName)

  for (const stateName of [initialStateName, ...otherStateNames]) {
    order.defineState(stateName)
  }

  return order
}
