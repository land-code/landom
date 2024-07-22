import { TEXT_ELEMENT } from './conts'

export type Primitive = string | number | boolean | null | undefined

export interface LandElement {
  type: string
  props: Record<string, any> & {
    children: Array<LandElement | TextElement>
  }
}

export interface TextElement extends LandElement {
  type: typeof TEXT_ELEMENT
  props: {
    nodeValue: Primitive
    children: []
  }
}

export type Fiber = {
  type?: string | typeof TEXT_ELEMENT | Function
  props: Record<string, any> & {
    children: Array<LandElement | TextElement>
  }
  hooks?: Array<any>
  parent?: Fiber
  child?: Fiber | null
  sibling?: Fiber | null
  dom?: HTMLElement | Text | null
  alternate?: Fiber | null
  effectTag?: 'UPDATE' | 'PLACEMENT' | 'DELETION'
}

export type PrimitiveFiber = Fiber & {
  type?: string | typeof TEXT_ELEMENT
}
