export type WidgetType = 'news' | 'weather' | 'calendar' | 'stocks' | 'lottery' | 'daily' | 'history'

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
  order: number // Display order (1 = top-left, reading left-to-right, top-to-bottom)
}

export type WidgetSettings = NewsWidgetSettings | WeatherWidgetSettings | CalendarWidgetSettings | StockWidgetSettings | LotteryWidgetSettings | DailyWidgetSettings | HistoryWidgetSettings

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

export interface StockWidgetSettings {
  widgetName: string
  symbols: string[] // Array of stock symbols (e.g., ['AAPL', 'GOOGL', 'MSFT'])
  refreshInterval: number // minutes
}

export interface LotteryWidgetSettings {
  refreshInterval: number // minutes
}

// Daily content types that can be enabled in the Daily widget
export type DailyContentType = 'quote' | 'joke' | 'word' | 'trivia'

// History widget has no settings
export interface HistoryWidgetSettings {
  // No settings - displays today's historical events
}

export interface DailyWidgetSettings {
  enabledContent: DailyContentType[]
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

// Stock types
export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  previousClose: number | null
  dayHigh: number | null
  dayLow: number | null
  volume: number | null
  marketState: string
  exchange: string | null
}

export interface StockResponse {
  quotes: StockQuote[]
  errors: string[]
  timestamp: string
}

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
  exchDisp: string
}

// Lottery types
export interface LotteryGame {
  name: string
  lastDrawDate: string | null
  winningNumbers: number[]
  specialBall: number
  specialBallName: string
  multiplier: number | null
  jackpot: string | null
  nextDrawing: string
  drawDays: string
}

export interface LotteryData {
  powerball: LotteryGame | null
  megaMillions: LotteryGame | null
  timestamp: string
}

// Quote types
export interface QuoteData {
  content: string
  author: string
  cachedAt: string
}

// Joke types
export interface JokeData {
  type: 'single' | 'twopart'
  joke?: string
  setup?: string
  punchline?: string
  category: string
  cachedAt: string
}

// Word of the Day types
export interface WordData {
  word: string
  definition: string
  partOfSpeech: string
  example?: string
  cachedAt: string
}

// This Day in History types
export interface HistoryEvent {
  year: string
  text: string
}

export interface HistoryData {
  events: HistoryEvent[]
  cachedAt: string
}

// Daily Trivia types
export interface TriviaData {
  question: string
  correctAnswer: string
  incorrectAnswers: string[]
  category: string
  difficulty: string
  cachedAt: string
}

// Combined Daily data (for the consolidated Daily widget)
export interface DailyData {
  quote?: QuoteData
  joke?: JokeData
  word?: WordData
  history?: HistoryData
  trivia?: TriviaData
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
