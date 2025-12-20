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

// Holiday background gradient configurations
const HOLIDAY_GRADIENTS: Record<HolidayBackground, { light: string; dark: string }> = {
  'new-years': {
    light: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    dark: 'linear-gradient(135deg, #0a0a15 0%, #0d1525 50%, #0a2040 100%)',
  },
  'valentines': {
    light: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 50%, #f48fb1 100%)',
    dark: 'linear-gradient(135deg, #4a1a2c 0%, #5d1a38 50%, #6a1b4d 100%)',
  },
  'st-patricks': {
    light: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
    dark: 'linear-gradient(135deg, #1a3d1a 0%, #1e4620 50%, #2e5a2e 100%)',
  },
  'easter': {
    light: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 25%, #e1bee7 50%, #b2ebf2 75%, #c5e1a5 100%)',
    dark: 'linear-gradient(135deg, #3d2e1f 0%, #3d2e1f 25%, #2d1f3d 50%, #1f3d3d 75%, #2d3d1f 100%)',
  },
  'memorial': {
    light: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 50%, #ffebee 100%)',
    dark: 'linear-gradient(135deg, #1a2744 0%, #1e293b 50%, #2d1a24 100%)',
  },
  'independence': {
    light: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 33%, #ffebee 66%, #e3f2fd 100%)',
    dark: 'linear-gradient(135deg, #1a2744 0%, #1e293b 33%, #3d1a24 66%, #1a2744 100%)',
  },
  'labor': {
    light: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 50%, #ffe082 100%)',
    dark: 'linear-gradient(135deg, #3d3520 0%, #4a3f20 50%, #5c4d20 100%)',
  },
  'halloween': {
    light: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 50%, #ff9800 100%)',
    dark: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f0f 50%, #3d2810 100%)',
  },
  'thanksgiving': {
    light: 'linear-gradient(135deg, #fff8e1 0%, #ffe0b2 33%, #ffcc80 66%, #d7ccc8 100%)',
    dark: 'linear-gradient(135deg, #2d2518 0%, #3d2e1a 33%, #4a3620 66%, #3d3530 100%)',
  },
  'christmas': {
    light: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 50%, #ffebee 100%)',
    dark: 'linear-gradient(135deg, #1a2e1a 0%, #1e293b 50%, #2e1a1a 100%)',
  },
  'winter': {
    light: 'linear-gradient(135deg, #e3f2fd 0%, #e1f5fe 50%, #f3e5f5 100%)',
    dark: 'linear-gradient(135deg, #1a2744 0%, #1a3344 50%, #2d1f3d 100%)',
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Apply theme when settings change
  const appliedTheme = useTheme(settings?.theme ?? 'light')

  // Compute background styles
  const backgroundStyle = useMemo(() => {
    const isDark = appliedTheme === 'dark'
    return getBackgroundStyle(settings?.background, isDark)
  }, [settings?.background, appliedTheme])

  // Check if custom background is applied (for conditional default bg)
  const hasCustomBackground = settings?.background?.type && settings.background.type !== 'none'

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
    setPage('dashboard')
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
        onBack={() => setPage('dashboard')}
        onSave={handleSettingsSave}
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
