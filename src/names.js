/**
 * Holds the text shared by the two kinds of name below. A name is a string that holds at
 * least one character other than whitespace, and it is kept exactly as given. It is not
 * exported.
 */
class Name {
  #text

  /**
   * Creates a name. Throws a TypeError, named after the concrete class, if the value is
   * not a string, or if it is empty or holds only whitespace.
   *
   * @param {*} value - The value to use as a name.
   */
  constructor(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${this.constructor.name} must be a non-empty string.`)
    }

    this.#text = value
  }

  /**
   * Gets the name as the string it was created from.
   *
   * @returns {string} - The name, exactly as given.
   */
  get text() {
    return this.#text
  }
}

/**
 * The name of a state, as used by State and by the from and to of a Transition.
 */
export class StateName extends Name {}

/**
 * The name of an event, as used by the on of a Transition and by send and canSend.
 */
export class EventName extends Name {}
