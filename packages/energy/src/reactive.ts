import { isObject, toRawType } from '@velum/shared'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers'
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from './collectionHandlers'
import { isAtom, transferAtomToReadonly } from './atom'
import type { Atom, ReadonlyAtom } from './atom'
import type { Primitive } from '@velum/shared'

export enum ReactiveFlags {
  RAW = '__v_raw',
  SKIP = '__v_skip',
  IS_SHALLOW = '__v_isShallow',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}
export interface ReactiveTarget {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}

export const reactiveMap = new WeakMap<ReactiveTarget, any>()
export const shallowReactiveMap = new WeakMap<ReactiveTarget, any>()
export const readonlyMap = new WeakMap<ReactiveTarget, any>()
export const shallowReadonlyMap = new WeakMap<ReactiveTarget, any>()

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}
function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

type Builtin = Primitive | Function | Date | Error | RegExp
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepReadonly<U>>
  : T extends Promise<infer U>
  ? Promise<DeepReadonly<U>>
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>

function getTargetType(value: ReactiveTarget) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

export function reactive<T extends object>(target: T) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

/**
 * Creates a readonly copy of the original object. Note the returned copy is not
 * made reactive, but `readonly` can be called on an already reactive object.
 */
export function readonly<T extends object>(
  target: T
): T extends Atom<infer V> ? ReadonlyAtom<V> : DeepReadonly<T> {
  if (isAtom(target)) {
    return transferAtomToReadonly(target) as any
  }
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  )
}

function createReactiveObject(
  target: ReactiveTarget,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<ReactiveTarget, any>
) {
  if (!isObject(target)) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }
  // target is already a Proxy, return it.
  // exception: calling createReactiveObject(...,true,...) on a reactive object
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  // target already has corresponding Proxy
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  // only specific value types can be observed.
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
}

export declare const ShallowReactiveMarker: unique symbol
export type ShallowReactive<T> = T & { [ShallowReactiveMarker]?: true }
/**
 * Return a shallowly-reactive copy of the original object, where only the root
 * level properties are reactive. It also does not auto-unwrap refs (even at the
 * root level).
 */
export function shallowReactive<T>(target: T): ShallowReactive<T> {
  return createReactiveObject(
    target as ReactiveTarget,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}

/**
 * Returns a reactive-copy of the original object, where only the root level
 * properties are readonly, and does NOT unwrap refs nor recursively convert
 * returned properties.
 * This is used for creating the props proxy object for stateful components.
 */
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  )
}

export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as ReactiveTarget)[ReactiveFlags.RAW])
  }
  return !!(value && (value as ReactiveTarget)[ReactiveFlags.IS_REACTIVE])
}
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as ReactiveTarget)[ReactiveFlags.IS_READONLY])
}
export function isShallow(value: unknown): boolean {
  return !!(value && (value as ReactiveTarget)[ReactiveFlags.IS_SHALLOW])
}
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as ReactiveTarget)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
export function isVelumProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}
export function toReactive<T>(value: T): T {
  return isObject(value) ? reactive(value) : value
}
export const toReadonly = <T>(value: T): T =>
  isObject(value) ? readonly(value as Record<any, any>) : value
