/** Minimal localStorage-backed external store for useSyncExternalStore. */
export function makeStore<T>(key: string, seed: T) {
  let value: T = load()
  const listeners = new Set<() => void>()

  function load(): T {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : seed
    } catch {
      return seed
    }
  }

  return {
    get: () => value,
    set: (next: T) => {
      value = next
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* quota / private mode — keep in-memory */
      }
      listeners.forEach(l => l())
    },
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}
