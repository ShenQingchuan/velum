import { beforeAll, describe, expect, test, vi } from 'vitest'
import { atom, effect, readonly } from '../src'

const createObservedConsoleWarn = () => {
  const originalConsoleWarn = console.warn
  return vi.spyOn(console, 'warn').mockImplementation(originalConsoleWarn)
}

beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

describe('energy/atom', () => {
  test("it's able to get value by call accessor", () => {
    const a = atom(1)
    expect(a()).toBe(1)
    a.set(2)
    expect(a()).toBe(2)
  })

  test('should be reactive', () => {
    const a = atom(1)
    let dummy
    let calls = 0
    effect(() => {
      calls++
      dummy = a()
    })
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    a.set(2)
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
    // same value should not trigger
    a.set(2)
    expect(calls).toBe(2)
  })

  test('atom is default shallow', () => {
    const a = atom({ foo: 32, bar: { zig: false, zag: 'hello' } })
    let dummyFoo, dummyZag
    let calls = 0
    effect(() => {
      calls++
      dummyFoo = a().foo
      dummyZag = a().bar.zag
    })
    expect(calls).toBe(1)
    expect(dummyFoo).toBe(32)
    expect(dummyZag).toBe('hello')
    a().foo = 64
    expect(calls).toBe(2)
    expect(dummyFoo).toBe(64)

    a().bar.zag = 'world'
    expect(calls).toBe(2)
    expect(dummyZag).toBe('hello')
  })

  test("it's able to make atom reactive deeply", () => {
    const a = atom(
      { foo: 32, bar: { zig: false, zag: 'hello' } },
      { deep: true }
    )
    let dummyFoo, dummyZag
    let calls = 0
    effect(() => {
      calls++
      dummyFoo = a().foo
      dummyZag = a().bar.zag
    })
    expect(calls).toBe(1)
    expect(dummyFoo).toBe(32)
    expect(dummyZag).toBe('hello')
    a().foo = 64
    expect(calls).toBe(2)
    expect(dummyFoo).toBe(64)

    a().bar.zag = 'world'
    expect(calls).toBe(3)
    expect(dummyZag).toBe('world')
  })

  test("readonly is working and it doesn't have a setter", () => {
    const spyWarn = createObservedConsoleWarn()
    const ro = readonly({ foo: 1, bar: false })
    expect(ro).not.toHaveProperty('set')
    // TypeScript will show error hint in IDE, because 'foo' is a readonly property
    // @ts-expect-error
    ro.foo = 4
    expect(ro.foo).toBe(1)
    expect(spyWarn).toHaveBeenCalledTimes(1)
  })

  test('readonly can update with atom source change', () => {
    const a = atom({ foo: 1 })
    const r = readonly(a)
    a().foo = 2
    expect(r().foo).toBe(2)
  })

  test("atom's fields can be destructed into separate atoms", () => {
    const atomObj = atom({ foo: 1, bar: { nested1: 'hello', zig: false } })
    const { foo, bar } = atomObj.destruct
    expect(foo()).toBe(1)
    expect(bar().nested1).toBe('hello')
    expect(bar().zig).toBe(false)
    foo.set(2)
    expect(foo()).toBe(2)
    expect(atomObj().foo).toBe(2)
    bar().nested1 = 'world'
    expect(bar().nested1).toBe('world')
    expect(atomObj().bar.nested1).toBe('world')
  })

  test("readonly destructed atoms can't be changed", () => {
    const spyWarn = createObservedConsoleWarn()
    const atomObj = atom({
      foo: 1,
      bar: { nested1: 'hello', zig: false },
    })
    const { foo, bar } = atomObj.destruct
    const roFoo = readonly(foo)
    const roBar = readonly(bar)
    // @ts-expect-error TypeScript will show error hint in IDE, because 'set' is not on `roFoo`
    roFoo.set(2)
    expect(roFoo()).toBe(1)
    expect(foo()).toBe(1)
    // @ts-expect-error TypeScript will show error hint in IDE, because 'nested1' is a readonly property
    roBar().nested1 = 'world'
    expect(roBar().nested1).toBe('hello')
    expect(bar().nested1).toBe('hello')
    expect(spyWarn).toHaveBeenCalledTimes(1)

    // readonly atoms from destructed atom can still be updated by atomObj
    atomObj().foo = 6
    expect(roFoo()).toBe(6)
    atomObj().bar.nested1 = 'velum'
    expect(roBar().nested1).toBe('velum')
  })

  test("atom's reactivity should work for array and collection types", () => {
    const a = atom([1, 2, 3])
    let dummy
    let calls = 0
    effect(() => {
      calls++
      dummy = a()[0]
    })
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    a()[0] = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)

    const b = atom(
      new Map([
        ['foo', 1],
        ['bar', 2],
      ])
    )
    let dummyMap
    let callsMap = 0
    effect(() => {
      callsMap++
      dummyMap = b().get('foo')
    })
    expect(callsMap).toBe(1)
    expect(dummyMap).toBe(1)

    b().set('foo', 2)
    expect(callsMap).toBe(2)

    const c = atom(new Set([1, 2, 3]))
    let dummySet
    let callsSet = 0
    effect(() => {
      callsSet++
      dummySet = c().has(1)
    })
    expect(callsSet).toBe(1)
    expect(dummySet).toBe(true)

    c().delete(1)
    expect(callsSet).toBe(2)
  })

  test('atom of an array should be able to detect target element changes', () => {
    const arrAtom = atom([1, 2, 3])
    let dummy
    let calls = 0
    effect(() => {
      calls++
      dummy = arrAtom()[0]
    })
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    arrAtom().unshift(0)
    expect(calls).toBe(2)
    expect(dummy).toBe(0)
  })
})
