# flowstate-mini-js

A small state machine library for JavaScript. No dependencies.

## What it does

A state machine keeps track of which state something is in, and which events are allowed
to change that state. An order can go from `placed` to `paid`, but not straight to `shipped`.

With `flowstate-mini-js` you can:

- Define states with hooks that run when the machine enters or leaves them.
- Define transitions, each with an optional guard that decides whether the move is allowed right now.
- Send an event to move the machine, or ask first whether the event would move it.
- Tell from the type of error whether no transition leaves the current state on the event,
  or whether a guard refused the move.

A transition can only connect states that have already been defined, so a mistake in the
graph is caught when the transition is defined, not when an event is sent.

## What it does not do

- No nested or parallel states
- No async transitions
- No saving to a file or database
- No user interface

## Status

Early development.

## License

MIT — see [LICENSE](LICENSE).
