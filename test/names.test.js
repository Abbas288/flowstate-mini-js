import { describe, expect, it } from 'vitest'
import { EventName, StateName } from '../src/names.js'
import { invalidNames } from './helpers/fixtures.js'

const nameClasses = [
  ['StateName', StateName],
  ['EventName', EventName],
]

describe.each(nameClasses)('%s', (className, NameClass) => {
  it('gives back the text it was created from', () => {
    const name = new NameClass('paid')

    expect(name.text).toBe('paid')
  })

  it('keeps spaces inside the name', () => {
    const name = new NameClass('on hold')

    expect(name.text).toBe('on hold')
  })

  it('rejects a value that is not a non-empty string', () => {
    for (const invalidName of invalidNames) {
      expect(() => new NameClass(invalidName)).toThrow(TypeError)
    }
  })

  it('rejects a name that starts or ends with whitespace', () => {
    for (const paddedName of [' paid', 'paid ', '\tpaid', 'paid\n']) {
      expect(() => new NameClass(paddedName)).toThrow(TypeError)
    }
  })

  it('names its own class in the error message', () => {
    expect(() => new NameClass('')).toThrow(
      `${className} must be a non-empty string without whitespace at the start or end.`
    )
  })

  it('does not let the text be written from outside', () => {
    const name = new NameClass('paid')

    expect(() => {
      name.text = 'shipped'
    }).toThrow(TypeError)
    expect(name.text).toBe('paid')
  })
})

describe('StateName and EventName', () => {
  it('are separate types, so a state name is not an event name', () => {
    expect(new StateName('pay')).not.toBeInstanceOf(EventName)
    expect(new EventName('pay')).not.toBeInstanceOf(StateName)
  })
})
