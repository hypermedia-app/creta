type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>
}

declare module '@graphy/content.trig.read'
