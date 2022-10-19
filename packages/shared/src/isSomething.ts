import { toTypeString } from './index'

export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | undefined
  | null

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
export const isBigInt = (value: unknown): value is bigint =>
  typeof value === 'bigint'
export const isNull = (value: unknown): value is null => value === null
export const isPrimitive = (value: unknown): boolean =>
  isNull(value) ||
  ['number', 'string', 'bigint', 'boolean', 'undefined', 'symbol'].includes(
    typeof value
  )
export const isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'
export const isDate = (val: unknown): val is Date =>
  toTypeString(val) === '[object Date]'
export const isFunction = (value: unknown): value is Function =>
  typeof value === 'function'
export const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null
export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  `${Number.parseInt(key, 10)}` === key
