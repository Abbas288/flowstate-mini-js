import { expect } from 'vitest'

/**
 * Checks that the array holds exactly these objects, in this order. toEqual is not
 * enough: it accepts a copy with the same contents, and it treats all Transitions as
 * equal, since it ignores private fields.
 *
 * @param {object[]} actual - The array to check.
 * @param {object[]} expected - The objects it should hold.
 */
export const expectSameItems = (actual, expected) => {
  expect(actual).toHaveLength(expected.length)

  expected.forEach((item, index) => {
    expect(actual[index]).toBe(item)
  })
}
