import { describe, expect, test, vi } from 'vitest'
import { atom, effect, memo } from '../src'


describe('energy/memo', () => {
  test("should return updated value", () => {
    const value = atom<{ foo?: number }>({})
    const memoValue = memo(() => value().foo)
    expect(memoValue()).toBe(undefined)
    value().foo = 1
    expect(memoValue()).toBe(1)
  })

  test('should compute lazily', () => {
    const value = atom<{ foo?: number }>({})
    const getter = vi.fn(() => value().foo)
    const memoValue = memo(getter)

    // lazy
    expect(getter).not.toHaveBeenCalled()

    expect(memoValue()).toBe(undefined)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    memoValue()
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed
    value().foo = 1
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute
    expect(memoValue()).toBe(1)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again
    memoValue()
    expect(getter).toHaveBeenCalledTimes(2)
  })

  test('should trigger effect', () => {
    const value = atom<{ foo?: number }>({})
    const memoValue = memo(() => value().foo)
    let dummy
    effect(() => {
      dummy = memoValue()
    })
    expect(dummy).toBe(undefined)
    value().foo = 1
    expect(dummy).toBe(1)
  })
})
