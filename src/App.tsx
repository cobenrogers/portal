import { useState, useEffect, useCallback, useMemo } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { Settings } from './pages/Settings'
import { Button } from './components/ui'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginButton, UserMenu, PreviewBanner } from './components/auth'
import { getSettings } from './services/api'
import { useTheme } from './hooks'
import type { PortalSettings, BackgroundSettings, HolidayBackground } from './types'

type Page = 'dashboard' | 'settings'

// Holiday background pattern configurations
const HOLIDAY_GRADIENTS: Record<HolidayBackground, { light: string; dark: string }> = {
  'new-years': {
    // Sparkle/starburst pattern with gold accents
    light: `
      radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.3) 0%, transparent 8%),
      radial-gradient(circle at 80% 20%, rgba(255, 215, 0, 0.25) 0%, transparent 6%),
      radial-gradient(circle at 40% 70%, rgba(255, 215, 0, 0.2) 0%, transparent 10%),
      radial-gradient(circle at 90% 80%, rgba(255, 215, 0, 0.3) 0%, transparent 7%),
      radial-gradient(circle at 10% 90%, rgba(255, 215, 0, 0.2) 0%, transparent 5%),
      radial-gradient(circle at 60% 10%, rgba(192, 192, 192, 0.3) 0%, transparent 4%),
      radial-gradient(circle at 30% 50%, rgba(192, 192, 192, 0.2) 0%, transparent 6%),
      linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
    `,
    dark: `
      radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.2) 0%, transparent 8%),
      radial-gradient(circle at 80% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 6%),
      radial-gradient(circle at 40% 70%, rgba(255, 215, 0, 0.12) 0%, transparent 10%),
      radial-gradient(circle at 90% 80%, rgba(255, 215, 0, 0.2) 0%, transparent 7%),
      radial-gradient(circle at 10% 90%, rgba(255, 215, 0, 0.12) 0%, transparent 5%),
      radial-gradient(circle at 60% 10%, rgba(192, 192, 192, 0.15) 0%, transparent 4%),
      radial-gradient(circle at 30% 50%, rgba(192, 192, 192, 0.1) 0%, transparent 6%),
      linear-gradient(135deg, #0a0a15 0%, #0d1525 50%, #0a2040 100%)
    `,
  },
  'valentines': {
    // Soft hearts pattern with pink tones
    light: `
      radial-gradient(circle at 15% 25%, rgba(244, 67, 54, 0.15) 0%, transparent 12%),
      radial-gradient(circle at 85% 15%, rgba(233, 30, 99, 0.12) 0%, transparent 10%),
      radial-gradient(circle at 25% 75%, rgba(244, 67, 54, 0.1) 0%, transparent 15%),
      radial-gradient(circle at 75% 65%, rgba(233, 30, 99, 0.15) 0%, transparent 8%),
      radial-gradient(circle at 50% 40%, rgba(255, 105, 180, 0.1) 0%, transparent 20%),
      radial-gradient(circle at 90% 90%, rgba(244, 67, 54, 0.12) 0%, transparent 10%),
      linear-gradient(135deg, #fce4ec 0%, #f8bbd9 50%, #f48fb1 100%)
    `,
    dark: `
      radial-gradient(circle at 15% 25%, rgba(244, 67, 54, 0.2) 0%, transparent 12%),
      radial-gradient(circle at 85% 15%, rgba(233, 30, 99, 0.15) 0%, transparent 10%),
      radial-gradient(circle at 25% 75%, rgba(244, 67, 54, 0.12) 0%, transparent 15%),
      radial-gradient(circle at 75% 65%, rgba(233, 30, 99, 0.18) 0%, transparent 8%),
      radial-gradient(circle at 50% 40%, rgba(255, 105, 180, 0.1) 0%, transparent 20%),
      radial-gradient(circle at 90% 90%, rgba(244, 67, 54, 0.15) 0%, transparent 10%),
      linear-gradient(135deg, #4a1a2c 0%, #5d1a38 50%, #6a1b4d 100%)
    `,
  },
  'st-patricks': {
    // Clover/shamrock-inspired pattern with green dots
    light: `
      radial-gradient(circle at 10% 20%, rgba(46, 125, 50, 0.2) 0%, transparent 8%),
      radial-gradient(circle at 30% 60%, rgba(76, 175, 80, 0.15) 0%, transparent 10%),
      radial-gradient(circle at 70% 30%, rgba(46, 125, 50, 0.18) 0%, transparent 7%),
      radial-gradient(circle at 90% 70%, rgba(76, 175, 80, 0.2) 0%, transparent 12%),
      radial-gradient(circle at 50% 90%, rgba(46, 125, 50, 0.12) 0%, transparent 9%),
      radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 5%),
      radial-gradient(circle at 80% 10%, rgba(255, 215, 0, 0.08) 0%, transparent 4%),
      linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)
    `,
    dark: `
      radial-gradient(circle at 10% 20%, rgba(46, 125, 50, 0.25) 0%, transparent 8%),
      radial-gradient(circle at 30% 60%, rgba(76, 175, 80, 0.2) 0%, transparent 10%),
      radial-gradient(circle at 70% 30%, rgba(46, 125, 50, 0.22) 0%, transparent 7%),
      radial-gradient(circle at 90% 70%, rgba(76, 175, 80, 0.25) 0%, transparent 12%),
      radial-gradient(circle at 50% 90%, rgba(46, 125, 50, 0.15) 0%, transparent 9%),
      radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.12) 0%, transparent 5%),
      radial-gradient(circle at 80% 10%, rgba(255, 215, 0, 0.1) 0%, transparent 4%),
      linear-gradient(135deg, #1a3d1a 0%, #1e4620 50%, #2e5a2e 100%)
    `,
  },
  'easter': {
    // Pastel eggs pattern with soft colored dots
    light: `
      radial-gradient(ellipse 8% 12% at 15% 30%, rgba(225, 190, 231, 0.4) 0%, transparent 100%),
      radial-gradient(ellipse 6% 10% at 75% 20%, rgba(178, 235, 242, 0.35) 0%, transparent 100%),
      radial-gradient(ellipse 7% 11% at 40% 70%, rgba(197, 225, 165, 0.4) 0%, transparent 100%),
      radial-gradient(ellipse 8% 12% at 85% 75%, rgba(255, 224, 178, 0.35) 0%, transparent 100%),
      radial-gradient(ellipse 6% 9% at 25% 85%, rgba(248, 187, 208, 0.3) 0%, transparent 100%),
      radial-gradient(ellipse 7% 10% at 60% 15%, rgba(179, 229, 252, 0.35) 0%, transparent 100%),
      linear-gradient(135deg, #fff3e0 0%, #ffe0b2 25%, #e1bee7 50%, #b2ebf2 75%, #c5e1a5 100%)
    `,
    dark: `
      radial-gradient(ellipse 8% 12% at 15% 30%, rgba(156, 39, 176, 0.2) 0%, transparent 100%),
      radial-gradient(ellipse 6% 10% at 75% 20%, rgba(0, 188, 212, 0.18) 0%, transparent 100%),
      radial-gradient(ellipse 7% 11% at 40% 70%, rgba(139, 195, 74, 0.2) 0%, transparent 100%),
      radial-gradient(ellipse 8% 12% at 85% 75%, rgba(255, 152, 0, 0.18) 0%, transparent 100%),
      radial-gradient(ellipse 6% 9% at 25% 85%, rgba(233, 30, 99, 0.15) 0%, transparent 100%),
      radial-gradient(ellipse 7% 10% at 60% 15%, rgba(33, 150, 243, 0.18) 0%, transparent 100%),
      linear-gradient(135deg, #3d2e1f 0%, #3d2e1f 25%, #2d1f3d 50%, #1f3d3d 75%, #2d3d1f 100%)
    `,
  },
  'memorial': {
    // Stars and stripes subtle pattern
    light: `
      radial-gradient(circle at 10% 15%, rgba(33, 150, 243, 0.15) 0%, transparent 6%),
      radial-gradient(circle at 25% 10%, rgba(33, 150, 243, 0.12) 0%, transparent 5%),
      radial-gradient(circle at 15% 25%, rgba(33, 150, 243, 0.1) 0%, transparent 4%),
      repeating-linear-gradient(0deg, transparent 0px, transparent 40px, rgba(244, 67, 54, 0.08) 40px, rgba(244, 67, 54, 0.08) 50px),
      linear-gradient(135deg, #e3f2fd 0%, #ffffff 50%, #ffebee 100%)
    `,
    dark: `
      radial-gradient(circle at 10% 15%, rgba(33, 150, 243, 0.2) 0%, transparent 6%),
      radial-gradient(circle at 25% 10%, rgba(33, 150, 243, 0.15) 0%, transparent 5%),
      radial-gradient(circle at 15% 25%, rgba(33, 150, 243, 0.12) 0%, transparent 4%),
      repeating-linear-gradient(0deg, transparent 0px, transparent 40px, rgba(244, 67, 54, 0.1) 40px, rgba(244, 67, 54, 0.1) 50px),
      linear-gradient(135deg, #1a2744 0%, #1e293b 50%, #2d1a24 100%)
    `,
  },
  'independence': {
    // Fireworks/starburst pattern with red, white, blue
    light: `
      radial-gradient(circle at 20% 20%, rgba(244, 67, 54, 0.2) 0%, transparent 15%),
      radial-gradient(circle at 80% 30%, rgba(33, 150, 243, 0.2) 0%, transparent 12%),
      radial-gradient(circle at 50% 60%, rgba(255, 255, 255, 0.3) 0%, transparent 10%),
      radial-gradient(circle at 30% 80%, rgba(33, 150, 243, 0.15) 0%, transparent 18%),
      radial-gradient(circle at 70% 70%, rgba(244, 67, 54, 0.18) 0%, transparent 14%),
      radial-gradient(circle at 10% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 8%),
      radial-gradient(circle at 90% 90%, rgba(33, 150, 243, 0.12) 0%, transparent 10%),
      linear-gradient(135deg, #e3f2fd 0%, #ffffff 33%, #ffebee 66%, #e3f2fd 100%)
    `,
    dark: `
      radial-gradient(circle at 20% 20%, rgba(244, 67, 54, 0.25) 0%, transparent 15%),
      radial-gradient(circle at 80% 30%, rgba(33, 150, 243, 0.25) 0%, transparent 12%),
      radial-gradient(circle at 50% 60%, rgba(255, 255, 255, 0.15) 0%, transparent 10%),
      radial-gradient(circle at 30% 80%, rgba(33, 150, 243, 0.2) 0%, transparent 18%),
      radial-gradient(circle at 70% 70%, rgba(244, 67, 54, 0.22) 0%, transparent 14%),
      radial-gradient(circle at 10% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 8%),
      radial-gradient(circle at 90% 90%, rgba(33, 150, 243, 0.15) 0%, transparent 10%),
      linear-gradient(135deg, #1a2744 0%, #1e293b 33%, #3d1a24 66%, #1a2744 100%)
    `,
  },
  'labor': {
    // Industrial/worker themed with gear-like circles
    light: `
      radial-gradient(circle at 25% 25%, rgba(255, 152, 0, 0.15) 0%, transparent 20%),
      radial-gradient(circle at 75% 75%, rgba(121, 85, 72, 0.12) 0%, transparent 18%),
      radial-gradient(circle at 50% 30%, rgba(255, 193, 7, 0.1) 0%, transparent 15%),
      radial-gradient(circle at 20% 70%, rgba(121, 85, 72, 0.1) 0%, transparent 12%),
      radial-gradient(circle at 80% 40%, rgba(255, 152, 0, 0.12) 0%, transparent 16%),
      linear-gradient(135deg, #fff8e1 0%, #ffecb3 50%, #ffe082 100%)
    `,
    dark: `
      radial-gradient(circle at 25% 25%, rgba(255, 152, 0, 0.2) 0%, transparent 20%),
      radial-gradient(circle at 75% 75%, rgba(121, 85, 72, 0.18) 0%, transparent 18%),
      radial-gradient(circle at 50% 30%, rgba(255, 193, 7, 0.15) 0%, transparent 15%),
      radial-gradient(circle at 20% 70%, rgba(121, 85, 72, 0.15) 0%, transparent 12%),
      radial-gradient(circle at 80% 40%, rgba(255, 152, 0, 0.18) 0%, transparent 16%),
      linear-gradient(135deg, #3d3520 0%, #4a3f20 50%, #5c4d20 100%)
    `,
  },
  'halloween': {
    // Spooky diagonal stripes and scattered dots
    light: `
      radial-gradient(circle at 15% 20%, rgba(0, 0, 0, 0.08) 0%, transparent 8%),
      radial-gradient(circle at 85% 30%, rgba(156, 39, 176, 0.1) 0%, transparent 10%),
      radial-gradient(circle at 40% 80%, rgba(0, 0, 0, 0.06) 0%, transparent 12%),
      radial-gradient(circle at 70% 60%, rgba(156, 39, 176, 0.08) 0%, transparent 8%),
      repeating-linear-gradient(45deg, transparent 0px, transparent 20px, rgba(0, 0, 0, 0.03) 20px, rgba(0, 0, 0, 0.03) 22px),
      linear-gradient(135deg, #fff3e0 0%, #ffcc80 50%, #ff9800 100%)
    `,
    dark: `
      radial-gradient(circle at 15% 20%, rgba(255, 152, 0, 0.15) 0%, transparent 8%),
      radial-gradient(circle at 85% 30%, rgba(156, 39, 176, 0.2) 0%, transparent 10%),
      radial-gradient(circle at 40% 80%, rgba(255, 152, 0, 0.12) 0%, transparent 12%),
      radial-gradient(circle at 70% 60%, rgba(156, 39, 176, 0.15) 0%, transparent 8%),
      repeating-linear-gradient(45deg, transparent 0px, transparent 20px, rgba(255, 152, 0, 0.05) 20px, rgba(255, 152, 0, 0.05) 22px),
      linear-gradient(135deg, #1a1a1a 0%, #2d1f0f 50%, #3d2810 100%)
    `,
  },
  'thanksgiving': {
    // Autumn leaves pattern with warm colored dots
    light: `
      radial-gradient(ellipse 10% 8% at 20% 30%, rgba(230, 81, 0, 0.2) 0%, transparent 100%),
      radial-gradient(ellipse 8% 10% at 70% 20%, rgba(191, 54, 12, 0.15) 0%, transparent 100%),
      radial-gradient(ellipse 12% 9% at 40% 70%, rgba(255, 152, 0, 0.18) 0%, transparent 100%),
      radial-gradient(ellipse 9% 11% at 85% 60%, rgba(121, 85, 72, 0.15) 0%, transparent 100%),
      radial-gradient(ellipse 7% 9% at 15% 80%, rgba(230, 81, 0, 0.12) 0%, transparent 100%),
      radial-gradient(ellipse 11% 8% at 60% 90%, rgba(191, 54, 12, 0.1) 0%, transparent 100%),
      linear-gradient(135deg, #fff8e1 0%, #ffe0b2 33%, #ffcc80 66%, #d7ccc8 100%)
    `,
    dark: `
      radial-gradient(ellipse 10% 8% at 20% 30%, rgba(230, 81, 0, 0.25) 0%, transparent 100%),
      radial-gradient(ellipse 8% 10% at 70% 20%, rgba(191, 54, 12, 0.2) 0%, transparent 100%),
      radial-gradient(ellipse 12% 9% at 40% 70%, rgba(255, 152, 0, 0.22) 0%, transparent 100%),
      radial-gradient(ellipse 9% 11% at 85% 60%, rgba(121, 85, 72, 0.2) 0%, transparent 100%),
      radial-gradient(ellipse 7% 9% at 15% 80%, rgba(230, 81, 0, 0.15) 0%, transparent 100%),
      radial-gradient(ellipse 11% 8% at 60% 90%, rgba(191, 54, 12, 0.12) 0%, transparent 100%),
      linear-gradient(135deg, #2d2518 0%, #3d2e1a 33%, #4a3620 66%, #3d3530 100%)
    `,
  },
  'christmas': {
    // Christmas ornament/light pattern with red and green
    light: `
      radial-gradient(circle at 10% 20%, rgba(211, 47, 47, 0.15) 0%, transparent 8%),
      radial-gradient(circle at 30% 50%, rgba(46, 125, 50, 0.12) 0%, transparent 10%),
      radial-gradient(circle at 60% 15%, rgba(211, 47, 47, 0.1) 0%, transparent 6%),
      radial-gradient(circle at 80% 40%, rgba(46, 125, 50, 0.15) 0%, transparent 9%),
      radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.12) 0%, transparent 5%),
      radial-gradient(circle at 90% 70%, rgba(211, 47, 47, 0.12) 0%, transparent 7%),
      radial-gradient(circle at 50% 90%, rgba(46, 125, 50, 0.1) 0%, transparent 8%),
      radial-gradient(circle at 70% 85%, rgba(255, 215, 0, 0.1) 0%, transparent 4%),
      linear-gradient(135deg, #e8f5e9 0%, #ffffff 50%, #ffebee 100%)
    `,
    dark: `
      radial-gradient(circle at 10% 20%, rgba(211, 47, 47, 0.25) 0%, transparent 8%),
      radial-gradient(circle at 30% 50%, rgba(46, 125, 50, 0.2) 0%, transparent 10%),
      radial-gradient(circle at 60% 15%, rgba(211, 47, 47, 0.18) 0%, transparent 6%),
      radial-gradient(circle at 80% 40%, rgba(46, 125, 50, 0.22) 0%, transparent 9%),
      radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.15) 0%, transparent 5%),
      radial-gradient(circle at 90% 70%, rgba(211, 47, 47, 0.2) 0%, transparent 7%),
      radial-gradient(circle at 50% 90%, rgba(46, 125, 50, 0.15) 0%, transparent 8%),
      radial-gradient(circle at 70% 85%, rgba(255, 215, 0, 0.12) 0%, transparent 4%),
      linear-gradient(135deg, #1a2e1a 0%, #1e293b 50%, #2e1a1a 100%)
    `,
  },
  'winter': {
    // Snowflake pattern with white/blue dots
    light: `
      radial-gradient(circle at 10% 15%, rgba(255, 255, 255, 0.8) 0%, transparent 3%),
      radial-gradient(circle at 25% 45%, rgba(200, 230, 255, 0.6) 0%, transparent 4%),
      radial-gradient(circle at 45% 20%, rgba(255, 255, 255, 0.7) 0%, transparent 2%),
      radial-gradient(circle at 70% 35%, rgba(200, 230, 255, 0.5) 0%, transparent 5%),
      radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.6) 0%, transparent 3%),
      radial-gradient(circle at 15% 75%, rgba(200, 230, 255, 0.5) 0%, transparent 4%),
      radial-gradient(circle at 40% 85%, rgba(255, 255, 255, 0.7) 0%, transparent 2%),
      radial-gradient(circle at 60% 65%, rgba(200, 230, 255, 0.6) 0%, transparent 3%),
      radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.5) 0%, transparent 4%),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 2%),
      linear-gradient(135deg, #e3f2fd 0%, #e1f5fe 50%, #f3e5f5 100%)
    `,
    dark: `
      radial-gradient(circle at 10% 15%, rgba(255, 255, 255, 0.3) 0%, transparent 3%),
      radial-gradient(circle at 25% 45%, rgba(200, 230, 255, 0.2) 0%, transparent 4%),
      radial-gradient(circle at 45% 20%, rgba(255, 255, 255, 0.25) 0%, transparent 2%),
      radial-gradient(circle at 70% 35%, rgba(200, 230, 255, 0.18) 0%, transparent 5%),
      radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.22) 0%, transparent 3%),
      radial-gradient(circle at 15% 75%, rgba(200, 230, 255, 0.15) 0%, transparent 4%),
      radial-gradient(circle at 40% 85%, rgba(255, 255, 255, 0.2) 0%, transparent 2%),
      radial-gradient(circle at 60% 65%, rgba(200, 230, 255, 0.18) 0%, transparent 3%),
      radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.15) 0%, transparent 4%),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.12) 0%, transparent 2%),
      linear-gradient(135deg, #1a2744 0%, #1a3344 50%, #2d1f3d 100%)
    `,
  },
}

