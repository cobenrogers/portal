import { useEffect, useCallback } from 'react'
import type { PortalSettings } from '@/types'

type Theme = PortalSettings['theme']

/**
 * Apply the theme to the document by toggling the 'dark' class on <html>
 */
export function useTheme(theme: Theme) {
  const applyTheme = useCallback((currentTheme: Theme) => {
    const root = document.documentElement

    if (currentTheme === 'dark') {
      root.classList.add('dark')
    } else if (currentTheme === 'light') {
      root.classList.remove('dark')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [])

  useEffect(() => {
    applyTheme(theme)

    // Listen for system preference changes when theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme])
}
