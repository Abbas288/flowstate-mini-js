# flowstate-mini-js

A small finite state machine for JavaScript, with guards and hooks. No dependencies.

## What it does

A state machine keeps track of which state something is in, and which events may change
that state. An order can go from `placed` to `paid`, but not straight to `shipped`.

With `flowstate-mini-js` you can:

- Define states, with hooks that run when the machine enters or leaves them.
- Define transitions, each with an optional guard that decides if the move is allowed
  right now.
- Send an event to move the machine, or first ask whether the event would move it.
- List the events that lead out of a state.
- Tell from the error type why an event was refused: no transition exists, or a guard
  blocked it.

A transition can only connect states that are already defined. A typo in a state name is
therefore caught when you define the transition, not later when you send an event.

## What it does not do

- No nested or parallel states
- No async guards or hooks
- No saving to a file or database
- No user interface

## Requirements

- Node.js 18 or later. Developed and tested on Node.js 22.
- ES modules. Load the package with `import`, not `require`.
- No runtime dependencies.

## Installation

The package is not on npm. Install it from GitHub:

```bash
npm install github:Abbas288/flowstate-mini-js
```

Your project must use ES modules: set `"type": "module"` in your `package.json`, or name
your files `.mjs`.

Import everything from the package name. It exports `StateMachine` and five error classes.
The other files in `src/` are internal, and Node.js refuses to load them from outside
(`ERR_PACKAGE_PATH_NOT_EXPORTED`).

## Quick start

```js
import { StateMachine } from 'flowstate-mini-js'

const order = new StateMachine('placed')

order
  .defineState('placed')
  .defineState('paid', { onEnter: (context) => console.log(`Paid ${context.amount} kr`) })
  .defineState('shipped', { onEnter: () => console.log('On its way') })

order
  .defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: (context) => context.amount > 0 })
  .defineTransition({ from: 'paid', to: 'shipped', on: 'ship' })

console.log(order.canSend('pay')) // false, since context.amount is not set yet

order.context.amount = 250
order.send('pay') // Paid 250 kr
order.send('ship') // On its way

console.log(order.currentStateName) // shipped
```

## Concepts

| Term       | Meaning                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| State      | A named situation the machine can be in, such as `paid`. The machine is in exactly one state at a time.               |
| Event      | A name you send to the machine, such as `pay`.                                                                        |
| Transition | A rule: the event `on` moves the machine from the state `from` to the state `to`.                                     |
| Guard      | An optional function on a transition that decides whether the move is allowed.                                        |
| Hook       | An optional function on a state. `onEnter` runs when the machine enters the state, `onExit` when it leaves the state. |
| Context    | One object per machine for your own data. Every guard and hook receives it as its only argument.                      |

## Rules for names

- State and event names must be non-empty strings without whitespace at the start or end.
  `' pay'` and `'pay '` are rejected, but spaces inside a name, as in `'on hold'`, are fine.
- Names are compared exactly, so `'pay'` and `'Pay'` are two different names.

## Rules for states

- Each state name can be defined only once.
- A state must be defined before a transition can use it.
- The initial state may be defined after the machine is created, but it must be defined
  before the first call to `send` or `canSend`.

## API

