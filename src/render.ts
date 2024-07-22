import { TEXT_ELEMENT } from './conts'
import { Primitive, TextElement, LandElement } from './types'

const createTextElement = (text: Primitive): TextElement => {
  return {
    type: TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: []
    }
  }
}

export const createElement = (
  type: string,
  props: Record<string, any> & { children: Array<string> }
): LandElement => {
  let children = []
  if (!Array.isArray(props.children)) {
    children = [createTextElement(props.children)]
  } else {
    children = props.children.map(child => {
      if (typeof child === 'string' || typeof child === 'number') {
        return createTextElement(child)
      } else {
        return child
      }
    })
  }

  return {
    type,
    props: {
      ...props,
      children
    }
  }
}
