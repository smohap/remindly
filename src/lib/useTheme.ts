import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { makeStore } from './localStore'

/**
 * Dark / light theme for the signed-in app. Applied as `data-theme` on <html>
 * so the CSS tokens in index.css switch; marketing pages ignore it.
 */
export type Theme = 'dark' | 'light'

const store = makeStore<Theme>('remindly.theme.v1', 'dark')

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const theme = useSyncExternalStore(store.subscribe, store.get, store.get)
  useEffect(() => applyTheme(theme), [theme])
  const setTheme = useCallback((t: Theme) => store.set(t), [])
  const toggle = useCallback(() => store.set(store.get() === 'dark' ? 'light' : 'dark'), [])
  return { theme, setTheme, toggle }
}
