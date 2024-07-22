import { Counter } from './App'
import Landom from './landom'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}
console.log(<Counter />)
Landom.render(<Counter />, container)
