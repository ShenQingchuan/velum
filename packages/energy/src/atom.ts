import { NOOP, hasChanged, isFunction, isObject, warn } from '@velum/shared'
import {
  isReadonly,
  isShallow,
  shallowReactive,
  toRaw,
  toReactive,
} from './reactive'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import {
  activeEffect,
  shouldTrack,
  trackEffects,
  triggerEffects,
} from './effect'
import { createDep } from './dep'
import type { Dep } from './dep'

declare const AtomFlag: unique symbol // implement by proxy read __v_isAtom
const atomFlagKey = '__v_isAtom'
export const isAtom = (val: unknown): val is Atom => {
  return !!(val && Reflect.get(val, atomFlagKey))
}

declare const AtomImplFlag: unique symbol // implement by proxy read __v_isAtom
const atomImplFlagKey = '__v_isAtomImpl'

type AtomCreator = <T, O extends AtomCreateOptions>(
  initValue: T,
  options?: O
) => O['readonly'] extends true ? ReadonlyAtom<T> : Atom<T>
export interface ReadonlyAtom<T = any> {
  (): T
  [AtomFlag]: true
  [AtomImplFlag]: AtomImpl<T>
}
export interface Atom<T = any> extends ReadonlyAtom<T> {
  set: InnerValueSetter<T>
}
export type InnerValueSetter<T = any> = (arg: T | ((current: T) => T)) => void

export interface AtomCreateOptions {
  shallow?: boolean
  readonly?: boolean
}
function createAtomCreator(): AtomCreator {
  const atomCreator = <T, O extends AtomCreateOptions>(
    initValue: T,
    options?: O
  ) => {
    return createAccessorFromImpl<T, O>(initValue, options)
  }
  return atomCreator
}
function createAccessorFromImpl<T, O extends AtomCreateOptions>(
  initValue: T,
  options?: O
) {
  const atomImpl = new AtomImpl(initValue, options)
  const accessor = () => atomImpl.value

  if (!options?.readonly) {
    accessor.set = createAccessorSetter(atomImpl)
  }
  const atom = new Proxy(accessor, {
    get(target, key) {
      if (key === atomFlagKey) {
        return true
      } else if (key === atomImplFlagKey) {
        return atomImpl
      }
      return (target as any)[key]
    },
  })

  return atom as O['readonly'] extends true ? ReadonlyAtom<T> : Atom<T>
}
function createAccessorSetter<T>(atomImpl: AtomImpl<T>) {
  const setter: InnerValueSetter<T> = (arg: T | ((current: T) => T)) => {
    if (isFunction(arg)) {
      atomImpl.value = arg(atomImpl.unwrap())
      return
    }
    atomImpl.value = arg
  }
  return setter
}

type AtomImplBase<T> = {
  dep?: Dep
  value: T
}
export class AtomImpl<T> {
  private _rawValue: T
  private _value: T
  private readonly __v_isShallow: boolean
  private __v_isReadonly: boolean
  public dep?: Dep = undefined

  constructor(initValue: T, options?: AtomCreateOptions) {
    const { shallow: isShallow = true, readonly: isReadonly = false } =
      options ?? {}
    this.__v_isShallow = isShallow
    this.__v_isReadonly = isReadonly

    this._rawValue = isShallow ? initValue : toRaw(initValue)
    this._value = isObject(initValue)
      ? isShallow
        ? shallowReactive(initValue)
        : toReactive(initValue)
      : initValue
  }

  public unwrap() {
    return this._value
  }
  public toReadonly() {
    this.__v_isReadonly = true
  }
  public get isReadonly() {
    return this.__v_isReadonly
  }
  public get value() {
    trackInnerValueRead(this)
    return this._value
  }
  public set value(newValue) {
    if (this.__v_isReadonly) {
      warn('Set operation failed: target is readonly.')
      return
    }

    const useDirect =
      this.__v_isShallow || isShallow(newValue) || isReadonly(newValue)
    newValue = useDirect ? newValue : toRaw(newValue)
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = useDirect ? newValue : toReactive(newValue)
      triggerInnerValueUpdate(this, newValue)
    }
  }
}

export function transferAtomToReadonly<V = any>(
  atom: Atom<V>
): ReadonlyAtom<V> {
  return new Proxy(atom, {
    get(target, key) {
      if (key === 'set') {
        return NOOP
      }
      return (target as any)[key]
    },
  })
}

export function trackInnerValueRead(ref: AtomImplBase<any>) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    trackEffects(ref.dep || (ref.dep = createDep()), {
      target: ref,
      type: TrackOpTypes.GET,
      key: 'value',
    })
  }
}

export function triggerInnerValueUpdate(ref: AtomImplBase<any>, newVal?: any) {
  ref = toRaw(ref)
  if (ref.dep) {
    triggerEffects(ref.dep, {
      target: ref,
      type: TriggerOpTypes.SET,
      key: 'value',
      newValue: newVal,
    })
  }
}

export const atom = createAtomCreator()
