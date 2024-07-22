/* DOM */

import { TEXT_ELEMENT } from './conts'
import { createElement } from './render'
import { Fiber, LandElement, PrimitiveFiber } from './types'

const createDom = (fiber: PrimitiveFiber) => {
  if (!fiber.type) {
    throw new Error('Element type is invalid')
  }
  const dom =
    fiber.type === TEXT_ELEMENT
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)

const updateDom = (
  dom: HTMLElement | Text,
  prevProps: Record<string, any>,
  nextProps: Record<string, any>
) => {
  // Remove old event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || prevProps[key] !== nextProps[key])
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old attributes
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(key => !(key in nextProps))
    .forEach(key => {
      // @ts-expect-error - TS doesn't like the fact that we're setting an empty string
      dom[key] = ''
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(key => prevProps[key] !== nextProps[key])
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  // Add attributes
  Object.keys(nextProps)
    .filter(isProperty)
    .forEach(key => {
      // @ts-expect-error - TS doesn't like the fact that we're setting an empty string
      dom[key] = nextProps[key]
    })
}

const commitDeletion = (
  fiber: Fiber | null | undefined,
  domParent: HTMLElement | null
) => {
  if (fiber?.dom) {
    domParent?.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber?.child, domParent)
  }
}

const commitWork = (fiber: Fiber) => {
  if (!fiber) return

  let domParentFiber = fiber.parent
  while (!domParentFiber?.dom) {
    domParentFiber = domParentFiber?.parent
  }
  const domParent = domParentFiber?.dom

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
    domParent?.appendChild(fiber.dom)
  } else if (
    fiber.effectTag === 'UPDATE' &&
    fiber.dom &&
    fiber.alternate?.props
  ) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (
    fiber.effectTag === 'DELETION' &&
    domParent instanceof HTMLElement
  ) {
    commitDeletion(fiber, domParent)
  }
  if (fiber.child) {
    commitWork(fiber.child)
  }
  if (fiber.sibling) {
    commitWork(fiber.sibling)
  }
}

const commitRoot = () => {
  deletions.forEach(commitWork)
  if (!wipRoot) return
  if (wipRoot.child) {
    commitWork(wipRoot.child)
  }
  currentRoot = wipRoot
  wipRoot = null
}

export const render = (
  element: ReturnType<typeof createElement>,
  container: HTMLElement
) => {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

let wipFiber: Fiber | null = null
let hookIndex: number | null = null

const updateFunctionComponent = (fiber: Fiber) => {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []

  if (!fiber.type || !(fiber.type instanceof Function)) return
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

type Hook<T> = {
  state: T
  queue: Array<Action<T>>
}

type Action<T> = (state: T) => T

export const useState = <T>(
  initial: T
): [T, (action: (state: T) => T) => void] => {
  const initialValue = typeof initial === 'function' ? initial() : initial

  const oldHook: Hook<T> =
    hookIndex !== null ? wipFiber?.alternate?.hooks?.[hookIndex] : undefined
  const hook: Hook<T> = {
    state: oldHook ? oldHook.state : initialValue,
    queue: []
  }

  const actions = oldHook?.queue ?? []
  actions.forEach(action => {
    hook.state = typeof action === 'function' ? action(hook.state) : action
  })

  const setState = (action: (state: T) => T) => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot?.dom,
      props: currentRoot?.props ?? { children: [] },
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber?.hooks?.push(hook)
  if (hookIndex === null) hookIndex = 0
  hookIndex++
  return [hook.state, setState]
}

const updateHostComponent = (fiber: Fiber) => {
  if (!fiber.dom) {
    if (fiber.type instanceof Function) return
    fiber.dom = createDom(fiber as PrimitiveFiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

let nextUnitOfWork: Fiber | null | undefined = null
let currentRoot: Fiber | null = null
let wipRoot: Fiber | null = null
let deletions: Array<Fiber> = []

const performUnitOfWork = (fiber: Fiber) => {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber: Fiber | undefined = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

const reconcileChildren = (wipFiber: Fiber, elements: Array<LandElement>) => {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: Fiber | null = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber: Fiber | null = null

    const sameType = oldFiber && element && element.type === oldFiber.type

    if (sameType) {
      // Update the node
      newFiber = {
        type: oldFiber?.type,
        props: element.props,
        dom: oldFiber?.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element && prevSibling) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

type Deadline = {
  timeRemaining: () => number
}

const workLoop = (deadline: Deadline) => {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)
