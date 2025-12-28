import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Unlock, Search, MapPin, Loader2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { getSettings, saveSettings, searchLocations, searchStockSymbols } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks'
import { generateId, cn } from '@/lib/utils'
import type {
  PortalSettings,
  WidgetConfig,
  WidgetType,
  NewsWidgetSettings,
  NewsCategoryWidgetSettings,
  NewsCategory,
  WeatherWidgetSettings,
  CalendarWidgetSettings,
  CalendarSource,
  CalendarColor,
  StockWidgetSettings,
  LotteryWidgetSettings,
  DailyWidgetSettings,
  DailyContentType,
  BitcoinMiningWidgetSettings,
  RecipesWidgetSettings,
  RecipeCategory,
  GeoLocation,
  StockSearchResult,
  BackgroundSettings,
  BackgroundType,
  HolidayBackground,
} from '@/types'

interface SettingsProps {
  onBack: () => void
  onSave: (settings: PortalSettings) => void
  onPreviewBackground?: (bg: BackgroundSettings | null) => void
  previewBackgroundStyle?: React.CSSProperties
  hasCustomBackground?: boolean
}

interface WidgetTypeConfig {
  value: WidgetType
  label: string
}

// Main widget types (non-expandable categories)
const MAIN_WIDGET_TYPES: WidgetTypeConfig[] = [
  { value: 'weather', label: 'Weather' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'stocks', label: 'Stock Ticker' },
  { value: 'lottery', label: 'Lottery' },
  { value: 'bitcoin-mining', label: 'Bitcoin Mining' },
  { value: 'recipes', label: 'Recipe Suggestions' },
]

// Daily widget types (shown when Daily category is expanded)
const DAILY_WIDGET_TYPES: WidgetTypeConfig[] = [
  { value: 'daily', label: 'The Daily Widget' },
  { value: 'history', label: 'This Day in History' },
  { value: 'trivia', label: 'Daily Trivia' },
]

// News category widget types with their feeds
interface NewsCategoryConfig {
  type: NewsCategory
  label: string
  color: string
  feeds: { name: string; url: string }[]
}

