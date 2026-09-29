import { EventName, StateName } from './names.js'

/**
 * One allowed move from one state to another, triggered by a named event.
 */
export class Transition {
  #fromStateName
  #toStateName
  #eventName
  #guard

  /**
   * Creates a transition. Only the fields themselves are checked here. StateMachine
   * checks that both states exist when the transition is defined on it.
   *
   * @param {object} move - The three names that make up the move, plus an optional guard.
   * @param {string} move.from - Name of the state to leave.
   * @param {string} move.to - Name of the state to enter.
   * @param {string} move.on - Name of the triggering event.
   * @param {(context: object) => boolean} [move.guard] - Decides if the move is allowed.
   * @throws {TypeError} If StateName rejects from or to, or EventName rejects on.
   * @throws {TypeError} If the guard is not a function.
   */
  constructor({ from, to, on, guard } = {}) {
    this.#fromStateName = new StateName(from)
    this.#toStateName = new StateName(to)
    this.#eventName = new EventName(on)
    this.#guard = this.#requireOptionalGuard(guard)
  }

  /**
   * Gets the name of the state the transition leaves. The machine must be in that state
   * for the transition to be possible.
   *
   * @returns {string} Name of the state it leaves.
   */
  get fromStateName() {
    return this.#fromStateName.text
  }

  /**
   * Gets the name of the state the transition enters. It may be the same state that
   * the transition leaves.
   *
   * @returns {string} Name of the state it enters.
   */
  get toStateName() {
    return this.#toStateName.text
  }

  /**
   * Gets the name of the event that triggers the transition. Several transitions may
   * share an event name, even transitions that leave the same state.
   *
   * @returns {string} Name of the event that triggers this transition.
   */
  get eventName() {
    return this.#eventName.text
  }

  /**
   * Tells whether the event triggers this transition. Names are compared exactly, and a
   * value of the wrong type gives false rather than an error.
   *
   * @param {string} eventName - Name of the event to test.
   * @returns {boolean} True if that event triggers this transition.
   */
  isTriggeredBy(eventName) {
    return this.#eventName.text === eventName
  }

  /**
   * Tells whether the guard allows the move in the given context. A transition without a
   * guard is always allowed. The guard runs on every call, so its answer can change as
   * the context changes.
   *
   * @param {object} context - The state machine's shared context.
   * @returns {boolean} True if this transition may run right now.
   */
  isAllowedIn(context) {
    if (this.#guard === undefined) {
      return true
    }

    return Boolean(this.#guard(context))
  }

  /**
   * Returns the value unchanged if it is a function or undefined, and throws a
   * TypeError otherwise.
   *
   * @param {*} value - The value to check.
   * @returns {((context: object) => boolean)|undefined} The same value.
   */
  #requireOptionalGuard(value) {
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError('Transition guard must be a function when provided.')
    }

    return value
  }
}
