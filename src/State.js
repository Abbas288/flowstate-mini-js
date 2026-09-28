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
    this.#requireName(name)
    this.#requireOptionalHook(onEnter, 'onEnter')
    this.#requireOptionalHook(onExit, 'onExit')

    this.#name = name
    this.#onEnter = onEnter
    this.#onExit = onExit
  }

  /**
   * The name cannot be changed after the state has been created.
   *
   * @returns {string} - The name identifying this state.
   */
  get name() {
    return this.#name
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
   * Throws unless the value can be used as this state's name.
   *
   * @param {*} value - The value to check.
   */
  #requireName(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError('State name must be a non-empty string.')
    }
  }

  /**
   * Throws unless the value is a function. Hooks are optional, so undefined passes.
   *
   * @param {*} value - The value to check.
   * @param {string} label - Hook name, used in the error message.
   */
  #requireOptionalHook(value, label) {
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError(`${label} must be a function when provided.`)
    }
  }
}
