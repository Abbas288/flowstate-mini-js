/**
 * One allowed move from one state to another, triggered by a named event.
 */
export class Transition {
  #fromStateName
  #toStateName
  #eventName
  #guard

  /**
   * Creates a transition. Only the types are checked here. StateMachine checks that
   * both states exist when the transition is defined on it.
   *
   * @param {object} move - The three names that make up the move, plus an optional guard.
   * @param {string} move.from - Name of the state to leave.
   * @param {string} move.to - Name of the state to enter.
   * @param {string} move.on - Name of the triggering event.
   * @param {(context: object) => boolean} [move.guard] - Decides if the move is allowed.
   */
  constructor({ from, to, on, guard } = {}) {
    this.#requireName(from, 'from')
    this.#requireName(to, 'to')
    this.#requireName(on, 'on')
    this.#requireOptionalGuard(guard)

    this.#fromStateName = from
    this.#toStateName = to
    this.#eventName = on
    this.#guard = guard
  }

  /**
   * The machine must be in this state for the transition to be possible.
   *
   * @returns {string} - Name of the state it leaves.
   */
  get fromStateName() {
    return this.#fromStateName
  }

  /**
   * This may be the same state that the transition leaves.
   *
   * @returns {string} - Name of the state it enters.
   */
  get toStateName() {
    return this.#toStateName
  }

  /**
   * Several transitions may share an event name, even transitions that leave the same state.
   *
   * @returns {string} - Name of the event that triggers this transition.
   */
  get eventName() {
    return this.#eventName
  }

  /**
   * Names are compared exactly. A value of the wrong type gives false
   * rather than an error.
   *
   * @param {string} eventName - Name of the event to test.
   * @returns {boolean} - True if that event triggers this transition.
   */
  isTriggeredBy(eventName) {
    return this.#eventName === eventName
  }

  /**
   * A transition without a guard is always allowed. A guard runs on
   * every call, so its answer can change as the context changes.
   *
   * @param {object} context - The state machine's shared context.
   * @returns {boolean} - True if this transition may run right now.
   */
  isAllowedIn(context) {
    if (this.#guard === undefined) {
      return true
    }

    return Boolean(this.#guard(context))
  }

  /**
   * Throws unless the value can be used as a name.
   *
   * @param {*} value - The value to check.
   * @param {string} label - Field name, used in the error message.
   */
  #requireName(value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`Transition ${label} must be a non-empty string.`)
    }
  }

  /**
   * Throws unless the value is a function. The guard is optional, so undefined passes.
   *
   * @param {*} value - The value to check.
   */
  #requireOptionalGuard(value) {
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError('Transition guard must be a function when provided.')
    }
  }
}
