export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function'
export const isObject = (value: unknown): value is Record<any, any> =>
  typeof value === 'object' && value !== null
export const isString = (value: unknown): value is string =>
  typeof value === 'string'
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number'
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'
export const isSymbol = (value: unknown): value is symbol =>
  typeof value === 'symbol'
export const isUndefined = (value: unknown): value is undefined =>
  typeof value === 'undefined'
export const isNull = (value: unknown): value is null => value === null
