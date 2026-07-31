import '@testing-library/jest-dom'

// jsdom 24 under this Node build does NOT expose `window.localStorage` — Node's
// own experimental `localStorage` global shadows jsdom's and resolves to
// `undefined` unless the process was started with `--localstorage-file`.
// (`'localStorage' in window` is true, but reading it yields undefined.)
//
// PRD v2 E2 stores the anonymous learner UUID in localStorage, so the suite
// needs a real, spec-shaped Storage to write to. Install an in-memory one only
// when the environment failed to provide one.
if (typeof (globalThis as any).localStorage === 'undefined') {
  const backing = new Map<string, string>()
  const memoryStorage = {
    getItem(key: string): string | null {
      return backing.has(String(key)) ? backing.get(String(key))! : null
    },
    setItem(key: string, value: string): void {
      backing.set(String(key), String(value))
    },
    removeItem(key: string): void {
      backing.delete(String(key))
    },
    clear(): void {
      backing.clear()
    },
    key(index: number): string | null {
      return Array.from(backing.keys())[index] ?? null
    },
    get length(): number {
      return backing.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: memoryStorage,
  })
}
