import { NOOP, hasChanged, isFunction, isObject, warn } from '@velum/shared'
import {
  isReadonly,
  isShallow,
  readonly,
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
  return !!(isFunction(val) && Reflect.get(val, atomFlagKey))
}

type AtomCreator = <T, O extends AtomCreateOptions = {}>(
  initValue: T,
  options?: O
) => O['readonly'] extends true ? ReadonlyAtom<T> : Atom<T>

type AtomBase = {
  [AtomFlag]: true
}
export type ReadonlyAtom<T = any> = AtomBase & {
  (): Readonly<T>
}
export type Atom<T = any> = AtomBase & {
  (): T
  set: InnerValueSetter<T>
} & (T extends object
    ? {
        destruct: {
          [F in keyof T]: Atom<T[F]>
        }
      }
    : {})
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
    return createAccessor<T, O>(initValue, options)
  }
  return atomCreator
}
function createAccessorSetter<T>(
  originalGetter: () => T,
  callback: (newValue: T) => void
) {
  const setter: InnerValueSetter<T> = (arg: T | ((current: T) => T)) => {
    if (isFunction(arg)) {
      callback(arg(originalGetter()))
      return
    }
    callback(arg)
  }
  return setter
}
function createAccessor<T, O extends AtomCreateOptions>(
  initValue: T,
  options?: O
) {
  const atomImpl = new AtomImpl(initValue, options)
  const accessor = () => atomImpl.value

  if (!options?.readonly) {
    accessor.set = createAccessorSetter(
      () => atomImpl.unwrap(),
      (newValue) => {
        atomImpl.value = newValue
      }
    )
  }
  const atom = new Proxy(accessor, {
    get(target, key) {
      if (key === atomFlagKey) {
        return true
      } else if (key === 'destruct') {
        return atomImpl.destruct
      }
      return (target as any)[key]
    },
  })

  return atom as unknown as O['readonly'] extends true
    ? ReadonlyAtom<T>
    : Atom<T>
}
function createDestructedAccessor<T, O extends AtomCreateOptions>(
  original: AtomImpl<T>,
  key: keyof T,
  options?: O
) {
  const accessor = () => original.value[key]
  if (!options?.readonly) {
    accessor.set = createAccessorSetter(
      () => original.value[key],
      (newValue) => {
        original.value[key] = newValue
      }
    )
  }
  const atom = new Proxy(accessor, {
    get(target, key) {
      if (key === atomFlagKey) {
        return true
      }
      return (target as any)[key]
    },
  })
  return atom as unknown as O['readonly'] extends true
    ? ReadonlyAtom<T[keyof T]>
    : Atom<T[keyof T]>
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
    const { shallow: isShallow = false, readonly: isReadonly = false } =
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
  public get destruct() {
    const value = this._value
    if (!isObject(value)) {
      throw new Error("Atom with primitive value doesn't have destruct method")
    }

    const destruct: Record<string, Atom> = {}
    Object.keys(value).forEach((key) => {
      destruct[key] = createDestructedAccessor(this, key as keyof T, {
        shallow: this.__v_isShallow,
        readonly: this.__v_isReadonly,
      })
    })
    return destruct
  }
}

export function transferAtomToReadonly<V = any>(
  originalAtom: Atom<V>
): V extends object ? ReadonlyAtom<V> : V {
  const atom = () => readonly(originalAtom())
  return new Proxy(atom, {
    get(target, key) {
      if (key === 'set') {
        return NOOP
      }
      return (target as any)[key]
    },
  }) as any
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
