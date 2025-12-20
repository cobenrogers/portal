import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings as SettingsIcon, Edit, Check, Loader2 } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { Settings } from './pages/Settings'
import { Button } from './components/ui'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginButton, UserMenu, PreviewBanner } from './components/auth'
import { getSettings, saveSettings } from './services/api'
import { useTheme } from './hooks'
import type { PortalSettings, DashboardLayout, WidgetConfig } from './types'

type Page = 'dashboard' | 'settings'

function AppContent() {
  const { isLoading: authLoading, isAuthenticated, isApproved } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const layoutChanged = useRef(false)

  // Apply theme when settings change
  useTheme(settings?.theme ?? 'light')

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

  const handleLayoutChange = useCallback((layouts: DashboardLayout['layouts'], widgets?: WidgetConfig[]) => {
    if (!settings) return
    layoutChanged.current = true
    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts,
        // If widgets are provided (e.g., from reordering), update them
        ...(widgets && { widgets }),
      },
    })
  }, [settings])

  const handleDoneEditing = useCallback(async () => {
    if (!layoutChanged.current || !settings) {
      setIsEditing(false)
      return
    }

    // Save directly - no PIN needed, session auth handles it
    setIsSaving(true)
    try {
      await saveSettings(settings)
      layoutChanged.current = false
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [settings])

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Preview Banner */}
      <PreviewBanner />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Portal</h1>
          <div className="flex items-center gap-2">
            {/* Edit controls - only show for approved users */}
            {canEdit && (
              <>
                {isEditing ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDoneEditing}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Done
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Layout
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage('settings')}
                >
                  <SettingsIcon className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Auth UI */}
            {isAuthenticated ? <UserMenu /> : <LoginButton />}
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className="max-w-7xl mx-auto p-4">
        {isEditing && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
            Drag widgets to reposition them. Resize from the bottom-right corner.
          </div>
        )}
        {settings && (
          <Dashboard
            layout={settings.dashboardLayout}
            onLayoutChange={handleLayoutChange}
            isEditing={isEditing && canEdit}
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
