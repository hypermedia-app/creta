export function ensureArray<T>(arg: undefined | T | T[]) {
  return !(arg) ? []
    : Array.isArray(arg)
      ? arg
      : [arg]
}
