import { OrderConsole } from './OrderConsole.js'
import { OrderFlow } from './OrderFlow.js'

const orderFlow = new OrderFlow(console.log)
const orderConsole = new OrderConsole(orderFlow.machine)

await orderConsole.start()
