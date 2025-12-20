import { useEffect, useCallback, useState } from 'react'
import type { PortalSettings } from '@/types'

type Theme = PortalSettings['theme']
type AppliedTheme = 'light' | 'dark'

/**
 * Apply the theme to the document by toggling the 'dark' class on <html>
 * Returns the actual applied theme ('light' or 'dark')
 */
export function useTheme(theme: Theme): AppliedTheme {
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>('light')

  const applyTheme = useCallback((currentTheme: Theme): AppliedTheme => {
    const root = document.documentElement
    let applied: AppliedTheme = 'light'

    if (currentTheme === 'dark') {
      root.classList.add('dark')
      applied = 'dark'
    } else if (currentTheme === 'light') {
      root.classList.remove('dark')
      applied = 'light'
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
        applied = 'dark'
      } else {
        root.classList.remove('dark')
        applied = 'light'
      }
    }

    return applied
  }, [])

  useEffect(() => {
    const applied = applyTheme(theme)
    setAppliedTheme(applied)

    // Listen for system preference changes when theme is 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        const newApplied = applyTheme('system')
        setAppliedTheme(newApplied)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme])

  return appliedTheme
}
