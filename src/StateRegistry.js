import { State } from './State.js'
import { DuplicateStateError } from './errors.js'

/**
 * Stores the states belonging to one machine and looks them up by name.
 */
export class StateRegistry {
  #statesByName = new Map()

  /**
   * Stores a state under its own name. A name can be used only once, since
   * replacing a state would silently throw away the earlier one's hooks.
   *
   * @param {State} state - The state to store.
   * @throws {TypeError} If the value is not a State.
   * @throws {DuplicateStateError} If a state with the same name is already registered.
   */
  register(state) {
    this.#requireState(state)
    this.#requireUnusedName(state.name)

    this.#statesByName.set(state.name, state)
  }

  /**
   * Tells whether a state is registered under the name, without fetching it.
   *
   * @param {string} name - The name to look for.
   * @returns {boolean} True if a state with that name is registered.
   */
  has(name) {
    return this.#statesByName.has(name)
  }

  /**
   * Gets the state registered under the name. A name that is not registered gives
   * undefined, the way Map.get does.
   *
   * @param {string} name - The name to look for.
   * @returns {State|undefined} The state under that name, or undefined if there is none.
   */
  get(name) {
    return this.#statesByName.get(name)
  }

  /**
   * Gets the names of the registered states. The array is new on every access, so the
   * caller cannot change the registry.
   *
   * @returns {string[]} Names of every registered state, in registration order.
   */
  get stateNames() {
    return [...this.#statesByName.keys()]
  }

  /**
   * Throws unless the value is a State.
   *
   * @param {*} value - The value to check.
   */
  #requireState(value) {
    if (!(value instanceof State)) {
      throw new TypeError('Only State instances can be registered.')
    }
  }

  /**
   * Throws a DuplicateStateError if a state with the name is already registered.
   *
   * @param {string} name - The name to check.
   */
  #requireUnusedName(name) {
    if (this.has(name)) {
      throw new DuplicateStateError(name)
    }
  }
}
