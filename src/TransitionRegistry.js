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
   * Finds the transitions from a state, in registration order. Give on as well to keep
   * only those the event triggers. Guards are not asked.
   *
   * @param {object} criteria - The names to match, with the same keys as defineTransition.
   * @param {string} criteria.from - Name of the state the transitions leave.
   * @param {string} [criteria.on] - Name of the event that triggers them.
   * @returns {Transition[]} - The matching transitions, in a new array each time.
   */
  findAll({ from, on }) {
    const transitionsFrom = this.#transitions.filter((transition) => transition.fromStateName === from)

    if (on === undefined) {
      return transitionsFrom
    }

    return transitionsFrom.filter((transition) => transition.isTriggeredBy(on))
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
