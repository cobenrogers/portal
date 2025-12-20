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

// SVG pattern generators for holiday backgrounds
const createSvgPattern = (svg: string) => {
  const encoded = encodeURIComponent(svg)
  return `url("data:image/svg+xml,${encoded}")`
}

// Holiday SVG patterns
const HOLIDAY_PATTERNS = {
  // Stars pattern for New Year's
  stars: (color: string, opacity: number) => `
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <polygon points="30,5 35,20 50,20 38,30 43,45 30,35 17,45 22,30 10,20 25,20" fill="${color}" opacity="${opacity}"/>
      <polygon points="10,50 12,55 17,55 13,58 15,63 10,60 5,63 7,58 3,55 8,55" fill="${color}" opacity="${opacity * 0.7}"/>
      <polygon points="50,45 52,50 57,50 53,53 55,58 50,55 45,58 47,53 43,50 48,50" fill="${color}" opacity="${opacity * 0.7}"/>
    </svg>
  `,
  // Hearts pattern for Valentine's
  hearts: (color: string, opacity: number) => `
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <path d="M30,50 C15,35 5,25 15,15 C25,5 30,15 30,20 C30,15 35,5 45,15 C55,25 45,35 30,50 Z" fill="${color}" opacity="${opacity}"/>
      <path d="M12,55 C7,50 3,47 7,43 C11,39 12,43 12,45 C12,43 13,39 17,43 C21,47 17,50 12,55 Z" fill="${color}" opacity="${opacity * 0.6}"/>
    </svg>
  `,
  // Shamrock pattern for St. Patrick's
  shamrock: (color: string, opacity: number) => `
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="18" rx="10" ry="12" fill="${color}" opacity="${opacity}"/>
      <ellipse cx="20" cy="30" rx="10" ry="12" transform="rotate(-30 20 30)" fill="${color}" opacity="${opacity}"/>
      <ellipse cx="40" cy="30" rx="10" ry="12" transform="rotate(30 40 30)" fill="${color}" opacity="${opacity}"/>
      <rect x="28" y="35" width="4" height="20" fill="${color}" opacity="${opacity}"/>
    </svg>
  `,
  // Easter eggs pattern
  eggs: (colors: string[], opacity: number) => `
    <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="25" cy="30" rx="12" ry="16" fill="${colors[0]}" opacity="${opacity}"/>
      <ellipse cx="25" cy="28" rx="8" ry="4" fill="${colors[1]}" opacity="${opacity * 0.5}"/>
      <ellipse cx="60" cy="55" rx="10" ry="14" fill="${colors[2]}" opacity="${opacity}"/>
      <line x1="55" y1="50" x2="65" y2="50" stroke="${colors[3]}" stroke-width="2" opacity="${opacity * 0.6}"/>
      <line x1="55" y1="55" x2="65" y2="55" stroke="${colors[3]}" stroke-width="2" opacity="${opacity * 0.6}"/>
    </svg>
  `,
  // American flag stars for Memorial/Independence
  flagStars: (color: string, opacity: number) => `
    <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
      <polygon points="25,5 28,15 38,15 30,22 33,32 25,26 17,32 20,22 12,15 22,15" fill="${color}" opacity="${opacity}"/>
    </svg>
  `,
  // Pumpkins for Halloween
  pumpkins: (color1: string, color2: string, opacity: number) => `
    <svg width="70" height="70" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="35" cy="40" rx="20" ry="18" fill="${color1}" opacity="${opacity}"/>
      <ellipse cx="25" cy="40" rx="8" ry="16" fill="${color1}" opacity="${opacity * 0.8}"/>
      <ellipse cx="45" cy="40" rx="8" ry="16" fill="${color1}" opacity="${opacity * 0.8}"/>
      <rect x="32" y="20" width="6" height="10" rx="2" fill="${color2}" opacity="${opacity}"/>
      <polygon points="30,30 35,22 40,30" fill="${color2}" opacity="${opacity * 0.6}"/>
    </svg>
  `,
  // Maple leaves for Thanksgiving
  mapleLeaf: (color: string, opacity: number) => `
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <path d="M30,55 L28,40 L15,45 L22,35 L10,30 L22,28 L18,15 L28,25 L30,10 L32,25 L42,15 L38,28 L50,30 L38,35 L45,45 L32,40 L30,55 Z" fill="${color}" opacity="${opacity}"/>
    </svg>
  `,
  // Christmas trees
  christmasTree: (treeColor: string, starColor: string, opacity: number) => `
    <svg width="60" height="70" xmlns="http://www.w3.org/2000/svg">
      <polygon points="30,8 45,30 38,30 50,50 35,50 35,60 25,60 25,50 10,50 22,30 15,30" fill="${treeColor}" opacity="${opacity}"/>
      <polygon points="30,3 33,10 27,10" fill="${starColor}" opacity="${opacity}"/>
      <circle cx="25" cy="35" r="2" fill="#f44336" opacity="${opacity}"/>
      <circle cx="35" cy="40" r="2" fill="#ffd700" opacity="${opacity}"/>
      <circle cx="28" cy="48" r="2" fill="#2196f3" opacity="${opacity}"/>
    </svg>
  `,
  // Snowflakes for Winter
  snowflake: (color: string, opacity: number) => `
    <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
      <line x1="25" y1="5" x2="25" y2="45" stroke="${color}" stroke-width="2" opacity="${opacity}"/>
      <line x1="5" y1="25" x2="45" y2="25" stroke="${color}" stroke-width="2" opacity="${opacity}"/>
      <line x1="10" y1="10" x2="40" y2="40" stroke="${color}" stroke-width="1.5" opacity="${opacity}"/>
      <line x1="40" y1="10" x2="10" y2="40" stroke="${color}" stroke-width="1.5" opacity="${opacity}"/>
      <line x1="25" y1="10" x2="20" y2="5" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="25" y1="10" x2="30" y2="5" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="25" y1="40" x2="20" y2="45" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="25" y1="40" x2="30" y2="45" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="10" y1="25" x2="5" y2="20" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="10" y1="25" x2="5" y2="30" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="40" y1="25" x2="45" y2="20" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
      <line x1="40" y1="25" x2="45" y2="30" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
    </svg>
  `,
  // Fireworks for Independence Day
  firework: (colors: string[], opacity: number) => `
    <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="3" fill="${colors[0]}" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="40" y2="15" stroke="${colors[0]}" stroke-width="2" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="40" y2="65" stroke="${colors[1]}" stroke-width="2" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="15" y2="40" stroke="${colors[2]}" stroke-width="2" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="65" y2="40" stroke="${colors[0]}" stroke-width="2" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="22" y2="22" stroke="${colors[1]}" stroke-width="1.5" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="58" y2="58" stroke="${colors[2]}" stroke-width="1.5" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="58" y2="22" stroke="${colors[0]}" stroke-width="1.5" opacity="${opacity}"/>
      <line x1="40" y1="40" x2="22" y2="58" stroke="${colors[1]}" stroke-width="1.5" opacity="${opacity}"/>
      <circle cx="40" cy="18" r="2" fill="${colors[0]}" opacity="${opacity}"/>
      <circle cx="40" cy="62" r="2" fill="${colors[1]}" opacity="${opacity}"/>
      <circle cx="18" cy="40" r="2" fill="${colors[2]}" opacity="${opacity}"/>
      <circle cx="62" cy="40" r="2" fill="${colors[0]}" opacity="${opacity}"/>
    </svg>
  `,
}

