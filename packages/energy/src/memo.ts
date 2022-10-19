import { isFunction } from '@velum/shared'
import { ReactiveEffect } from './effect'
import { trackInnerValueRead, triggerInnerValueUpdate } from './atom'
import { ReactiveFlags } from './reactive'
import type { InnerValueSetter } from './atom'
import type { DebuggerOptions } from './effect'
import type { Dep } from './dep'

declare const MemoFlag: unique symbol // proxy read key __v_isMemo
const memoFlagKey = '__v_isMemo'
export const isMemo = (val: unknown): val is Memo => {
  return !!(val && Reflect.get(val, memoFlagKey))
}

export type MemoGetter<T> = (...args: any[]) => T
export type MemoSetter<T> = (v: T) => void
export interface WritableMemoOptions<T> {
  get: MemoGetter<T>
  set: MemoSetter<T>
}

export interface Memo<T = any> {
  (): T
  [MemoFlag]: true
}
export interface WritableMemo<T = any> extends Memo<T> {
  set: InnerValueSetter<T>
}

export function memo<T>(
  getter: MemoGetter<T>,
  debugOptions?: DebuggerOptions
): Memo<T>
export function memo<T>(
  options: WritableMemoOptions<T>,
  debugOptions?: DebuggerOptions
): WritableMemo<T>
export function memo<T>(
  getterOrOptions: MemoGetter<T> | WritableMemoOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  let getter: MemoGetter<T>
  let setter: MemoSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const memoImpl = new MemoImpl(getter, setter, onlyGetter || !setter, isSSR)

  if (debugOptions && !isSSR) {
    memoImpl.effect.onTrack = debugOptions.onTrack
    memoImpl.effect.onTrigger = debugOptions.onTrigger
  }

  return createMemoAccessorFromImpl(memoImpl, onlyGetter) as any
}
function createMemoAccessorFromImpl<T = any>(
  memoImpl: MemoImpl<T>,
  onlyGetter: boolean
) {
  const accessor = () => memoImpl.value
  if (!onlyGetter) {
    accessor.set = createMemoAccessorSetter(memoImpl)
  }
  const memo = new Proxy(accessor, {
    get(target, key) {
      if (key === memoFlagKey) {
        return true
      }
      return (target as any)[key]
    },
  })
  return memo
}
function createMemoAccessorSetter<T = any>(memoImpl: MemoImpl<T>) {
  const setter: InnerValueSetter<T> = (arg: T | ((current: T) => T)) => {
    if (isFunction(arg)) {
      memoImpl.value = arg(memoImpl.unwrap())
      return
    }
    memoImpl.value = arg
  }
  return setter
}

export class MemoImpl<T> {
  public dep?: Dep = undefined

  private _value!: T
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY]: boolean = false

  public _dirty = true
  public _cacheable: boolean

  constructor(
    getter: MemoGetter<T>,
    private readonly _setter: MemoSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerInnerValueUpdate(this)
      }
    })
    this.effect.memo = this
    this.effect.active = this._cacheable = !isSSR
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  public unwrap() {
    if (this._dirty || !this._cacheable) {
      this._dirty = false
      this._value = this.effect.run()!
    }
    return this._value
  }
  get value() {
    trackInnerValueRead(this)
    if (this._dirty || !this._cacheable) {
      this._dirty = false
      this._value = this.effect.run()!
    }
    return this.unwrap()
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}
