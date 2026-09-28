import { Transition } from './Transition.js'

/**
 * Stores the transitions belonging to one machine and finds them by state and event.
 */
export class TransitionRegistry {
  #transitions = []

  /**
   * Stores a transition for later lookup. Two identical transitions are both kept.
   *
   * @param {Transition} transition - The transition to store.
   */
  register(transition) {
    this.#requireTransition(transition)

    this.#transitions.push(transition)
  }

  /**
   * Guards are ignored, so a transition is listed even if its guard would refuse it.
   * The array keeps registration order.
   *
   * @param {string} fromStateName - Name of the state to leave.
   * @param {string} eventName - Name of the event being sent.
   * @returns {Transition[]} - The transitions the event triggers from that state.
   */
  findAll(fromStateName, eventName) {
    return this.transitionsFrom(fromStateName).filter((transition) => transition.isTriggeredBy(eventName))
  }

  /**
   * Guards are ignored, so every way out is listed. The array is a copy,
   * so changing it cannot affect the registry.
   *
   * @param {string} fromStateName - Name of the state to leave.
   * @returns {Transition[]} - The transitions leaving that state, in registration order.
   */
  transitionsFrom(fromStateName) {
    return this.#transitions.filter((transition) => transition.fromStateName === fromStateName)
  }

  /**
   * Throws unless the value is a Transition.
   *
   * @param {*} value - The value to check.
   */
  #requireTransition(value) {
    if (!(value instanceof Transition)) {
      throw new TypeError('Only Transition instances can be registered.')
    }
  }
}
