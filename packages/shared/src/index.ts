export {
  Primitive,
  isFunction,
  isObject,
  isString,
  isNumber,
  isBoolean,
  isSymbol,
  isUndefined,
  isBigInt,
  isNull,
  isPrimitive,
  isArray,
  isMap,
  isSet,
  isDate,
  isIntegerKey,
} from './isSomething'
export { makeMap } from './makeMap'

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const NOOP = () => {}

// compare whether a value has changed, accounting for NaN.
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
  objectToString.call(value)
export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1)
}

export const extend = Object.assign

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export function warn(msg: string, ...args: any[]) {
  console.warn(`[Velum warn] ${msg}`, ...args)
}

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}

const camelizeRE = /-(\w)/g
/**
 * @private
 */
export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

const hyphenateRE = /\B([A-Z])/g
/**
 * @private
 */
export const hyphenate = cacheStringFunction((str: string) =>
  str.replace(hyphenateRE, '-$1').toLowerCase()
)
export const capitalize = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)
