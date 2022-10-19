import { describe, expect, test, vi } from 'vitest'
import { atom, effect, readonly } from '../src'

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
      { shallow: false }
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
    const originalConsoleWarn = console.warn
    const spyWarn = vi
      .spyOn(console, 'warn')
      .mockImplementation((...args: any[]) => {
        originalConsoleWarn(...args)
      })
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
})
