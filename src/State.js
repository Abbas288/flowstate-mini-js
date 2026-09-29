import { StateName } from './names.js'

/**
 * A single named state in a state machine.
 */
export class State {
  #name
  #onEnter
  #onExit

  /**
   * Creates a state. Both hooks are optional. Throws a TypeError if the name or a
   * hook has the wrong type.
   *
   * @param {string} name - Identifies the state within its machine.
   * @param {object} [options] - The hooks to run on the way in and out.
   * @param {(context: object) => void} [options.onEnter] - Runs on entering this state.
   * @param {(context: object) => void} [options.onExit] - Runs on leaving this state.
   */
  constructor(name, { onEnter, onExit } = {}) {
    this.#name = new StateName(name)
    this.#onEnter = this.#requireOptionalHook(onEnter, 'onEnter')
    this.#onExit = this.#requireOptionalHook(onExit, 'onExit')
  }

  /**
   * The name cannot be changed after the state has been created.
   *
   * @returns {string} - The name identifying this state.
   */
  get name() {
    return this.#name.text
  }

  /**
   * Runs the onEnter hook, or does nothing if the state was given none.
   *
   * @param {object} context - The state machine's shared context.
   */
  enter(context) {
    if (this.#onEnter !== undefined) {
      this.#onEnter(context)
    }
  }

  /**
   * Runs the onExit hook, or does nothing if the state was given none.
   *
   * @param {object} context - The state machine's shared context.
   */
  exit(context) {
    if (this.#onExit !== undefined) {
      this.#onExit(context)
    }
  }

  /**
   * Returns the value unchanged if it is a function or undefined, and throws a
   * TypeError otherwise.
   *
   * @param {*} value - The value to check.
   * @param {string} label - Hook name, used in the error message.
   * @returns {((context: object) => void)|undefined} - The same value.
   */
  #requireOptionalHook(value, label) {
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError(`${label} must be a function when provided.`)
    }

    return value
  }
}