// Helper to compute background styles
function getBackgroundStyle(
  background: BackgroundSettings | undefined,
  isDark: boolean
): React.CSSProperties {
  if (!background || background.type === 'none') {
    return {}
  }

  if (background.type === 'color' && background.color) {
    return { backgroundColor: background.color }
  }

  if (background.type === 'holiday' && background.holiday) {
    const gradient = HOLIDAY_GRADIENTS[background.holiday]
    return {
      background: isDark ? gradient.dark : gradient.light,
    }
  }

  return {}
}

function AppContent() {
  const { isLoading: authLoading, isAuthenticated, isApproved } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [previewBackground, setPreviewBackground] = useState<BackgroundSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Apply theme when settings change
  const appliedTheme = useTheme(settings?.theme ?? 'light')

  // Use preview background if set, otherwise use saved settings
  const activeBackground = previewBackground ?? settings?.background

  // Compute background styles
  const backgroundStyle = useMemo(() => {
    const isDark = appliedTheme === 'dark'
    return getBackgroundStyle(activeBackground, isDark)
  }, [activeBackground, appliedTheme])

  // Check if custom background is applied (for conditional default bg)
  const hasCustomBackground = activeBackground?.type && activeBackground.type !== 'none'

  // User can edit if authenticated AND approved
  const canEdit = isAuthenticated && isApproved

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSettings()
        setSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSettingsSave = useCallback((newSettings: PortalSettings) => {
    setSettings(newSettings)
    setPreviewBackground(null) // Clear preview on save
    setPage('dashboard')
  }, [])

  const handleSettingsBack = useCallback(() => {
    setPreviewBackground(null) // Clear preview on cancel/back
    setPage('dashboard')
  }, [])

  const handlePreviewBackground = useCallback((bg: BackgroundSettings | null) => {
    setPreviewBackground(bg)
  }, [])

  // Show loading while auth is initializing
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-6 rounded-lg max-w-md">
          <h2 className="font-semibold mb-2">Error Loading Portal</h2>
          <p>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (page === 'settings') {
    return (
      <Settings
        onBack={handleSettingsBack}
        onSave={handleSettingsSave}
        onPreviewBackground={handlePreviewBackground}
        previewBackgroundStyle={backgroundStyle}
        hasCustomBackground={hasCustomBackground}
      />
    )
  }

  return (
    <div
      className={`min-h-screen ${!hasCustomBackground ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
      style={backgroundStyle}
    >
      {/* Preview Banner */}
      <PreviewBanner />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Portal</h1>
          <div className="flex items-center gap-2">
            {/* Settings button - only show for approved users */}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage('settings')}
              >
                <SettingsIcon className="w-5 h-5" />
              </Button>
            )}

            {/* Auth UI */}
            {isAuthenticated ? <UserMenu /> : <LoginButton />}
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className="max-w-7xl mx-auto p-4">
        {settings && (
          <Dashboard
            layout={settings.dashboardLayout}
          />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
