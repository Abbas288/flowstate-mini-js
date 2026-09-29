import { OrderConsole } from './OrderConsole.js'
import { OrderFlow } from './OrderFlow.js'

const orderFlow = new OrderFlow()
const orderConsole = new OrderConsole(orderFlow.machine)

await orderConsole.start()
