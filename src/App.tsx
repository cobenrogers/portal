import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings as SettingsIcon, Edit, Check, Loader2 } from 'lucide-react'
import { Dashboard } from './components/Dashboard'
import { Settings } from './pages/Settings'
import { Button, Input } from './components/ui'
import { getSettings, saveSettings, verifyPin } from './services/api'
import type { PortalSettings, DashboardLayout } from './types'

type Page = 'dashboard' | 'settings'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const layoutChanged = useRef(false)

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

  const handleLayoutChange = useCallback((layouts: DashboardLayout['layouts']) => {
    if (!settings) return
    layoutChanged.current = true
    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts,
      },
    })
  }, [settings])

  const handleDoneEditing = useCallback(() => {
    if (layoutChanged.current && settings) {
      setShowPinModal(true)
    } else {
      setIsEditing(false)
    }
  }, [settings])

  const handleSaveLayout = useCallback(async () => {
    if (!settings) return

    setIsSaving(true)
    setPinError(null)

    try {
      const valid = await verifyPin(pin)
      if (!valid) {
        setPinError('Invalid PIN')
        setIsSaving(false)
        return
      }

      await saveSettings(settings, pin)
      layoutChanged.current = false
      setShowPinModal(false)
      setPin('')
      setIsEditing(false)
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [settings, pin])

  const handleCancelSave = useCallback(() => {
    setShowPinModal(false)
    setPin('')
    setPinError(null)
  }, [])

  const handleSettingsSave = useCallback((newSettings: PortalSettings) => {
    setSettings(newSettings)
    setPage('dashboard')
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading Portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg max-w-md">
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Portal</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleDoneEditing}
              >
                <Check className="w-4 h-4 mr-2" />
                Done
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
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className="max-w-7xl mx-auto p-4">
        {isEditing && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            Drag widgets to reposition them. Resize from the bottom-right corner.
          </div>
        )}
        {settings && (
          <Dashboard
            layout={settings.dashboardLayout}
            onLayoutChange={handleLayoutChange}
            isEditing={isEditing}
          />
        )}
      </main>

      {/* PIN Modal for saving layout */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Save Layout Changes</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your PIN to save the new widget layout.
            </p>
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              error={pinError || undefined}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleCancelSave}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLayout}
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
