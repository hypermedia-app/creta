import clownface, { AnyPointer } from 'clownface'

export function combinePointers(...pointers: AnyPointer[]): AnyPointer {
  return clownface({
    _context: pointers.flatMap(pointer => pointer._context),
  })
}
