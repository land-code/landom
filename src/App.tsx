import { useState } from './dom'

export const Counter = () => {
  const [count, setCount] = useState(0)
  return <div onclick={() => setCount(count => count + 1)}>Count: {count}</div>
}
