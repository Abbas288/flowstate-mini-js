import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { FlowStateError } from 'flowstate-mini-js'

/**
 * Lets you drive the order flow from the terminal. You type a command, and the console
 * runs it and prints what happened. The prompt shows the state the order is in.
 */
export class OrderConsole {
  #machine

  // The commands you can type, by their first word.
  #commands = new Map([['send', (eventName) => this.#machine.send(eventName)]])

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

    console.log('Type send <event> to send an event, or quit to stop.')
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
