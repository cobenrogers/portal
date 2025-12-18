export type WidgetType = 'news' | 'weather' | 'calendar'

// Layout item type (replaces react-grid-layout Layout)
export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  settings: WidgetSettings
}

export type WidgetSettings = NewsWidgetSettings | WeatherWidgetSettings | CalendarWidgetSettings

export interface NewsWidgetSettings {
  feedUrl: string
  feedName: string
  maxItems: number
  refreshInterval: number // minutes
}

export interface WeatherWidgetSettings {
  location: string
  latitude?: number
  longitude?: number
  units: 'imperial' | 'metric'
  showForecast: boolean
}

export interface CalendarWidgetSettings {
  calendarName: string
  calendarUrl?: string // iCal URL
  daysToShow: number
}

export interface DashboardLayout {
  layouts: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] }
  widgets: WidgetConfig[]
}

export interface PortalSettings {
  dashboardLayout: DashboardLayout
  theme: 'light' | 'dark' | 'system'
}

// Feed types
export interface FeedItem {
  id: string
  title: string
  link: string
  description?: string
  pubDate?: string
  source: string
  image?: string | null
}

export interface FeedResponse {
  items: FeedItem[]
  lastUpdated: string
  error?: string
}

// Weather types
export interface WeatherData {
  location: string
  temperature: number
  feelsLike: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  forecast?: WeatherForecast[]
}

export interface WeatherForecast {
  date: string
  high: number
  low: number
  description: string
  icon: string
}

// Calendar types
export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay: boolean
  location?: string
}

// Geolocation types
export interface GeoLocation {
  id: number
  name: string
  displayName: string
  latitude: number
  longitude: number
  country: string
  admin1: string // State/Province
  admin2: string // County
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