// Holiday background pattern configurations with SVG patterns
const HOLIDAY_GRADIENTS: Record<HolidayBackground, { light: string; dark: string }> = {
  'new-years': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.stars('#ffd700', 0.3))}, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.stars('#ffd700', 0.2))}, linear-gradient(135deg, #0a0a15 0%, #0d1525 50%, #0a2040 100%)`,
  },
  'valentines': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.hearts('#e91e63', 0.15))}, linear-gradient(135deg, #fce4ec 0%, #f8bbd9 50%, #f48fb1 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.hearts('#ff4081', 0.2))}, linear-gradient(135deg, #4a1a2c 0%, #5d1a38 50%, #6a1b4d 100%)`,
  },
  'st-patricks': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.shamrock('#2e7d32', 0.15))}, linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.shamrock('#4caf50', 0.2))}, linear-gradient(135deg, #1a3d1a 0%, #1e4620 50%, #2e5a2e 100%)`,
  },
  'easter': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.eggs(['#e1bee7', '#b2ebf2', '#c5e1a5', '#7e57c2'], 0.4))}, linear-gradient(135deg, #fff3e0 0%, #ffe0b2 25%, #e1bee7 50%, #b2ebf2 75%, #c5e1a5 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.eggs(['#9c27b0', '#00bcd4', '#8bc34a', '#5e35b1'], 0.25))}, linear-gradient(135deg, #3d2e1f 0%, #3d2e1f 25%, #2d1f3d 50%, #1f3d3d 75%, #2d3d1f 100%)`,
  },
  'memorial': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.flagStars('#1565c0', 0.15))}, repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(244, 67, 54, 0.1) 20px, rgba(244, 67, 54, 0.1) 25px), linear-gradient(135deg, #e3f2fd 0%, #ffffff 50%, #ffebee 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.flagStars('#42a5f5', 0.2))}, repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(244, 67, 54, 0.12) 20px, rgba(244, 67, 54, 0.12) 25px), linear-gradient(135deg, #1a2744 0%, #1e293b 50%, #2d1a24 100%)`,
  },
  'independence': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.firework(['#f44336', '#ffffff', '#2196f3'], 0.25))}, linear-gradient(135deg, #e3f2fd 0%, #ffffff 33%, #ffebee 66%, #e3f2fd 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.firework(['#ef5350', '#ffffff', '#42a5f5'], 0.3))}, linear-gradient(135deg, #1a2744 0%, #1e293b 33%, #3d1a24 66%, #1a2744 100%)`,
  },
  'labor': {
    light: `linear-gradient(135deg, #fff8e1 0%, #ffecb3 50%, #ffe082 100%)`,
    dark: `linear-gradient(135deg, #3d3520 0%, #4a3f20 50%, #5c4d20 100%)`,
  },
  'halloween': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.pumpkins('#ff9800', '#4a2c00', 0.2))}, linear-gradient(135deg, #fff3e0 0%, #ffcc80 50%, #ff9800 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.pumpkins('#ff9800', '#2d1f0f', 0.25))}, linear-gradient(135deg, #1a1a1a 0%, #2d1f0f 50%, #3d2810 100%)`,
  },
  'thanksgiving': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.mapleLeaf('#e65100', 0.15))}, linear-gradient(135deg, #fff8e1 0%, #ffe0b2 33%, #ffcc80 66%, #d7ccc8 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.mapleLeaf('#ff9800', 0.2))}, linear-gradient(135deg, #2d2518 0%, #3d2e1a 33%, #4a3620 66%, #3d3530 100%)`,
  },
  'christmas': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.christmasTree('#2e7d32', '#ffd700', 0.2))}, linear-gradient(135deg, #e8f5e9 0%, #ffffff 50%, #ffebee 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.christmasTree('#4caf50', '#ffd700', 0.25))}, linear-gradient(135deg, #1a2e1a 0%, #1e293b 50%, #2e1a1a 100%)`,
  },
  'winter': {
    light: `${createSvgPattern(HOLIDAY_PATTERNS.snowflake('#90caf9', 0.4))}, linear-gradient(135deg, #e3f2fd 0%, #e1f5fe 50%, #f3e5f5 100%)`,
    dark: `${createSvgPattern(HOLIDAY_PATTERNS.snowflake('#90caf9', 0.25))}, linear-gradient(135deg, #1a2744 0%, #1a3344 50%, #2d1f3d 100%)`,
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
