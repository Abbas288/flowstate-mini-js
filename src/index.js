/*
 * Entry point of flowstate-mini-js.
 *
 *   import { StateMachine, FlowStateError } from 'flowstate-mini-js'
 *
 * StateMachine is the class you work with. The error classes are exported so that you
 * can catch them by type. FlowStateError is the base class of all of them.
 */
export { StateMachine } from './StateMachine.js'
export * from './errors.js'
