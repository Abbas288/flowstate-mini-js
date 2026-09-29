/**
 * The Transition type, for the JSDoc below. It is a type only, so loading the errors
 * does not load the Transition class.
 *
 * @typedef {import('./Transition.js').Transition} Transition
 */

/**
 * Base class for every error the machine throws when one of its rules is broken.
 * Catch it to handle all of them, including kinds added in later versions.
 *
 * A wrong argument type is not one of these. If a name is not a string or a guard
 * is not a function, the built-in TypeError is thrown instead, since that is a
 * mistake in the calling code.
 */
class FlowStateError extends Error {
  /**
   * Names the error after its own class, so a log line says which kind it was.
   *
   * @param {string} message - What went wrong, in plain words.
   */
  constructor(message) {
    super(message)

    // Logs the actual class name (e.g., UnknownStateError) instead of "Error".
    this.name = this.constructor.name
  }
}

/**
 * Holds the state name for the errors below that are about a single state.
 * It is not exported.
 */
class StateNameError extends FlowStateError {
  #stateName

  /**
   * Stores the state name next to the message, so that code can read it without
   * parsing the message.
   *
   * @param {string} message - What went wrong, in plain words.
   * @param {string} stateName - The state name the error is about.
   */
  constructor(message, stateName) {
    super(message)

    this.#stateName = stateName
  }

  /**
   * Gets the state name on its own, so that code does not have to parse the message.
   *
   * @returns {string} The state name the error is about.
   */
  get stateName() {
    return this.#stateName
  }
}

/**
 * Thrown when a transition or the starting state names a state that was never defined.
 */
class UnknownStateError extends StateNameError {
  /**
   * Creates the error for a state name that was never defined.
   *
   * @param {string} stateName - The name that could not be found.
   */
  constructor(stateName) {
    super(`No state named "${stateName}" has been defined.`, stateName)
  }
}

/**
 * Thrown when defineState is called with a name that is already defined. The state
 * defined first, and its hooks, are kept.
 */
class DuplicateStateError extends StateNameError {
  /**
   * Creates the error for a state name that is already defined.
   *
   * @param {string} stateName - The name that was already taken.
   */
  constructor(stateName) {
    super(`A state named "${stateName}" is already defined.`, stateName)
  }
}

/**
 * Holds the state and event names for the errors below that say why send refused
 * an event. It is not exported.
 */
class RefusedEventError extends FlowStateError {
  #fromStateName
  #eventName

  /**
   * Stores the state and event names next to the message, so that code can read them
   * without parsing the message.
   *
   * @param {string} message - What went wrong, in plain words.
   * @param {object} refusedEvent - The event and the state it was sent in, such as a Transition.
   * @param {string} refusedEvent.fromStateName - Name of the state the machine is in.
   * @param {string} refusedEvent.eventName - Name of the event that was sent.
   */
  constructor(message, { fromStateName, eventName }) {
    super(message)

    this.#fromStateName = fromStateName
    this.#eventName = eventName
  }

  /**
   * Gets the name of the state the machine was in when it refused the event. The
   * machine is still in that state, since a refused event changes nothing.
   *
   * @returns {string} Name of the state the machine was in.
   */
  get fromStateName() {
    return this.#fromStateName
  }

  /**
   * Gets the event name exactly as it was sent, not a cleaned-up form of it.
   *
   * @returns {string} Name of the event that was sent.
   */
  get eventName() {
    return this.#eventName
  }
}

/**
 * Thrown by send when no transition leaves the current state on the event. Either
 * the event was sent in the wrong state, or a transition is missing.
 */
class NoTransitionError extends RefusedEventError {
  /**
   * Creates the error for a state and an event that no transition connects.
   *
   * @param {string} fromStateName - Name of the state the machine is in.
   * @param {string} eventName - Name of the event that was sent.
   */
  constructor(fromStateName, eventName) {
    super(`No transition from state "${fromStateName}" on event "${eventName}".`, { fromStateName, eventName })
  }
}

/**
 * Thrown by send when transitions exist for the event but the guard of each one
 * refuses the move. The same event may succeed later, once the context changes.
 */
class BlockedTransitionError extends RefusedEventError {
  #toStateName

  /**
   * Creates the error for the first transition whose guard refused the move.
   *
   * @param {Transition} transition - The transition whose guard refused it.
   */
  constructor(transition) {
    super(
      `The guard blocked the transition from state "${transition.fromStateName}" ` +
        `to state "${transition.toStateName}" on event "${transition.eventName}".`,
      transition
    )

    this.#toStateName = transition.toStateName
  }

  /**
   * Gets the name of the state the machine would have entered if the guard had allowed
   * the move.
   *
   * @returns {string} Name of the state the transition would have entered.
   */
  get toStateName() {
    return this.#toStateName
  }
}

/*
 * The error types a caller can catch: FlowStateError for every error the machine
 * throws, or one concrete kind for a single case. StateNameError and RefusedEventError
 * are not exported, since they only hold fields shared by the errors that extend them.
 */
// prettier-ignore
export {
  FlowStateError,
  UnknownStateError,
  DuplicateStateError,
  NoTransitionError,
  BlockedTransitionError,
}