const NEWS_CATEGORIES: NewsCategoryConfig[] = [
  {
    type: 'news-top',
    label: 'Top News',
    color: 'blue',
    feeds: [
      { name: 'CNN (via Google News)', url: 'https://news.google.com/rss/search?q=site:cnn.com&hl=en-US&gl=US&ceid=US:en' },
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
      { name: 'New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
      { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
      { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories' },
      { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
      { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news' },
      { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
      { name: 'Politico', url: 'https://www.politico.com/rss/politicopicks.xml' },
      { name: 'LA Times', url: 'https://www.latimes.com/local/rss2.0.xml' },
      { name: 'Time', url: 'https://time.com/feed/' },
    ],
  },
  {
    type: 'news-business',
    label: 'Business',
    color: 'green',
    feeds: [
      { name: 'CNBC Top News', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147' },
      { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' },
      { name: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
      { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
    ],
  },
  {
    type: 'news-tech',
    label: 'Technology',
    color: 'purple',
    feeds: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
      { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
      { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
    ],
  },
  {
    type: 'news-world',
    label: 'World',
    color: 'teal',
    feeds: [
      { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
    ],
  },
  {
    type: 'news-sports',
    label: 'Sports',
    color: 'red',
    feeds: [
      { name: 'ESPN Top Headlines', url: 'https://www.espn.com/espn/rss/news' },
      { name: 'ESPN NFL', url: 'https://www.espn.com/espn/rss/nfl/news' },
      { name: 'ESPN NBA', url: 'https://www.espn.com/espn/rss/nba/news' },
      { name: 'ESPN MLB', url: 'https://www.espn.com/espn/rss/mlb/news' },
    ],
  },
  {
    type: 'news-entertainment',
    label: 'Entertainment',
    color: 'pink',
    feeds: [
      { name: 'Variety', url: 'https://variety.com/feed/' },
      { name: 'Entertainment Weekly', url: 'https://ew.com/feed/' },
      { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/' },
    ],
  },
  {
    type: 'news-custom',
    label: 'Custom Feed',
    color: 'gray',
    feeds: [], // No presets - user enters custom URL
  },
]

// Helper to get default feed for a news category
function getDefaultNewsFeed(category: NewsCategory): { name: string; url: string } {
  const config = NEWS_CATEGORIES.find(c => c.type === category)
  if (config && config.feeds.length > 0) {
    return config.feeds[0]
  }
  return { name: 'Custom Feed', url: '' }
}

// Helper to get category config
function getNewsCategoryConfig(category: NewsCategory): NewsCategoryConfig | undefined {
  return NEWS_CATEGORIES.find(c => c.type === category)
}

// Check if a widget type is a news category
function isNewsCategory(type: WidgetType): type is NewsCategory {
  return type.startsWith('news-')
}

// Add Widget Section - with expandable News and Daily categories
function AddWidgetSection({ onAddWidget, onAddNewsWidget }: {
  onAddWidget: (type: WidgetType) => void
  onAddNewsWidget: (category: NewsCategory, feedName: string, feedUrl: string) => void
}) {
  const [newsExpanded, setNewsExpanded] = useState(false)
  const [dailyExpanded, setDailyExpanded] = useState(false)
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<NewsCategory | null>(null)

  const handleNewsCategoryClick = (category: NewsCategory) => {
    if (category === 'news-custom') {
      // Custom feed - add directly with empty URL (user will configure)
      onAddNewsWidget(category, 'Custom Feed', '')
      setNewsExpanded(false)
      setSelectedNewsCategory(null)
    } else {
      // Toggle sub-selection for preset feeds
      setSelectedNewsCategory(selectedNewsCategory === category ? null : category)
    }
  }

  const handleFeedSelect = (category: NewsCategory, feed: { name: string; url: string }) => {
    onAddNewsWidget(category, feed.name, feed.url)
    setNewsExpanded(false)
    setSelectedNewsCategory(null)
  }

  const selectedCategoryConfig = selectedNewsCategory ? getNewsCategoryConfig(selectedNewsCategory) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Widget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {/* News category button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewsExpanded(!newsExpanded)
              setSelectedNewsCategory(null)
              setDailyExpanded(false)
            }}
            className={newsExpanded ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' : ''}
          >
            {newsExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            News
          </Button>

          {MAIN_WIDGET_TYPES.map((type) => (
            <Button
              key={type.value}
              variant="outline"
              size="sm"
              onClick={() => onAddWidget(type.value)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {type.label}
            </Button>
          ))}

          {/* Daily category button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDailyExpanded(!dailyExpanded)
              setNewsExpanded(false)
              setSelectedNewsCategory(null)
            }}
            className={dailyExpanded ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : ''}
          >
            {dailyExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Daily
          </Button>
        </div>

        {/* Expanded News category options */}
        {newsExpanded && (
          <div className="space-y-2 pl-4 pt-2 border-l-2 border-blue-300 dark:border-blue-700">
            <div className="flex flex-wrap gap-2">
              {NEWS_CATEGORIES.map((category) => (
                <Button
                  key={category.type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewsCategoryClick(category.type)}
                  className={cn(
                    'border-blue-300 dark:border-blue-700',
                    selectedNewsCategory === category.type
                      ? `bg-${category.color}-500 text-white border-${category.color}-500`
                      : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  )}
                >
                  {selectedNewsCategory === category.type ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  {category.label}
                </Button>
              ))}
            </div>

            {/* Feed selection for selected news category */}
            {selectedCategoryConfig && selectedCategoryConfig.feeds.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-4 pt-2 border-l-2 border-gray-300 dark:border-gray-600">
                {selectedCategoryConfig.feeds.map((feed) => (
                  <button
                    key={feed.url}
                    onClick={() => handleFeedSelect(selectedNewsCategory!, feed)}
                    className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {feed.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expanded Daily widget options */}
        {dailyExpanded && (
          <div className="flex flex-wrap gap-2 pl-4 pt-2 border-l-2 border-orange-300 dark:border-orange-700">
            {DAILY_WIDGET_TYPES.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddWidget(type.value)
                  setDailyExpanded(false)
                }}
                className="border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                <Plus className="w-4 h-4 mr-1" />
                {type.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getDefaultWidgetSettings(type: WidgetType): WidgetConfig['settings'] {
  // Handle news category types
  if (isNewsCategory(type)) {
    const defaultFeed = getDefaultNewsFeed(type)
    return {
      feedUrl: defaultFeed.url,
      feedName: defaultFeed.name,
      maxItems: 10,
      refreshInterval: 15,
    } as NewsCategoryWidgetSettings
  }

  switch (type) {
    case 'news':
      // Legacy news widget - use first top news feed as default
      return {
        feedUrl: NEWS_CATEGORIES[0].feeds[0].url,
        feedName: NEWS_CATEGORIES[0].feeds[0].name,
        maxItems: 10,
        refreshInterval: 15,
      } as NewsWidgetSettings
    case 'weather':
      return {
        location: 'New York',
        units: 'imperial',
        showForecast: true,
      } as WeatherWidgetSettings
    case 'calendar':
      return {
        calendarName: 'Calendar',
        calendarUrl: '',
        daysToShow: 7,
      } as CalendarWidgetSettings
    case 'stocks':
      return {
        widgetName: 'Stocks',
        symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN'],
        refreshInterval: 2,
      } as StockWidgetSettings
    case 'lottery':
      return {
        refreshInterval: 30,
      } as LotteryWidgetSettings
    case 'daily':
      return {
        enabledContent: ['quote', 'joke'],
      } as DailyWidgetSettings
    case 'history':
      return {} // No settings for history widget
    case 'trivia':
      return {} // No settings for trivia widget
    case 'bitcoin-mining':
      return {
        walletAddress: '',
        widgetName: 'Bitcoin Mining',
        refreshInterval: 5,
      } as BitcoinMiningWidgetSettings
    case 'recipes':
      return {
        widgetName: 'Recipe Suggestions',
        recipeCount: 3,
        category: 'all',
        refreshInterval: 60,
      } as RecipesWidgetSettings
    default:
      return {} // Fallback for any unhandled types
  }
}

export function Settings({ onBack, onSave, onPreviewBackground, previewBackgroundStyle, hasCustomBackground }: SettingsProps) {
  const { isAuthenticated, isApproved, user } = useAuth()
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAppearanceExpanded, setIsAppearanceExpanded] = useState(false)

  // Apply theme (needed since Settings page renders independently)
  useTheme(settings?.theme ?? 'light')

  // Update preview when background changes in settings
  const handleBackgroundUpdate = useCallback((bg: BackgroundSettings) => {
    if (settings) {
      setSettings({ ...settings, background: bg })
      onPreviewBackground?.(bg)
    }
  }, [settings, onPreviewBackground])

  // User must be authenticated and approved to access settings
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

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setError(null)

    try {
      await saveSettings(settings)
      onSave(settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const addWidget = useCallback((type: WidgetType) => {
    if (!settings) return

    const id = `${type}-${generateId()}`

    // Calculate the next order value (one more than current max)
    const existingWidgets = settings.dashboardLayout.widgets
    const maxOrder = existingWidgets.length > 0
      ? Math.max(...existingWidgets.map(w => w.order ?? 0))
      : 0

    const newWidget: WidgetConfig = {
      id,
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      settings: getDefaultWidgetSettings(type),
      order: maxOrder + 1,
    }

    // Calculate next y position based on existing widgets
    // Find the max y value in each layout and add 1
    const getNextY = (layout: typeof settings.dashboardLayout.layouts.lg) => {
      if (layout.length === 0) return 0
      const maxY = Math.max(...layout.map(item => item.y ?? 0))
      return maxY + 1
    }

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts: {
          lg: [...settings.dashboardLayout.layouts.lg, { i: id, x: 0, y: getNextY(settings.dashboardLayout.layouts.lg), w: 3, h: 3 }],
          md: [...settings.dashboardLayout.layouts.md, { i: id, x: 0, y: getNextY(settings.dashboardLayout.layouts.md), w: 3, h: 3 }],
          sm: [...settings.dashboardLayout.layouts.sm, { i: id, x: 0, y: getNextY(settings.dashboardLayout.layouts.sm), w: 3, h: 3 }],
        },
        widgets: [...settings.dashboardLayout.widgets, newWidget],
      },
    })
  }, [settings])

  // Add a news widget with specific feed settings
  const addNewsWidget = useCallback((category: NewsCategory, feedName: string, feedUrl: string) => {
    if (!settings) return

    const id = `${category}-${generateId()}`

    // Calculate the next order value (one more than current max)
    const existingWidgets = settings.dashboardLayout.widgets
    const maxOrder = existingWidgets.length > 0
      ? Math.max(...existingWidgets.map(w => w.order ?? 0))
      : 0

    const newWidget: WidgetConfig = {
      id,
      type: category,
      title: feedName,
      settings: {
        feedUrl,
        feedName,
        maxItems: 10,
        refreshInterval: 15,
      } as NewsCategoryWidgetSettings,
      order: maxOrder + 1,
    }

    // Calculate next y position based on existing widgets
    const getNextY = (layout: typeof settings.dashboardLayout.layouts.lg) => {
      if (layout.length === 0) return 0
      const maxY = Math.max(...layout.map(item => item.y ?? 0))
      return maxY + 1
    }

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts: {
          lg: [...settings.dashboardLayout.layouts.lg, { i: id, x: 0, y: getNextY(settings.dashboardLayout.layouts.lg), w: 3, h: 3 }],
          md: [...settings.dashboardLayout.layouts.md, { i: id, x: 0, y: getNextY(settings.dashboardLayout.layouts.md), w: 3, h: 3 }],
          sm: [...settings.dashboardLayout.layouts.sm, { i: id, x: 0, y: getNextY(settings.dashboardLayout.layouts.sm), w: 3, h: 3 }],
        },
        widgets: [...settings.dashboardLayout.widgets, newWidget],
      },
    })
  }, [settings])

  const removeWidget = useCallback((widgetId: string) => {
    if (!settings) return

    // Remove widget and recalculate order values to keep them contiguous
    const remainingWidgets = settings.dashboardLayout.widgets
      .filter((w) => w.id !== widgetId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((widget, idx) => ({ ...widget, order: idx + 1 }))

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts: {
          lg: settings.dashboardLayout.layouts.lg.filter((l) => l.i !== widgetId),
          md: settings.dashboardLayout.layouts.md.filter((l) => l.i !== widgetId),
          sm: settings.dashboardLayout.layouts.sm.filter((l) => l.i !== widgetId),
        },
        widgets: remainingWidgets,
      },
    })
  }, [settings])

  const updateWidgetSettings = useCallback(
    (widgetId: string, newSettings: Partial<WidgetConfig['settings']>) => {
      if (!settings) return

      setSettings({
        ...settings,
        dashboardLayout: {
          ...settings.dashboardLayout,
          widgets: settings.dashboardLayout.widgets.map((w) =>
            w.id === widgetId
              ? { ...w, settings: { ...w.settings, ...newSettings } }
              : w
          ),
        },
      })
    },
    [settings]
  )

  const moveWidget = useCallback((widgetId: string, direction: 'up' | 'down') => {
    if (!settings) return

    const widgets = [...settings.dashboardLayout.widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const currentIndex = widgets.findIndex(w => w.id === widgetId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= widgets.length) return

    // Swap the widgets
    const temp = widgets[currentIndex]
    widgets[currentIndex] = widgets[targetIndex]
    widgets[targetIndex] = temp

    // Reassign order values
    const reorderedWidgets = widgets.map((widget, idx) => ({ ...widget, order: idx + 1 }))

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        widgets: reorderedWidgets,
      },
    })
  }, [settings])

  // Reorder widget via drag-and-drop (move from one index to another)
  const reorderWidget = useCallback((fromIndex: number, toIndex: number) => {
    if (!settings || fromIndex === toIndex) return

    const widgets = [...settings.dashboardLayout.widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    // Remove widget from original position and insert at new position
    const [movedWidget] = widgets.splice(fromIndex, 1)
    widgets.splice(toIndex, 0, movedWidget)

    // Reassign order values
    const reorderedWidgets = widgets.map((widget, idx) => ({ ...widget, order: idx + 1 }))

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        widgets: reorderedWidgets,
      },
    })
  }, [settings])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Require authentication
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {!isAuthenticated
                ? 'Sign in with Google to access settings.'
                : 'Your account is pending approval. You cannot modify settings yet.'}
            </p>
            <Button variant="outline" onClick={onBack} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${!hasCustomBackground ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
      style={previewBackgroundStyle}
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Portal Settings</h1>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">{error}</div>
        )}

        {/* Auth status */}
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Unlock className="w-4 h-4" />
          Signed in as {user?.email}
        </div>

        {/* Appearance - Collapsible, at top */}
        <Card>
          <button
            onClick={() => setIsAppearanceExpanded(!isAppearanceExpanded)}
            className="w-full"
          >
            <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle>Appearance</CardTitle>
                <ChevronDown className={cn(
                  'w-5 h-5 text-gray-500 transition-transform',
                  isAppearanceExpanded && 'rotate-180'
                )} />
              </div>
            </CardHeader>
          </button>
          {isAppearanceExpanded && (
            <CardContent className="space-y-6 pt-0">
              <Select
                label="Theme"
                value={settings?.theme || 'light'}
                onChange={(e) =>
                  settings &&
                  setSettings({ ...settings, theme: e.target.value as PortalSettings['theme'] })
                }
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />

              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Background</h3>
                <BackgroundSettingsEditor
                  background={settings?.background}
                  onUpdate={handleBackgroundUpdate}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Add Widget */}
        <AddWidgetSection onAddWidget={addWidget} onAddNewsWidget={addNewsWidget} />

        {/* Widget List */}
        <WidgetList
          widgets={settings?.dashboardLayout.widgets || []}
          onUpdateSettings={updateWidgetSettings}
          onRemove={removeWidget}
          onMoveUp={(id) => moveWidget(id, 'up')}
          onMoveDown={(id) => moveWidget(id, 'down')}
          onReorder={reorderWidget}
        />
      </main>
    </div>
  )
}

// Widget List with drag-and-drop support
function WidgetList({
  widgets,
  onUpdateSettings,
  onRemove,
  onMoveUp,
  onMoveDown,
  onReorder,
}: {
  widgets: WidgetConfig[]
  onUpdateSettings: (widgetId: string, settings: Partial<WidgetConfig['settings']>) => void
  onRemove: (widgetId: string) => void
  onMoveUp: (widgetId: string) => void
  onMoveDown: (widgetId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const sortedWidgets = [...widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Widgets ({widgets.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedWidgets.map((widget, index) => (
          <WidgetEditor
            key={widget.id}
            widget={widget}
            index={index}
            totalWidgets={sortedWidgets.length}
            onUpdate={(newSettings) => onUpdateSettings(widget.id, newSettings)}
            onRemove={() => onRemove(widget.id)}
            onMoveUp={() => onMoveUp(widget.id)}
            onMoveDown={() => onMoveDown(widget.id)}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          />
        ))}
        {widgets.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No widgets configured. Add one above.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function WidgetEditor({
  widget,
  index,
  totalWidgets,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  widget: WidgetConfig
  index: number
  totalWidgets: number
  onUpdate: (settings: Partial<WidgetConfig['settings']>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isFirst = index === 0
  const isLast = index === totalWidgets - 1

  return (
    <div
      className={cn(
        'border dark:border-gray-700 rounded-lg p-3 transition-all',
        isDragging && 'opacity-50 scale-[0.98]',
        isDragOver && 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hidden sm:block">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Reorder controls (for mobile) */}
        <div className="flex flex-col sm:hidden">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Widget info - clickable to expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              (widget.type === 'news' || widget.type === 'news-top') && 'bg-blue-500',
              widget.type === 'news-business' && 'bg-green-500',
              widget.type === 'news-tech' && 'bg-purple-500',
              widget.type === 'news-world' && 'bg-teal-500',
              widget.type === 'news-sports' && 'bg-red-500',
              widget.type === 'news-entertainment' && 'bg-pink-500',
              widget.type === 'news-custom' && 'bg-gray-500',
              widget.type === 'weather' && 'bg-yellow-500',
              widget.type === 'calendar' && 'bg-emerald-500',
              widget.type === 'stocks' && 'bg-violet-500',
              widget.type === 'lottery' && 'bg-rose-500',
              widget.type === 'daily' && 'bg-orange-500',
              widget.type === 'history' && 'bg-amber-600',
              widget.type === 'trivia' && 'bg-cyan-500',
              widget.type === 'bitcoin-mining' && 'bg-orange-500',
              widget.type === 'recipes' && 'bg-green-500'
            )}
          />
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {widget.type === 'news' || isNewsCategory(widget.type)
              ? (widget.settings as NewsWidgetSettings | NewsCategoryWidgetSettings).feedName
              : widget.type === 'weather'
              ? (widget.settings as WeatherWidgetSettings).location
              : widget.type === 'calendar'
              ? (widget.settings as CalendarWidgetSettings).calendarName || 'Calendar'
              : widget.type === 'stocks'
              ? (widget.settings as StockWidgetSettings).widgetName || 'Stocks'
              : widget.type === 'lottery'
              ? 'Lottery'
              : widget.type === 'daily'
              ? 'The Daily Widget'
              : widget.type === 'history'
              ? 'This Day in History'
              : widget.type === 'trivia'
              ? 'Daily Trivia'
              : widget.type === 'bitcoin-mining'
              ? (widget.settings as BitcoinMiningWidgetSettings).widgetName || 'Bitcoin Mining'
              : widget.type === 'recipes'
              ? (widget.settings as RecipesWidgetSettings).widgetName || 'Recipe Suggestions'
              : 'Widget'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase flex-shrink-0">
            {widget.type === 'daily' ? 'widget' : isNewsCategory(widget.type) ? 'news' : widget.type}
          </span>
        </button>

        {/* Delete button */}
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 dark:text-red-400 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
          {widget.type === 'news' && (
            <LegacyNewsWidgetEditor
              settings={widget.settings as NewsWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {isNewsCategory(widget.type) && (
            <NewsCategoryWidgetEditor
              category={widget.type}
              settings={widget.settings as NewsCategoryWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {widget.type === 'weather' && (
            <WeatherWidgetEditor
              settings={widget.settings as WeatherWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {widget.type === 'calendar' && (
            <CalendarWidgetEditor
              settings={widget.settings as CalendarWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {widget.type === 'stocks' && (
            <StockWidgetEditor
              settings={widget.settings as StockWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {widget.type === 'daily' && (
            <DailyWidgetEditor
              settings={widget.settings as DailyWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {widget.type === 'bitcoin-mining' && (
            <BitcoinMiningWidgetEditor
              settings={widget.settings as BitcoinMiningWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {widget.type === 'recipes' && (
            <RecipesWidgetEditor
              settings={widget.settings as RecipesWidgetSettings}
              onUpdate={onUpdate}
            />
          )}
          {(widget.type === 'lottery' || widget.type === 'history' || widget.type === 'trivia') && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No settings to configure for this widget.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Legacy news widget editor (for backwards compatibility with old 'news' type widgets)
function LegacyNewsWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: NewsWidgetSettings
  onUpdate: (s: Partial<NewsWidgetSettings>) => void
}) {
  return (
    <>
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Feed</label>
        {NEWS_CATEGORIES.filter(cat => cat.feeds.length > 0).map((category) => (
          <div key={category.type}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{category.label}</p>
            <div className="flex flex-wrap gap-1">
              {category.feeds.map((feed) => (
                <button
                  key={feed.url}
                  onClick={() => onUpdate({ feedUrl: feed.url, feedName: feed.name })}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    settings.feedUrl === feed.url
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {feed.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Input
        label="Custom Feed URL"
        value={settings.feedUrl}
        onChange={(e) => onUpdate({ feedUrl: e.target.value })}
        placeholder="https://example.com/feed.xml"
      />
      <Input
        label="Feed Name"
        value={settings.feedName}
        onChange={(e) => onUpdate({ feedName: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max Items"
          type="number"
          value={settings.maxItems}
          onChange={(e) => onUpdate({ maxItems: parseInt(e.target.value) || 10 })}
          min={1}
          max={50}
        />
        <Input
          label="Refresh (minutes)"
          type="number"
          value={settings.refreshInterval}
          onChange={(e) => onUpdate({ refreshInterval: parseInt(e.target.value) || 15 })}
          min={5}
          max={120}
        />
      </div>
    </>
  )
}

// News category widget editor - simplified settings
function NewsCategoryWidgetEditor({
  category,
  settings,
  onUpdate,
}: {
  category: NewsCategory
  settings: NewsCategoryWidgetSettings
  onUpdate: (s: Partial<NewsCategoryWidgetSettings>) => void
}) {
  const categoryConfig = getNewsCategoryConfig(category)
  const feeds = categoryConfig?.feeds || []
  const isCustomCategory = category === 'news-custom'

  return (
    <>
      {/* Feed selection for non-custom categories */}
      {feeds.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Feed</label>
          <div className="flex flex-wrap gap-1">
            {feeds.map((feed) => (
              <button
                key={feed.url}
                onClick={() => onUpdate({ feedUrl: feed.url, feedName: feed.name })}
                className={cn(
                  'px-2 py-1 text-xs rounded border',
                  settings.feedUrl === feed.url
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {feed.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Feed URL - always shown for custom category, optional for others */}
      <Input
        label={isCustomCategory ? "Feed URL" : "Custom Feed URL (optional)"}
        value={settings.feedUrl}
        onChange={(e) => onUpdate({ feedUrl: e.target.value })}
        placeholder="https://example.com/feed.xml"
      />
      <Input
        label="Feed Name"
        value={settings.feedName}
        onChange={(e) => onUpdate({ feedName: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max Items"
          type="number"
          value={settings.maxItems}
          onChange={(e) => onUpdate({ maxItems: parseInt(e.target.value) || 10 })}
          min={1}
          max={50}
        />
        <Input
          label="Refresh (minutes)"
          type="number"
          value={settings.refreshInterval}
          onChange={(e) => onUpdate({ refreshInterval: parseInt(e.target.value) || 15 })}
          min={5}
          max={120}
        />
      </div>
    </>
  )
}

function WeatherWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: WeatherWidgetSettings
  onUpdate: (s: Partial<WeatherWidgetSettings>) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchLocations(searchQuery)
        setSearchResults(results)
        setShowResults(true)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectLocation = (location: GeoLocation) => {
    onUpdate({
      location: location.displayName,
      latitude: location.latitude,
      longitude: location.longitude,
    })
    setSearchQuery('')
    setShowResults(false)
  }

  return (
    <>
      {/* Current Location Display */}
      {settings.location && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <MapPin className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{settings.location}</span>
        </div>
      )}

      {/* Location Search */}
      <div ref={containerRef} className="relative">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1">Search Location</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for a city..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((location) => (
              <button
                key={location.id}
                onClick={() => selectLocation(location)}
                className="w-full px-4 py-3 text-left hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-b dark:border-gray-700 last:border-b-0 flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{location.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {[location.admin1, location.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            No locations found for "{searchQuery}"
          </div>
        )}
      </div>

      <Select
        label="Units"
        value={settings.units}
        onChange={(e) => onUpdate({ units: e.target.value as 'imperial' | 'metric' })}
        options={[
          { value: 'imperial', label: 'Imperial (°F, mph)' },
          { value: 'metric', label: 'Metric (°C, km/h)' },
        ]}
      />
      <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
        <input
          type="checkbox"
          checked={settings.showForecast}
          onChange={(e) => onUpdate({ showForecast: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">Show forecast</span>
      </label>
    </>
  )
}

// Available calendar colors
const CALENDAR_COLOR_OPTIONS: { value: CalendarColor; label: string; className: string }[] = [
  { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
  { value: 'green', label: 'Green', className: 'bg-green-500' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
  { value: 'red', label: 'Red', className: 'bg-red-500' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-500' },
]

// Get used colors from current calendars
function getAvailableColors(calendars: CalendarSource[], excludeId?: string): CalendarColor[] {
  const usedColors = calendars
    .filter(c => c.id !== excludeId)
    .map(c => c.color)
  return CALENDAR_COLOR_OPTIONS
    .map(c => c.value)
    .filter(color => !usedColors.includes(color))
}

function CalendarWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: CalendarWidgetSettings
  onUpdate: (s: Partial<CalendarWidgetSettings>) => void
}) {
  // Convert legacy single calendar to array format for editing
  const calendars: CalendarSource[] = settings.calendars || (settings.calendarUrl ? [{
    id: 'legacy',
    name: settings.calendarName || 'Calendar',
    url: settings.calendarUrl,
    color: 'blue' as CalendarColor,
  }] : [])

  const canAddMore = calendars.length < 3

  const addCalendar = () => {
    if (!canAddMore) return
    const availableColors = getAvailableColors(calendars)
    const newCalendar: CalendarSource = {
      id: generateId(),
      name: '',
      url: '',
      color: availableColors[0] || 'blue',
    }
    onUpdate({
      calendars: [...calendars, newCalendar],
      // Clear legacy fields when using multi-calendar
      calendarUrl: undefined,
    })
  }

  const updateCalendar = (id: string, updates: Partial<CalendarSource>) => {
    onUpdate({
      calendars: calendars.map(c => c.id === id ? { ...c, ...updates } : c),
      calendarUrl: undefined,
    })
  }

  const removeCalendar = (id: string) => {
    onUpdate({
      calendars: calendars.filter(c => c.id !== id),
      calendarUrl: undefined,
    })
  }

  return (
    <>
      <Input
        label="Widget Title"
        value={settings.calendarName || ''}
        onChange={(e) => onUpdate({ calendarName: e.target.value })}
        placeholder="Calendar"
      />

      {/* Calendar sources */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Calendars ({calendars.length}/3)
          </label>
          {canAddMore && (
            <Button variant="outline" size="sm" onClick={addCalendar}>
              <Plus className="w-4 h-4 mr-1" />
              Add Calendar
            </Button>
          )}
        </div>

        {calendars.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border border-dashed dark:border-gray-700 rounded-lg">
            No calendars configured. Click "Add Calendar" to add one.
          </div>
        ) : (
          <div className="space-y-3">
            {calendars.map((calendar, index) => {
              const availableColors = getAvailableColors(calendars, calendar.id)
              const colorOptions = [
                ...CALENDAR_COLOR_OPTIONS.filter(c => c.value === calendar.color),
                ...CALENDAR_COLOR_OPTIONS.filter(c => availableColors.includes(c.value)),
              ]

              return (
                <div
                  key={calendar.id}
                  className="p-3 border dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Calendar {index + 1}
                    </span>
                    <button
                      onClick={() => removeCalendar(calendar.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Input
                    label="Calendar Name"
                    value={calendar.name}
                    onChange={(e) => updateCalendar(calendar.id, { name: e.target.value })}
                    placeholder="e.g., Work, Personal"
                  />

                  <Input
                    label="iCal URL"
                    value={calendar.url}
                    onChange={(e) => updateCalendar(calendar.id, { url: e.target.value })}
                    placeholder="https://calendar.google.com/calendar/ical/..."
                  />

                  {/* Color picker */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => updateCalendar(calendar.id, { color: color.value })}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all',
                            color.className,
                            calendar.color === color.value
                              ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-400'
                              : 'border-transparent hover:scale-110'
                          )}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Input
        label="Days to show"
        type="number"
        value={settings.daysToShow}
        onChange={(e) => onUpdate({ daysToShow: parseInt(e.target.value) || 7 })}
        min={1}
        max={30}
      />
    </>
  )
}

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'JPM', name: 'JPMorgan' },
  { symbol: 'V', name: 'Visa' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'WMT', name: 'Walmart' },
  { symbol: 'DIS', name: 'Disney' },
]

const INDEX_FUNDS = [
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: '^GSPC', name: 'S&P 500 Index' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: '^IXIC', name: 'NASDAQ Composite' },
  { symbol: 'DIA', name: 'Dow Jones ETF' },
  { symbol: '^DJI', name: 'Dow Jones Index' },
  { symbol: 'IWM', name: 'Russell 2000 ETF' },
  { symbol: 'VTI', name: 'Total Market ETF' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD' },
  { symbol: 'ETH-USD', name: 'Ethereum USD' },
]

function StockWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: StockWidgetSettings
  onUpdate: (s: Partial<StockWidgetSettings>) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchStockSymbols(searchQuery)
        setSearchResults(results)
        setShowResults(true)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addSymbol = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase().trim()
    if (upperSymbol && !settings.symbols.includes(upperSymbol) && settings.symbols.length < 10) {
      onUpdate({ symbols: [...settings.symbols, upperSymbol] })
    }
    setSearchQuery('')
    setShowResults(false)
  }

  const removeSymbol = (symbol: string) => {
    onUpdate({ symbols: settings.symbols.filter((s) => s !== symbol) })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault()
      // If there are search results, add the first one; otherwise add the query as-is
      if (searchResults.length > 0) {
        addSymbol(searchResults[0].symbol)
      } else {
        addSymbol(searchQuery)
      }
    }
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newSymbols = [...settings.symbols]
      const [removed] = newSymbols.splice(draggedIndex, 1)
      newSymbols.splice(dragOverIndex, 0, removed)
      onUpdate({ symbols: newSymbols })
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const moveSymbol = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= settings.symbols.length) return
    const newSymbols = [...settings.symbols]
    const [removed] = newSymbols.splice(fromIndex, 1)
    newSymbols.splice(toIndex, 0, removed)
    onUpdate({ symbols: newSymbols })
  }

  return (
    <>
      <Input
        label="Widget Name"
        value={settings.widgetName || ''}
        onChange={(e) => onUpdate({ widgetName: e.target.value })}
        placeholder="e.g., My Watchlist"
      />

      {/* Current Symbols - Reorderable */}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-2">
          Symbols ({settings.symbols.length}/10) - Drag to reorder
        </label>
        <div className="space-y-1 mb-3">
          {settings.symbols.map((symbol, index) => (
            <div
              key={symbol}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 border rounded cursor-move transition-colors',
                draggedIndex === index && 'opacity-50',
                dragOverIndex === index && draggedIndex !== index && 'border-purple-500 bg-purple-100 dark:bg-purple-900/40',
                'border-purple-200 dark:border-purple-800'
              )}
            >
              <GripVertical className="w-4 h-4 text-purple-400 dark:text-purple-500 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-purple-700 dark:text-purple-300">{symbol}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSymbol(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveSymbol(index, 'down')}
                  disabled={index === settings.symbols.length - 1}
                  className="p-0.5 text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => removeSymbol(symbol)}
                  className="p-0.5 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {settings.symbols.length === 0 && (
            <span className="text-gray-400 dark:text-gray-500 text-sm">No symbols added</span>
          )}
        </div>
      </div>

      {/* Symbol Search */}
      <div ref={containerRef} className="relative">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1">Search & Add Symbol</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for stocks, ETFs, crypto..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={settings.symbols.length >= 10}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => addSymbol(result.symbol)}
                disabled={settings.symbols.includes(result.symbol)}
                className={cn(
                  'w-full px-4 py-3 text-left border-b dark:border-gray-700 last:border-b-0 flex items-start gap-3',
                  settings.symbols.includes(result.symbol)
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900'
                    : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{result.symbol}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {result.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{result.exchDisp}</div>
                </div>
                {settings.symbols.includes(result.symbol) && (
                  <span className="text-xs text-purple-500">Added</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            No results for "{searchQuery}" - Press Enter to add anyway
          </div>
        )}
      </div>

      {/* Quick Add - Popular Stocks */}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1">Popular Stocks</label>
        <div className="flex flex-wrap gap-1">
          {POPULAR_STOCKS.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => addSymbol(stock.symbol)}
              disabled={settings.symbols.includes(stock.symbol) || settings.symbols.length >= 10}
              className={cn(
                'px-2 py-1 text-xs rounded border',
                settings.symbols.includes(stock.symbol)
                  ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
              )}
              title={stock.name}
            >
              {stock.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add - Index Funds & Crypto */}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1">Indices, ETFs & Crypto</label>
        <div className="flex flex-wrap gap-1">
          {INDEX_FUNDS.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => addSymbol(stock.symbol)}
              disabled={settings.symbols.includes(stock.symbol) || settings.symbols.length >= 10}
              className={cn(
                'px-2 py-1 text-xs rounded border',
                settings.symbols.includes(stock.symbol)
                  ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
              )}
              title={stock.name}
            >
              {stock.symbol}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Refresh Interval (minutes)"
        type="number"
        value={settings.refreshInterval}
        onChange={(e) => onUpdate({ refreshInterval: parseInt(e.target.value) || 2 })}
        min={1}
        max={60}
      />
    </>
  )
}

// Daily content type options
const DAILY_CONTENT_OPTIONS: { value: DailyContentType; label: string }[] = [
  { value: 'quote', label: 'Quote of the Day' },
  { value: 'joke', label: 'Joke of the Day' },
  { value: 'word', label: 'Word of the Day' },
]

// Background color palette
const BACKGROUND_COLORS = [
  { value: '#f8fafc', label: 'Slate 50', dark: false },
  { value: '#f1f5f9', label: 'Slate 100', dark: false },
  { value: '#e2e8f0', label: 'Slate 200', dark: false },
  { value: '#fef3c7', label: 'Amber 100', dark: false },
  { value: '#fde68a', label: 'Amber 200', dark: false },
  { value: '#dbeafe', label: 'Blue 100', dark: false },
  { value: '#bfdbfe', label: 'Blue 200', dark: false },
  { value: '#dcfce7', label: 'Green 100', dark: false },
  { value: '#bbf7d0', label: 'Green 200', dark: false },
  { value: '#fce7f3', label: 'Pink 100', dark: false },
  { value: '#fbcfe8', label: 'Pink 200', dark: false },
  { value: '#f3e8ff', label: 'Purple 100', dark: false },
  { value: '#e9d5ff', label: 'Purple 200', dark: false },
  { value: '#fed7aa', label: 'Orange 100', dark: false },
  { value: '#fdba74', label: 'Orange 200', dark: false },
  { value: '#0f172a', label: 'Slate 900', dark: true },
  { value: '#1e293b', label: 'Slate 800', dark: true },
  { value: '#334155', label: 'Slate 700', dark: true },
  { value: '#1e3a5f', label: 'Navy', dark: true },
  { value: '#14532d', label: 'Forest', dark: true },
  { value: '#4c1d95', label: 'Violet', dark: true },
  { value: '#7f1d1d', label: 'Wine', dark: true },
]

// Holiday background options
const HOLIDAY_BACKGROUNDS: { value: HolidayBackground; label: string; emoji: string; months: number[] }[] = [
  { value: 'new-years', label: "New Year's", emoji: '🎆', months: [0, 1] },
  { value: 'valentines', label: "Valentine's Day", emoji: '💕', months: [1, 2] },
  { value: 'st-patricks', label: "St. Patrick's Day", emoji: '☘️', months: [2, 3] },
  { value: 'easter', label: 'Easter', emoji: '🐰', months: [3, 4] },
  { value: 'memorial', label: 'Memorial Day', emoji: '🇺🇸', months: [4, 5] },
  { value: 'independence', label: 'Independence Day', emoji: '🎇', months: [6, 7] },
  { value: 'labor', label: 'Labor Day', emoji: '👷', months: [8, 9] },
  { value: 'halloween', label: 'Halloween', emoji: '🎃', months: [9, 10] },
  { value: 'thanksgiving', label: 'Thanksgiving', emoji: '🦃', months: [10, 11] },
  { value: 'christmas', label: 'Christmas', emoji: '🎄', months: [11, 0] },
  { value: 'winter', label: 'Winter', emoji: '❄️', months: [11, 0, 1, 2] },
]

function DailyWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: DailyWidgetSettings
  onUpdate: (s: Partial<DailyWidgetSettings>) => void
}) {
  const toggleContent = (contentType: DailyContentType) => {
    const currentEnabled = settings.enabledContent || []
    const isEnabled = currentEnabled.includes(contentType)

    if (isEnabled) {
      // Don't allow disabling if it's the only one enabled
      if (currentEnabled.length <= 1) return
      onUpdate({ enabledContent: currentEnabled.filter(c => c !== contentType) })
    } else {
      onUpdate({ enabledContent: [...currentEnabled, contentType] })
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
        Content to Display
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Select which daily content to show in this widget. At least one must be enabled.
      </p>
      <div className="space-y-2">
        {DAILY_CONTENT_OPTIONS.map((option) => {
          const isEnabled = (settings.enabledContent || []).includes(option.value)
          const isOnlyOne = (settings.enabledContent || []).length === 1 && isEnabled

          return (
            <label
              key={option.value}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                isEnabled
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750',
                isOnlyOne && 'cursor-not-allowed opacity-70'
              )}
            >
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => toggleContent(option.value)}
                disabled={isOnlyOne}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className={cn(
                'text-sm font-medium',
                isEnabled ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'
              )}>
                {option.label}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function BitcoinMiningWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: BitcoinMiningWidgetSettings
  onUpdate: (s: Partial<BitcoinMiningWidgetSettings>) => void
}) {
  return (
    <>
      <Input
        label="Widget Name"
        value={settings.widgetName || ''}
        onChange={(e) => onUpdate({ widgetName: e.target.value })}
        placeholder="Bitcoin Mining"
      />
      <Input
        label="Bitcoin Wallet Address"
        value={settings.walletAddress || ''}
        onChange={(e) => onUpdate({ walletAddress: e.target.value })}
        placeholder="e.g., 3Lz1kdPGRqytQsPnz1md7dPqBxPjhXAuR1"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Enter your Bitcoin wallet address used on{' '}
        <a
          href="https://web.public-pool.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 dark:text-orange-400 hover:underline"
        >
          public-pool.io
        </a>
        . Your mining stats will be displayed in the widget.
      </p>
      <Input
        label="Refresh Interval (minutes)"
        type="number"
        value={settings.refreshInterval}
        onChange={(e) => onUpdate({ refreshInterval: parseInt(e.target.value) || 5 })}
        min={1}
        max={60}
      />
    </>
  )
}

// Recipe category options
const RECIPE_CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = [
  { value: 'all', label: 'All Recipes' },
  { value: 'appetizer', label: 'Appetizers' },
  { value: 'entree', label: 'Entrees' },
  { value: 'soup', label: 'Soups' },
  { value: 'salad', label: 'Salads' },
  { value: 'dessert', label: 'Desserts' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'snack', label: 'Snacks' },
  { value: 'side', label: 'Side Dishes' },
  { value: 'drink', label: 'Drinks' },
]

function RecipesWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: RecipesWidgetSettings
  onUpdate: (s: Partial<RecipesWidgetSettings>) => void
}) {
  return (
    <>
      <Input
        label="Widget Name"
        value={settings.widgetName || ''}
        onChange={(e) => onUpdate({ widgetName: e.target.value })}
        placeholder="Recipe Suggestions"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Number of Recipes"
          type="number"
          value={settings.recipeCount}
          onChange={(e) => onUpdate({ recipeCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)) })}
          min={1}
          max={10}
        />
        <Select
          label="Category"
          value={settings.category}
          onChange={(e) => onUpdate({ category: e.target.value as RecipeCategory })}
          options={RECIPE_CATEGORY_OPTIONS}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Recipes are sourced from{' '}
        <a
          href="https://getglyc.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:underline"
        >
          Glyc
        </a>
        , a low-glycemic recipe collection.
      </p>
      <Input
        label="Refresh Interval (minutes)"
        type="number"
        value={settings.refreshInterval}
        onChange={(e) => onUpdate({ refreshInterval: parseInt(e.target.value) || 60 })}
        min={5}
        max={1440}
      />
    </>
  )
}

// Background settings editor
function BackgroundSettingsEditor({
  background,
  onUpdate,
}: {
  background: BackgroundSettings | undefined
  onUpdate: (bg: BackgroundSettings) => void
}) {
  const currentType: BackgroundType = background?.type || 'none'

  const handleTypeChange = (type: BackgroundType) => {
    if (type === 'none') {
      onUpdate({ type: 'none' })
    } else if (type === 'color') {
      onUpdate({ type: 'color', color: background?.color || '#f1f5f9' })
    } else if (type === 'holiday') {
      onUpdate({ type: 'holiday', holiday: background?.holiday || 'christmas' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Background Type Selection */}
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-2">
          Background Type
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'none' as BackgroundType, label: 'Default' },
            { value: 'color' as BackgroundType, label: 'Solid Color' },
            { value: 'holiday' as BackgroundType, label: 'Holiday Theme' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              className={cn(
                'px-3 py-2 text-sm rounded-lg border transition-colors',
                currentType === option.value
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      {currentType === 'color' && (
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-2">
            Select Color
          </label>
          <div className="grid grid-cols-7 gap-2">
            {BACKGROUND_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onUpdate({ type: 'color', color: color.value })}
                className={cn(
                  'w-10 h-10 rounded-lg border-2 transition-all hover:scale-110',
                  background?.color === color.value
                    ? 'border-blue-500 ring-2 ring-blue-300'
                    : 'border-gray-300 dark:border-gray-600'
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
              >
                {background?.color === color.value && (
                  <span className={cn('text-lg', color.dark ? 'text-white' : 'text-gray-800')}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Light colors work best with light theme, dark colors with dark theme.
          </p>
        </div>
      )}

      {/* Holiday Theme Picker */}
      {currentType === 'holiday' && (
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-2">
            Select Holiday Theme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HOLIDAY_BACKGROUNDS.map((holiday) => (
              <button
                key={holiday.value}
                onClick={() => onUpdate({ type: 'holiday', holiday: holiday.value })}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2',
                  background?.holiday === holiday.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <span>{holiday.emoji}</span>
                <span>{holiday.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
