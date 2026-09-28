import { State } from './State.js'
import { StateRegistry } from './StateRegistry.js'
import { Transition } from './Transition.js'
import { TransitionRegistry } from './TransitionRegistry.js'
import { BlockedTransitionError, NoTransitionError, UnknownStateError } from './errors.js'

/**
 * A machine that is in exactly one state at a time, and that can be asked about the
 * states and transitions it knows.
 */
export class StateMachine {
  #currentStateName
  #context = {}
  #states = new StateRegistry()
  #transitions = new TransitionRegistry()

  /**
   * The starting state need not be defined yet. It can be defined after the machine
   * has been created.
   *
   * @param {string} initialStateName - Name of the state the machine starts in.
   */
  constructor(initialStateName) {
    this.#requireName(initialStateName, 'Initial state name')

    this.#currentStateName = initialStateName
  }

  /**
   * Only the machine can change its own state, so this name cannot be written.
   *
   * @returns {string} - Name of the state the machine is in.
   */
  get currentStateName() {
    return this.#currentStateName
  }

  /**
   * The object itself is handed out rather than a copy, so that hooks, guards
   * and the caller all write to the same place. Only the reference is fixed.
   *
   * @returns {object} - The context every hook and guard is handed.
   */
  get context() {
    return this.#context
  }

  /**
   * A defined state is not the same as a reachable one, since defining
   * a state connects it to nothing.
   *
   * @returns {string[]} - Names of every defined state, in definition order.
   */
  get stateNames() {
    return this.#states.stateNames
  }

  /**
   * The name and the hooks are checked here, so a bad definition fails at
   * once instead of on the first move. A name can be defined only once.
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
   * Both named states must already be defined, so that the graph can never
   * point at a state that does not exist.
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
   * Runs the exit hook, then changes the current state, then runs the enter hook.
   * Throws NoTransitionError or BlockedTransitionError if the machine cannot move.
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
   * Guards are not consulted, so a listed event may still be refused
   * at the moment it is sent.
   *
   * @param {string} fromStateName - Name of the state to look out from.
   * @returns {string[]} - Names of the events leaving that state, each once, in the order first defined.
   */
  eventNamesFrom(fromStateName) {
    const eventNames = this.#transitions.transitionsFrom(fromStateName).map((transition) => transition.eventName)

    return [...new Set(eventNames)]
  }

  /**
   * Throws unless the value can be used as a name.
   *
   * @param {*} value - The value to check.
   * @param {string} label - What the name is for, used to open the error message.
   */
  #requireName(value, label) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`${label} must be a non-empty string.`)
    }
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
   *
   * @param {*} eventName - The value to check.
   */
  #requireReadyToSend(eventName) {
    this.#requireName(eventName, 'Event name')
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
      .findAll(this.#currentStateName, eventName)
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
    const candidates = this.#transitions.findAll(this.#currentStateName, eventName)

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
