import { expect } from 'vitest'

/**
 * Checks that exactly these objects came back, in this order. toEqual cannot tell
 * them apart, since it ignores private fields and these objects have no other fields.
 *
 * @param {object[]} actual - The objects that came back.
 * @param {object[]} expected - The very objects that should have come back.
 */
export const expectSameItems = (actual, expected) => {
  expect(actual).toHaveLength(expected.length)

  expected.forEach((item, index) => {
    expect(actual[index]).toBe(item)
  })
}
