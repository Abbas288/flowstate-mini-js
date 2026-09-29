import { State } from './State.js'
import { StateRegistry } from './StateRegistry.js'
import { Transition } from './Transition.js'
import { TransitionRegistry } from './TransitionRegistry.js'
import { BlockedTransitionError, NoTransitionError, UnknownStateError } from './errors.js'
import { EventName, StateName } from './names.js'

/**
 * A finite state machine. It is in one state at a time and moves to another state
 * when you send it an event that one of its transitions allows.
 */
export class StateMachine {
  #currentStateName
  #context = {}
  #states = new StateRegistry()
  #transitions = new TransitionRegistry()

  /**
   * Creates a machine that starts in the named state. That state can be defined after
   * the machine has been created, but it must be defined before the first event is sent.
   *
   * @param {string} initialStateName - Name of the state the machine starts in.
   */
  constructor(initialStateName) {
    this.#currentStateName = new StateName(initialStateName).text
  }

  /**
   * Changes only when send moves the machine. It cannot be set from outside.
   *
   * @returns {string} - Name of the state the machine is in.
   */
  get currentStateName() {
    return this.#currentStateName
  }

  /**
   * Holds your own data for guards and hooks. Every guard and hook receives this same
   * object, so a value written here can be read there. The object cannot be replaced.
   *
   * @returns {object} - The context every hook and guard is handed.
   */
  get context() {
    return this.#context
  }

  /**
   * Lists the states defined so far. The array is a copy, so changing it does not
   * change the machine.
   *
   * @returns {string[]} - Names of every defined state, in definition order.
   */
  get stateNames() {
    return this.#states.stateNames
  }

  /**
   * Adds a state the machine can be in. onEnter runs each time the machine enters the
   * state, and onExit each time it leaves it. Throws a DuplicateStateError if the name
   * is already defined, and a TypeError if the name or a hook has the wrong type.
   *
   * @param {string} name - Name the state is known by inside this machine.
   * @param {object} [options] - The hooks to run on the way in and out.
   * @param {(context: object) => void} [options.onEnter] - Runs on entering this state.
   * @param {(context: object) => void} [options.onExit] - Runs on leaving this state.
   * @returns {StateMachine} - This machine, so that definitions can be chained.
   */
  defineState(name, options) {
    this.#states.register(new State(name, options))

    return this
  }

  /**
   * Lets an event move the machine from one state to another. Both states must be
   * defined first, or an UnknownStateError is thrown. If a guard is given, the move
   * happens only when the guard returns a truthy value.
   *
   * @param {object} move - The three names that make up the move, plus an optional guard.
   * @param {string} move.from - Name of the state to leave.
   * @param {string} move.to - Name of the state to enter.
   * @param {string} move.on - Name of the triggering event.
   * @param {(context: object) => boolean} [move.guard] - Decides if the move is allowed.
   * @returns {StateMachine} - This machine, so that definitions can be chained.
   */
  defineTransition(move) {
    const transition = new Transition(move)

    this.#requireDefinedState(transition.fromStateName)
    this.#requireDefinedState(transition.toStateName)

    this.#transitions.register(transition)

    return this
  }

  /**
   * Moves the machine along the first transition on the event whose guard allows it.
   * Runs onExit of the current state, then changes the current state, then runs
   * onEnter of the new one. Throws NoTransitionError or BlockedTransitionError if the
   * machine cannot move.
   *
   * @param {string} eventName - Name of the event to send.
   */
  send(eventName) {
    this.#requireReadyToSend(eventName)

    const transition = this.#chooseTransition(eventName)

    this.#moveAlong(transition)
  }

  /**
   * Tells whether send would move the machine now, without moving it. Guards are asked
   * but no hook runs. Throws the same TypeError and UnknownStateError as send.
   *
   * @param {string} eventName - Name of the event to ask about.
   * @returns {boolean} - True if send would move the machine now, false if send would refuse the event.
   */
  canSend(eventName) {
    this.#requireReadyToSend(eventName)

    return this.#findAllowedTransition(eventName) !== undefined
  }

  /**
   * Lists the events that have a transition out of the state. Guards are not asked,
   * so sending a listed event can still throw a BlockedTransitionError.
   *
   * @param {string} fromStateName - Name of the state to look out from.
   * @returns {string[]} - Names of the events leaving that state, each once, in the order first defined.
   */
  eventNamesFrom(fromStateName) {
    const eventNames = this.#transitions.findAll({ from: fromStateName }).map((transition) => transition.eventName)

    return [...new Set(eventNames)]
  }

  /**
   * Throws unless a state with that name has been defined on this machine.
   *
   * @param {string} stateName - The name to look for.
   */
  #requireDefinedState(stateName) {
    if (!this.#states.has(stateName)) {
      throw new UnknownStateError(stateName)
    }
  }

  /**
   * Throws unless the event name is a non-empty string and the current state is defined.
   * Creating an EventName is what checks the event name.
   *
   * @param {*} eventName - The value to check.
   */
  #requireReadyToSend(eventName) {
    new EventName(eventName)
    this.#requireDefinedState(this.#currentStateName)
  }

  /**
   * Finds the transition send will take, and throws an error instead if there is none.
   *
   * @param {string} eventName - Name of the event that was sent.
   * @returns {Transition} - The first transition whose guard allows the move.
   */
  #chooseTransition(eventName) {
    return this.#findAllowedTransition(eventName) ?? this.#throwRefusedEventError(eventName)
  }

  /**
   * Asks the guards in definition order and stops at the first that allows the move.
   *
   * @param {string} eventName - Name of the event to look up.
   * @returns {Transition|undefined} - The transition send would take, or undefined if there is none.
   */
  #findAllowedTransition(eventName) {
    return this.#transitions
      .findAll({ from: this.#currentStateName, on: eventName })
      .find((candidate) => candidate.isAllowedIn(this.#context))
  }

  /**
   * Throws NoTransitionError when no transition leaves the current state on the event.
   * Throws BlockedTransitionError when such transitions exist but the guard of each one
   * refuses the move.
   *
   * @param {string} eventName - Name of the event that was refused.
   */
  #throwRefusedEventError(eventName) {
    const candidates = this.#transitions.findAll({ from: this.#currentStateName, on: eventName })

    if (candidates.length === 0) {
      throw new NoTransitionError(this.#currentStateName, eventName)
    }

    throw new BlockedTransitionError(candidates[0])
  }

  /**
   * Runs the exit hook, then changes the current state, then runs the enter hook.
   * If the exit hook throws an error, the current state has not changed yet. If the
   * enter hook throws an error, the current state has already changed.
   *
   * @param {Transition} transition - The transition to take.
   */
  #moveAlong(transition) {
    const fromState = this.#states.get(transition.fromStateName)
    const toState = this.#states.get(transition.toStateName)

    fromState.exit(this.#context)
    this.#currentStateName = toState.name
    toState.enter(this.#context)
  }
}
