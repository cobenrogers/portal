import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Unlock, Search, MapPin, Loader2, GripVertical } from 'lucide-react'
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
  WeatherWidgetSettings,
  CalendarWidgetSettings,
  StockWidgetSettings,
  GeoLocation,
  StockSearchResult,
} from '@/types'

interface SettingsProps {
  onBack: () => void
  onSave: (settings: PortalSettings) => void
}

const WIDGET_TYPES: { value: WidgetType; label: string }[] = [
  { value: 'news', label: 'News Feed' },
  { value: 'weather', label: 'Weather' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'stocks', label: 'Stock Ticker' },
]

const PRESET_FEEDS = [
  // Top US News
  // Note: CNN's own RSS feeds are abandoned (stale 2023 content), so we use Google News
  { name: 'CNN (via Google News)', url: 'https://news.google.com/rss/search?q=site:cnn.com&hl=en-US&gl=US&ceid=US:en', category: 'Top News' },
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'Top News' },
  { name: 'New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', category: 'Top News' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'Top News' },
  { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories', category: 'Top News' },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main', category: 'Top News' },
  { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news', category: 'Top News' },
  { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml', category: 'Top News' },
  { name: 'Politico', url: 'https://www.politico.com/rss/politicopicks.xml', category: 'Top News' },
  { name: 'LA Times', url: 'https://www.latimes.com/local/rss2.0.xml', category: 'Top News' },
  { name: 'Time', url: 'https://time.com/feed/', category: 'Top News' },
  // Business
  { name: 'CNBC Top News', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', category: 'Business' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Business' },
  { name: 'Wall Street Journal', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'Business' },
  { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Business' },
  // Technology
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Technology' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Technology' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'Technology' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'Technology' },
  // World
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
  // Sports
  { name: 'ESPN Top Headlines', url: 'https://www.espn.com/espn/rss/news', category: 'Sports' },
  // Entertainment
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'Entertainment' },
]

function getDefaultWidgetSettings(type: WidgetType): WidgetConfig['settings'] {
  switch (type) {
    case 'news':
      return {
        feedUrl: PRESET_FEEDS[0].url,
        feedName: PRESET_FEEDS[0].name,
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
  }
}

export function Settings({ onBack, onSave }: SettingsProps) {
  const { isAuthenticated, isApproved, user } = useAuth()
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Apply theme (needed since Settings page renders independently)
  useTheme(settings?.theme ?? 'light')

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
    const newWidget: WidgetConfig = {
      id,
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      settings: getDefaultWidgetSettings(type),
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

  const removeWidget = useCallback((widgetId: string) => {
    if (!settings) return

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts: {
          lg: settings.dashboardLayout.layouts.lg.filter((l) => l.i !== widgetId),
          md: settings.dashboardLayout.layouts.md.filter((l) => l.i !== widgetId),
          sm: settings.dashboardLayout.layouts.sm.filter((l) => l.i !== widgetId),
        },
        widgets: settings.dashboardLayout.widgets.filter((w) => w.id !== widgetId),
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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

        {/* Add Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Add Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {WIDGET_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant="outline"
                  size="sm"
                  onClick={() => addWidget(type.value)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {type.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Widget List */}
        <Card>
          <CardHeader>
            <CardTitle>Widgets ({settings?.dashboardLayout.widgets.length || 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings?.dashboardLayout.widgets.map((widget) => (
              <WidgetEditor
                key={widget.id}
                widget={widget}
                onUpdate={(newSettings) => updateWidgetSettings(widget.id, newSettings)}
                onRemove={() => removeWidget(widget.id)}
              />
            ))}
            {settings?.dashboardLayout.widgets.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No widgets configured. Add one above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function WidgetEditor({
  widget,
  onUpdate,
  onRemove,
}: {
  widget: WidgetConfig
  onUpdate: (settings: Partial<WidgetConfig['settings']>) => void
  onRemove: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              widget.type === 'news' && 'bg-blue-500',
              widget.type === 'weather' && 'bg-yellow-500',
              widget.type === 'calendar' && 'bg-green-500',
              widget.type === 'stocks' && 'bg-purple-500'
            )}
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {widget.type === 'news'
              ? (widget.settings as NewsWidgetSettings).feedName
              : widget.type === 'weather'
              ? (widget.settings as WeatherWidgetSettings).location
              : widget.type === 'calendar'
              ? (widget.settings as CalendarWidgetSettings).calendarName || 'Calendar'
              : (widget.settings as StockWidgetSettings).widgetName || 'Stocks'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{widget.type}</span>
        </button>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 dark:text-red-400">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
          {widget.type === 'news' && (
            <NewsWidgetEditor
              settings={widget.settings as NewsWidgetSettings}
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
        </div>
      )}
    </div>
  )
}

// Group feeds by category
const FEED_CATEGORIES = [...new Set(PRESET_FEEDS.map((f) => f.category))]

function NewsWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: NewsWidgetSettings
  onUpdate: (s: Partial<NewsWidgetSettings>) => void
}) {
  return (
    <>
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Preset Feeds</label>
        {FEED_CATEGORIES.map((category) => (
          <div key={category}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{category}</p>
            <div className="flex flex-wrap gap-1">
              {PRESET_FEEDS.filter((f) => f.category === category).map((feed) => (
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

function CalendarWidgetEditor({
  settings,
  onUpdate,
}: {
  settings: CalendarWidgetSettings
  onUpdate: (s: Partial<CalendarWidgetSettings>) => void
}) {
  return (
    <>
      <Input
        label="Calendar Name"
        value={settings.calendarName || ''}
        onChange={(e) => onUpdate({ calendarName: e.target.value })}
        placeholder="e.g., Work, Personal, Family"
      />
      <Input
        label="iCal URL"
        value={settings.calendarUrl || ''}
        onChange={(e) => onUpdate({ calendarUrl: e.target.value })}
        placeholder="https://calendar.google.com/calendar/ical/..."
      />
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
