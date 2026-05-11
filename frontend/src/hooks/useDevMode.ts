import { useState, useCallback } from 'react'

export function useDevMode() {
  const isDev = import.meta.env.DEV

  const [devToolsEnabled, setDevToolsEnabled] = useState<boolean>(() => {
    if (!isDev) return false
    try {
      return localStorage.getItem('DEV_MODE') !== 'false'
    } catch {
      return true
    }
  })

  const toggleDevTools = useCallback(() => {
    const next = !devToolsEnabled
    setDevToolsEnabled(next)
    try {
      localStorage.setItem('DEV_MODE', String(next))
    } catch {
      // localStorage unavailable
    }
  }, [devToolsEnabled])

  return { isDev, devToolsEnabled, toggleDevTools }
}
