type TIntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]: Partial<HTMLElementTagNameMap[K]>
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends TIntrinsicElements {}
  }
}
