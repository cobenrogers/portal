// News category widget types
export type NewsCategory = 'news-top' | 'news-business' | 'news-tech' | 'news-world' | 'news-sports' | 'news-entertainment' | 'news-custom'

export type WidgetType = 'news' | 'weather' | 'calendar' | 'stocks' | 'lottery' | 'daily' | 'history' | 'trivia' | 'bitcoin-mining' | 'recipes' | 'blog' | NewsCategory

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

export type WidgetSettings = NewsWidgetSettings | NewsCategoryWidgetSettings | WeatherWidgetSettings | CalendarWidgetSettings | StockWidgetSettings | LotteryWidgetSettings | DailyWidgetSettings | HistoryWidgetSettings | TriviaWidgetSettings | BitcoinMiningWidgetSettings | RecipesWidgetSettings | BlogWidgetSettings

// Legacy news widget settings (for backwards compatibility)
export interface NewsWidgetSettings {
  feedUrl: string
  feedName: string
  maxItems: number
  refreshInterval: number // minutes
}

// News category widget settings - used by news-top, news-business, etc.
export interface NewsCategoryWidgetSettings {
  feedUrl: string      // The selected preset feed URL or custom URL
  feedName: string     // Display name for the feed
  maxItems: number     // Max items to display
  refreshInterval: number // minutes
}

export interface WeatherWidgetSettings {
  location: string
  latitude?: number
  longitude?: number
  units: 'imperial' | 'metric'
  showForecast: boolean
}

// Calendar source with color coding
export interface CalendarSource {
  id: string
  name: string
  url: string
  color: CalendarColor
}

// Available colors for calendar sources
export type CalendarColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'pink'

export interface CalendarWidgetSettings {
  calendarName: string
  // Legacy single calendar support (for backwards compatibility)
  calendarUrl?: string
  // New multi-calendar support (1-3 calendars)
  calendars?: CalendarSource[]
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
// Note: 'trivia' was removed - now has its own standalone TriviaWidget
export type DailyContentType = 'quote' | 'joke' | 'word'

// History widget has no settings
export interface HistoryWidgetSettings {
  // No settings - displays today's historical events
}

// Trivia widget has no settings
export interface TriviaWidgetSettings {
  // No settings - displays daily trivia question
}

// Bitcoin mining widget settings
export interface BitcoinMiningWidgetSettings {
  walletAddress: string  // Bitcoin wallet address for public-pool.io
  widgetName?: string    // Optional custom name for the widget
  refreshInterval: number // minutes
}

// Recipe category types for filtering
export type RecipeCategory = 'all' | 'appetizer' | 'entree' | 'soup' | 'salad' | 'dessert' | 'breakfast' | 'snack' | 'side' | 'drink'

// Recipe suggestions widget settings
export interface RecipesWidgetSettings {
  widgetName?: string    // Optional custom name for the widget
  recipeCount: number    // Number of recipes to display (1-10)
  category: RecipeCategory // Recipe category filter
  refreshInterval: number // minutes
}

// Blog widget settings
export interface BlogWidgetSettings {
  blogName: string       // Display name for the blog
  feedUrl: string        // RSS feed URL
  maxArticles: number    // Number of articles to display (1-10)
  refreshInterval: number // minutes
}

export interface DailyWidgetSettings {
  enabledContent: DailyContentType[]
}

export interface DashboardLayout {
  layouts: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] }
  widgets: WidgetConfig[]
}

// Background types
export type BackgroundType = 'color' | 'holiday' | 'none'

export type HolidayBackground =
  | 'new-years'
  | 'valentines'
  | 'st-patricks'
  | 'easter'
  | 'memorial'
  | 'independence'
  | 'labor'
  | 'halloween'
  | 'thanksgiving'
  | 'christmas'
  | 'winter'

export interface BackgroundSettings {
  type: BackgroundType
  color?: string // Hex color for 'color' type
  holiday?: HolidayBackground // Holiday theme for 'holiday' type
}

export interface PortalSettings {
  dashboardLayout: DashboardLayout
  theme: 'light' | 'dark' | 'system'
  background?: BackgroundSettings
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
  // Multi-calendar support - which calendar this event came from
  sourceId?: string
  sourceColor?: CalendarColor
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

// Bitcoin Mining types (public-pool.io)
export interface BitcoinMiningWorker {
  name: string
  sessionId: string
  hashrate: number
  hashrateFormatted: string
  bestDifficulty: number
  startTime: string | null
  lastSeen: string | null
  lastSeenAgo: string
  isOnline: boolean
}

export interface BitcoinMiningPoolStats {
  totalHashrate: number
  totalHashrateFormatted: string
  totalMiners: number
  blockHeight: number
  fee: number
}

export interface BitcoinMiningData {
  wallet: string
  walletShort: string
  bestDifficulty: number
  workersCount: number
  totalHashrate: number
  totalHashrateFormatted: string
  workers: BitcoinMiningWorker[]
  poolUrl: string
  pool?: BitcoinMiningPoolStats
}

// Recipe Suggestions types (from Glyc API)
export interface RecipeSuggestion {
  id: number
  title: string
  url: string
  sourceUrl: string | null
}

export interface RecipesData {
  recipes: RecipeSuggestion[]
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
