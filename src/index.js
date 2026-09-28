/*
 * The only file a user imports from. StateMachine is the whole working interface;
 * State, Transition and the registries are built by the machine and stay internal.
 *
 * The error types are passed on as errors.js exports them, so that list is kept in
 * one place and a new error type cannot be forgotten here.
 */
export { StateMachine } from './StateMachine.js'
export * from './errors.js'