Every state or event name you pass to the machine must follow the
[rules for names](#rules-for-names). Otherwise the machine throws a `TypeError`.

### Create a machine

```js
new StateMachine(initialStateName)
```

Creates a machine that starts in the state `initialStateName`.

### Define a state

```js
machine.defineState(name, options)
```

Adds a state. Returns the machine, so calls can be chained. `options` can be left out.

| Option    | Type                | Runs                                   |
| --------- | ------------------- | -------------------------------------- |
| `onEnter` | `(context) => void` | Each time the machine enters the state |
| `onExit`  | `(context) => void` | Each time the machine leaves the state |

Throws:

- `TypeError` if a hook is not a function.
- `DuplicateStateError` if a state with the name is already defined. The state defined
  first, with its hooks, is kept.

### Define a transition

```js
machine.defineTransition({ from, to, on, guard })
```

Lets the event `on` move the machine from `from` to `to`. Returns the machine, so calls can
be chained.

| Field   | Type                   | Meaning                                                |
| ------- | ---------------------- | ------------------------------------------------------ |
| `from`  | `string`               | Name of the state to leave                             |
| `to`    | `string`               | Name of the state to enter. May be the same as `from`. |
| `on`    | `string`               | Name of the event that triggers the move               |
| `guard` | `(context) => boolean` | Optional. Decides whether the move is allowed.         |

Several transitions may share an event, also when they leave the same state. See
[Choosing between transitions](#choosing-between-transitions).

Throws:

- `TypeError` if no object is given, or if `guard` is not a function.
- `UnknownStateError` if `from` or `to` is not a defined state. The transition is not added.

### Send an event

```js
machine.send(eventName)
```

Moves the machine on the event. Returns `undefined`. The steps are listed in
[What happens when you send an event](#what-happens-when-you-send-an-event).

Throws:

- `UnknownStateError` if the initial state was never defined.
- `NoTransitionError` if no transition leaves the current state on the event.
- `BlockedTransitionError` if such transitions exist, but every guard refused the move.
- Any error that a guard or hook throws, unchanged.

### Check an event before sending it

```js
machine.canSend(eventName)
```

Returns `true` if `send(eventName)` would move the machine now, and `false` if it would
refuse the event. The guards are asked, but no hook runs and the machine does not move.

Throws:

- `UnknownStateError` if the initial state was never defined.
- Any error that a guard throws, unchanged.

It never throws `NoTransitionError` or `BlockedTransitionError`. It returns `false` instead.

### List the events out of a state

```js
machine.eventNamesFrom(stateName)
```

Returns the names of the events that have a transition out of `stateName`. Each name is
listed once, in the order it was first defined. A state without transitions out gives `[]`.

The guards are not asked, so `send` with a listed event can still throw
`BlockedTransitionError`.

Throws `UnknownStateError` if `stateName` is not a defined state.

### Properties

All three are read-only. Assigning to them throws `TypeError`.

| Property           | Type       | Value                                                                              |
| ------------------ | ---------- | ---------------------------------------------------------------------------------- |
| `currentStateName` | `string`   | Name of the state the machine is in. Changes only when `send` moves the machine.   |
| `context`          | `object`   | Your data for guards and hooks. Starts as `{}`. Change its properties, not itself. |
| `stateNames`       | `string[]` | Names of the defined states, in definition order. A new copy on every read.        |

## What happens when you send an event

1. <a id="step-1"></a>`send` checks that `eventName` follows the rules for names and that
   the current state is defined.
2. <a id="step-2"></a>It finds the transitions that leave the current state on the event, in
   definition order.
3. <a id="step-3"></a>It asks their guards in that order, with the context. It takes the
   first transition whose guard returns a truthy value, and asks no further guards. A
   transition without a guard is always allowed.
4. <a id="step-4"></a>If no transition was found, it throws `NoTransitionError`. If every
   guard refused, it throws `BlockedTransitionError`. In both cases the machine stays where
   it was and no hook runs.
5. <a id="step-5"></a>It runs `onExit` of the current state, then changes the current
   state, then runs `onEnter` of the new state. A transition from a state to itself runs
   both hooks too.

### Example

Two transitions leave `placed` on `pay`. The guards and hooks log when they run:

```js
import { StateMachine } from 'flowstate-mini-js'

const order = new StateMachine('placed')

order
  .defineState('placed', { onExit: () => console.log(`onExit of placed, state: ${order.currentStateName}`) })
  .defineState('paid', { onEnter: () => console.log(`onEnter of paid, state: ${order.currentStateName}`) })
  .defineState('rejected')

order
  .defineTransition({
    from: 'placed',
    to: 'rejected',
    on: 'pay',
    guard: (context) => {
      const allowed = context.amount <= 0
      console.log(`guard to rejected: ${allowed}`)
      return allowed
    },
  })
  .defineTransition({
    from: 'placed',
    to: 'paid',
    on: 'pay',
    guard: (context) => {
      const allowed = context.amount > 0
      console.log(`guard to paid: ${allowed}`)
      return allowed
    },
  })

order.context.amount = 250
order.send('pay')
```

It prints four lines:

| Output                            | Step         | What happens                                                    |
| --------------------------------- | ------------ | --------------------------------------------------------------- |
| `guard to rejected: false`        | [3](#step-3) | This guard was defined first, so it is asked first. It refuses. |
| `guard to paid: true`             | [3](#step-3) | This guard allows the move, so `placed` → `paid` is taken.      |
| `onExit of placed, state: placed` | [5](#step-5) | `onExit` runs before the state changes.                         |
| `onEnter of paid, state: paid`    | [5](#step-5) | `onEnter` runs after the state has changed.                     |

The machine is now in `paid`. No transition leaves `paid` on `pay`, so `send('pay')` would
throw `NoTransitionError` ([step 4](#step-4)). [`canSend`](#check-an-event-before-sending-it) asks
without throwing:

```js
console.log(order.canSend('pay')) // false
```

### When a guard or hook throws

If a guard or a hook throws an error, `send` passes it on unchanged:

- If a guard or `onExit` throws, the machine has not moved.
- If `onEnter` throws, the machine has already moved to the new state.

## Choosing between transitions

Since `send` takes the first allowed transition ([step 3](#step-3)), put the transition with
the strictest guard first, and a transition without a guard last as the fallback:

```js
import { StateMachine } from 'flowstate-mini-js'

const order = new StateMachine('placed')

order.defineState('placed').defineState('paid').defineState('rejected')

order
  .defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: (context) => context.amount > 0 })
  .defineTransition({ from: 'placed', to: 'rejected', on: 'pay' })

order.context.amount = 0
order.send('pay')

console.log(order.currentStateName) // rejected
```

## Errors

Each error the machine throws for a broken rule extends `FlowStateError`. Catch
`FlowStateError` to handle all of them, or catch one class for a single case. `error.name`
is the class name, such as `'NoTransitionError'`.

| Error                    | Thrown when                                                                                                                                                                                                                                                                                                              | Properties                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `UnknownStateError`      | [`defineTransition`](#define-a-transition) gets a `from` or `to` that is not a defined state.<br>[`eventNamesFrom`](#list-the-events-out-of-a-state) gets a state name that is not defined.<br>[`send`](#send-an-event) or [`canSend`](#check-an-event-before-sending-it) is called before the initial state is defined. | `stateName`                                 |
| `DuplicateStateError`    | [`defineState`](#define-a-state) gets a name that is already defined.                                                                                                                                                                                                                                                    | `stateName`                                 |
| `NoTransitionError`      | [`send`](#send-an-event) gets an event with no transition out of the current state.                                                                                                                                                                                                                                      | `fromStateName`, `eventName`                |
| `BlockedTransitionError` | [`send`](#send-an-event) gets an event whose transitions all have guards that refuse the move.                                                                                                                                                                                                                           | `fromStateName`, `eventName`, `toStateName` |

`BlockedTransitionError` has one `toStateName`. When several transitions leave the current state
on the event and all are refused, it is the `to` of the one defined first. In the example under
[What happens when you send an event](#example), the transition to `rejected` is defined before
the one to `paid`. If `order.send('pay')` runs before `order.context.amount` is set, both guards
refuse, and `toStateName` is `'rejected'`.

A wrong argument throws the built-in `TypeError` instead, for example a name that breaks the
rules for names, or a hook that is not a function. It is not a `FlowStateError`, since it
points to a bug in the calling code rather than a refused event.

```js
import { StateMachine, BlockedTransitionError, NoTransitionError } from 'flowstate-mini-js'

const order = new StateMachine('placed')

order.defineState('placed').defineState('paid')
order.defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: (context) => context.amount > 0 })

try {
  order.send('pay')
} catch (error) {
  if (error instanceof BlockedTransitionError) {
    console.log(`Cannot go to ${error.toStateName} yet`) // Cannot go to paid yet
  } else if (error instanceof NoTransitionError) {
    console.log(`${error.eventName} is not possible in ${error.fromStateName}`)
  } else {
    throw error
  }
}
```

## Project structure

```text
src/       The module. src/index.js is the entry point, the other files are internal.
test/      Unit tests (Vitest). The StateMachine tests are split into several files in test/StateMachine/.
test-app/  A console app for trying the module by hand. It imports the module by its package name, like a user would.
```

## Development

```bash
git clone https://github.com/Abbas288/flowstate-mini-js.git
cd flowstate-mini-js
npm install
npm test
```

| Script                  | What it does                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm test`              | Runs the unit tests with Vitest                                                                           |
| `npm run test:coverage` | Runs the unit tests and measures how much of `src/` they cover. The full report is written to `coverage/` |
| `npm run lint`          | Checks the JavaScript files with ESLint                                                                   |
| `npm run format:check`  | Checks the formatting of all files with Prettier                                                          |
| `npm run format`        | Formats all files with Prettier                                                                           |
| `npm run lint:fix`      | Formats all files with Prettier, then fixes what ESLint can in the JavaScript files and lists the rest    |

To try the module by hand, start the Test-App. It installs the module from the folder above, so
it runs the code in `src/`:

```bash
cd test-app
npm install
npm start
```

It runs an order flow in the terminal. Type `help` to see the commands.

The test results are in [TEST_REPORT.md](TEST_REPORT.md).

## Contributing

Report bugs and ask questions in [GitHub issues](https://github.com/Abbas288/flowstate-mini-js/issues).
Pull requests are welcome. Before you open one, add a test for your change and run
`npm test`, `npm run lint` and `npm run format:check`.

## Version

The current version is 0.1.0 (see `package.json`). Until version 1.0.0, the API may still
change.

## License

MIT, see [LICENSE](LICENSE).
