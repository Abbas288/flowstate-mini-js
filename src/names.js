/**
 * Holds the text shared by the two kinds of name below. A name is a non-empty string
 * without whitespace at the start or end. It is not exported.
 */
class Name {
  #text

  /**
   * Creates a name. The error message names the concrete class, StateName or EventName.
   *
   * @param {*} value - The value to use as a name.
   * @throws {TypeError} If the value is not a non-empty string, or starts or ends with whitespace.
   */
  constructor(value) {
    if (typeof value !== 'string' || this.#isEmpty(value) || this.#startsOrEndsWithWhitespace(value)) {
      throw new TypeError(`${this.constructor.name} must be a non-empty string without whitespace at the start or end.`)
    }

    this.#text = value
  }

  /**
   * Gets the name as the string it was created from.
   *
   * @returns {string} The name, exactly as given.
   */
  get text() {
    return this.#text
  }

  /**
   * Tells whether the string has no characters at all.
   *
   * @param {string} value - The string to check.
   * @returns {boolean} True if the string is empty.
   */
  #isEmpty(value) {
    return value === ''
  }

  /**
   * Tells whether the string starts or ends with whitespace, such as a space, a tab or a
   * line break.
   *
   * @param {string} value - The string to check.
   * @returns {boolean} True if trimming the string would change it.
   */
  #startsOrEndsWithWhitespace(value) {
    return value.trim() !== value
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
