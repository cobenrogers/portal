import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Lock, Unlock, Search, MapPin, Loader2 } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { getSettings, saveSettings, verifyPin, searchLocations } from '@/services/api'
import { generateId, cn } from '@/lib/utils'
import type {
  PortalSettings,
  WidgetConfig,
  WidgetType,
  NewsWidgetSettings,
  WeatherWidgetSettings,
  CalendarWidgetSettings,
  GeoLocation,
} from '@/types'

interface SettingsProps {
  onBack: () => void
  onSave: (settings: PortalSettings) => void
}

const WIDGET_TYPES: { value: WidgetType; label: string }[] = [
  { value: 'news', label: 'News Feed' },
  { value: 'weather', label: 'Weather' },
  { value: 'calendar', label: 'Calendar' },
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
  }
}

export function Settings({ onBack, onSave }: SettingsProps) {
  const [settings, setSettings] = useState<PortalSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

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

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    try {
      const valid = await verifyPin(pin)
      if (valid) {
        setIsAuthenticated(true)
      } else {
        setPinError('Invalid PIN')
      }
    } catch {
      setPinError('Failed to verify PIN')
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setError(null)

    try {
      await saveSettings(settings, pin)
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

    // Add to layout at a default position
    const newLayoutItem = { i: id, x: 0, y: Infinity, w: 3, h: 3 }

    setSettings({
      ...settings,
      dashboardLayout: {
        ...settings.dashboardLayout,
        layouts: {
          lg: [...settings.dashboardLayout.layouts.lg, newLayoutItem],
          md: [...settings.dashboardLayout.layouts.md, newLayoutItem],
          sm: [...settings.dashboardLayout.layouts.sm, newLayoutItem],
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Enter PIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter PIN to access settings"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                error={pinError || undefined}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Unlock
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold">Portal Settings</h1>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        )}

        {/* Auth status */}
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Unlock className="w-4 h-4" />
          Authenticated
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
              <p className="text-gray-500 text-sm text-center py-4">
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
    <div className="border rounded-lg p-4">
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
              widget.type === 'calendar' && 'bg-green-500'
            )}
          />
          <span className="font-medium">
            {widget.type === 'news'
              ? (widget.settings as NewsWidgetSettings).feedName
              : widget.type === 'weather'
              ? (widget.settings as WeatherWidgetSettings).location
              : (widget.settings as CalendarWidgetSettings).calendarName || 'Calendar'}
          </span>
          <span className="text-xs text-gray-500 uppercase">{widget.type}</span>
        </button>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
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
        <label className="text-sm font-medium">Preset Feeds</label>
        {FEED_CATEGORIES.map((category) => (
          <div key={category}>
            <p className="text-xs text-gray-500 mb-1">{category}</p>
            <div className="flex flex-wrap gap-1">
              {PRESET_FEEDS.filter((f) => f.category === category).map((feed) => (
                <button
                  key={feed.url}
                  onClick={() => onUpdate({ feedUrl: feed.url, feedName: feed.name })}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    settings.feedUrl === feed.url
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'hover:bg-gray-100'
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
        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <MapPin className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <span className="text-sm font-medium text-yellow-800">{settings.location}</span>
        </div>
      )}

      {/* Location Search */}
      <div ref={containerRef} className="relative">
        <label className="text-sm font-medium block mb-1">Search Location</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for a city..."
            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((location) => (
              <button
                key={location.id}
                onClick={() => selectLocation(location)}
                className="w-full px-4 py-3 text-left hover:bg-yellow-50 border-b last:border-b-0 flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">{location.name}</div>
                  <div className="text-xs text-gray-500">
                    {[location.admin1, location.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-sm text-gray-500 text-center">
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
      <label className="flex items-center gap-2">
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
