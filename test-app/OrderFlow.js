import { StateMachine } from 'flowstate-mini-js'

/**
 * The order flow the Test-App lets you try. An order is placed, paid, shipped and
 * delivered, and it can be cancelled until it ships. Paying needs an amount above 0.
 */
export class OrderFlow {
  #machine = new StateMachine('placed')
  #print

  /**
   * Defines the states and transitions, and starts the order with an amount of 0.
   *
   * @param {(text: string) => void} print - Receives each line the hooks report, such as console.log.
   */
  constructor(print) {
    this.#print = print
    this.#defineStates()
    this.#defineTransitions()
    this.#machine.context.amount = 0
  }

  /**
   * Gets the state machine that runs the order flow.
   *
   * @returns {StateMachine} The machine, ready to receive events.
   */
  get machine() {
    return this.#machine
  }

  /**
   * Defines every state, with hooks that print when the order leaves or enters it.
   */
  #defineStates() {
    for (const stateName of ['placed', 'paid', 'shipped', 'delivered', 'cancelled']) {
      this.#machine.defineState(stateName, { onEnter: this.#printEnter, onExit: this.#printExit })
    }
  }

  /**
   * Defines the moves between the states. Only pay has a guard.
   */
  #defineTransitions() {
    this.#machine
      .defineTransition({ from: 'placed', to: 'paid', on: 'pay', guard: this.#hasAmountToPay })
      .defineTransition({ from: 'placed', to: 'cancelled', on: 'cancel' })
      .defineTransition({ from: 'paid', to: 'cancelled', on: 'cancel' })
      .defineTransition({ from: 'paid', to: 'shipped', on: 'ship' })
      .defineTransition({ from: 'shipped', to: 'delivered', on: 'deliver' })
  }

  /**
   * The onEnter hook of every state. The state has already changed when it runs.
   */
  #printEnter = () => {
    this.#print(`  onEnter of ${this.#machine.currentStateName}`)
  }

  /**
   * The onExit hook of every state. The state has not changed yet when it runs.
   */
  #printExit = () => {
    this.#print(`  onExit of ${this.#machine.currentStateName}`)
  }

  /**
   * The guard on pay. It allows the move only when there is an amount to pay.
   *
   * @param {object} context - The machine's shared context.
   * @returns {boolean} True if the amount is above 0.
   */
  #hasAmountToPay = (context) => context.amount > 0
}
