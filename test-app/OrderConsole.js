import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { FlowStateError } from 'flowstate-mini-js'

/**
 * Lets you drive the order flow from the terminal. You type a command, and the console
 * runs it and prints what happened. The prompt shows the state the order is in.
 */
export class OrderConsole {
  #machine

  // The commands you can type, by their first word. #printHelp describes them.
  #commands = new Map([
    ['send', (eventName) => this.#machine.send(eventName)],
    ['can', (eventName) => this.#printCanSend(eventName)],
    ['events', (stateName) => this.#printEventNames(stateName)],
    ['states', () => this.#printStateNames()],
    ['amount', (amount) => this.#setAmount(amount)],
    ['help', () => this.#printHelp()],
  ])

  /**
   * Creates a console for a machine. Nothing is read until start is called.
   *
   * @param {import('flowstate-mini-js').StateMachine} machine - The machine the commands act on.
   */
  constructor(machine) {
    this.#machine = machine
  }

  /**
   * Reads one command per line until you type quit or the input ends.
   */
  async start() {
    const terminal = createInterface({ input: stdin, output: stdout })

    console.log('Test-App for flowstate-mini-js: an order that is placed, paid, shipped and delivered.')
    this.#printHelp()
    this.#askForCommand(terminal)

    for await (const line of terminal) {
      if (line.trim() === 'quit') {
        break
      }

      this.#run(line)
      this.#askForCommand(terminal)
    }
  }

  /**
   * Shows a prompt with the name of the current state.
   *
   * @param {import('node:readline').Interface} terminal - The interface that reads the input.
   */
  #askForCommand(terminal) {
    terminal.setPrompt(`${this.#machine.currentStateName}> `)
    terminal.prompt()
  }

  /**
   * Runs one line, and prints the error instead if the machine refuses it.
   *
   * @param {string} line - What you typed, such as "send pay".
   */
  #run(line) {
    try {
      this.#runCommand(line.trim().split(/\s+/))
    } catch (error) {
      this.#printError(error)
    }
  }

  /**
   * Looks up the command by its first word and runs it with the second word.
   *
   * @param {string[]} words - The words of the line, command first.
   */
  #runCommand([commandName, argument]) {
    if (this.#commands.has(commandName)) {
      this.#commands.get(commandName)(argument)
    } else {
      console.log(`  Unknown command "${commandName}".`)
    }
  }

  /**
   * Prints whether send would take the event right now, without sending it.
   *
   * @param {string} eventName - Name of the event to ask about.
   */
  #printCanSend(eventName) {
    console.log(`  canSend("${eventName}"):`, this.#machine.canSend(eventName))
  }

  /**
   * Prints the events that have a transition out of the state.
   *
   * @param {string} [stateName] - Name of the state. Without it, the current state is used.
   */
  #printEventNames(stateName = this.#machine.currentStateName) {
    console.log(`  eventNamesFrom("${stateName}"):`, this.#machine.eventNamesFrom(stateName))
  }

  /**
   * Prints the names of all defined states.
   */
  #printStateNames() {
    console.log('  stateNames:', this.#machine.stateNames)
  }

  /**
   * Sets the amount in the context. The guard on pay allows the move only above 0.
   *
   * @param {string} amount - The amount as typed, such as "250".
   */
  #setAmount(amount) {
    this.#machine.context.amount = Number(amount)
    console.log('  context.amount:', this.#machine.context.amount)
  }

  /**
   * Prints the commands you can type.
   */
  #printHelp() {
    console.log(
      [
        'Commands:',
        '  send <event>     Send an event, such as send pay.',
        '  can <event>      Ask if send would take the event, without sending it.',
        '  events [state]   List the events out of a state. Without a state, the current one.',
        '  states           List the states.',
        '  amount <number>  Set the amount. Paying needs an amount above 0. It starts at 0.',
        '  help             Show this list.',
        '  quit             Stop the app.',
      ].join('\n')
    )
  }

  /**
   * Prints an error from the machine. Any other error is thrown again, since it is a bug
   * in the Test-App.
   *
   * @param {Error} error - The error that was caught.
   */
  #printError(error) {
    if (error instanceof FlowStateError || error instanceof TypeError) {
      console.log(`  ${error.name}: ${error.message}`)
    } else {
      throw error
    }
  }
}
