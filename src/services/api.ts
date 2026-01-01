import type { ApiResponse, FeedResponse, WeatherData, CalendarEvent, PortalSettings, GeoLocation, StockResponse, StockSearchResult, LotteryData, DailyData, DailyContentType, HistoryData, TriviaData, BitcoinMiningData, RecipesData } from '@/types'

// Use relative path for subdirectory deployment - resolves to /portal/api/ in production
const API_BASE = import.meta.env.DEV ? '/api' : './api'

// Add cache-busting parameter to prevent stale data on mobile and across devices
function addCacheBuster(endpoint: string): string {
  const separator = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${separator}_t=${Date.now()}`
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${addCacheBuster(endpoint)}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Feed API
export async function fetchFeed(feedUrl: string): Promise<FeedResponse> {
  const response = await fetchApi<ApiResponse<FeedResponse>>(
    `/feeds/fetch.php?url=${encodeURIComponent(feedUrl)}`
  )
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch feed')
  }
  return response.data
}

// Weather API
export async function fetchWeather(
  location: string,
  units: 'imperial' | 'metric' = 'imperial',
  latitude?: number,
  longitude?: number
): Promise<WeatherData> {
  let url = `/feeds/weather.php?location=${encodeURIComponent(location)}&units=${units}`
  if (latitude !== undefined && longitude !== undefined) {
    url += `&lat=${latitude}&lon=${longitude}`
  }
  const response = await fetchApi<ApiResponse<WeatherData>>(url)
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch weather')
  }
  return response.data
}

// Calendar API
export async function fetchCalendarEvents(
  calendarUrl: string,
  daysToShow: number = 7
): Promise<CalendarEvent[]> {
  const response = await fetchApi<ApiResponse<CalendarEvent[]>>(
    `/feeds/calendar.php?url=${encodeURIComponent(calendarUrl)}&days=${daysToShow}`
  )
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch calendar')
  }
  return response.data
}

// Settings API
export async function getSettings(): Promise<PortalSettings> {
  const response = await fetchApi<ApiResponse<PortalSettings>>('/settings/get.php')
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get settings')
  }
  return response.data
}

export async function saveSettings(settings: PortalSettings): Promise<void> {
  const response = await fetch(`${API_BASE}${addCacheBuster('/settings/save.php')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include session cookie for auth
    body: JSON.stringify({ settings }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to save settings')
  }
}

// Geocoding API
export async function searchLocations(query: string): Promise<GeoLocation[]> {
  if (!query.trim()) return []
  const response = await fetchApi<ApiResponse<GeoLocation[]>>(
    `/feeds/geocode.php?q=${encodeURIComponent(query)}`
  )
  if (!response.success) {
    throw new Error(response.error || 'Failed to search locations')
  }
  return response.data || []
}

// Stock API
export async function fetchStockQuotes(symbols: string[]): Promise<StockResponse> {
  if (symbols.length === 0) {
    return { quotes: [], errors: [], timestamp: new Date().toISOString() }
  }
  const response = await fetchApi<ApiResponse<StockResponse>>(
    `/feeds/stocks.php?symbols=${encodeURIComponent(symbols.join(','))}`
  )
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch stock quotes')
  }
  return response.data
}

// Stock Search API
export async function searchStockSymbols(query: string): Promise<StockSearchResult[]> {
  if (!query.trim()) return []
  const response = await fetchApi<ApiResponse<StockSearchResult[]>>(
    `/feeds/stock-search.php?q=${encodeURIComponent(query)}`
  )
  if (!response.success) {
    throw new Error(response.error || 'Failed to search stocks')
  }
  return response.data || []
}

// Lottery API
export async function fetchLotteryData(): Promise<LotteryData> {
  const response = await fetchApi<ApiResponse<LotteryData>>('/feeds/lottery.php')
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch lottery data')
  }
  return response.data
}

// Daily Content API (consolidated quote/joke/word/trivia)
export async function fetchDailyContent(contentTypes: DailyContentType[]): Promise<DailyData> {
  const response = await fetchApi<ApiResponse<DailyData>>(
    `/feeds/daily.php?content=${encodeURIComponent(contentTypes.join(','))}`
  )
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch daily content')
  }
  return response.data
}

// History API (This Day in History)
export async function fetchHistoryData(): Promise<HistoryData> {
  const response = await fetchApi<ApiResponse<{ history: HistoryData }>>(
    '/feeds/daily.php?content=history'
  )
  if (!response.success || !response.data?.history) {
    throw new Error(response.error || 'Failed to fetch history data')
  }
  return response.data.history
}

// Trivia API (Daily Trivia)
export async function fetchTriviaData(): Promise<TriviaData> {
  const response = await fetchApi<ApiResponse<{ trivia: TriviaData }>>(
    '/feeds/daily.php?content=trivia'
  )
  if (!response.success || !response.data?.trivia) {
    throw new Error(response.error || 'Failed to fetch trivia data')
  }
  return response.data.trivia
}

// Bitcoin Mining API (public-pool.io) - Direct frontend fetch
const PUBLIC_POOL_API = 'https://public-pool.io:40557/api'
const PUBLIC_POOL_WEB = 'https://web.public-pool.io/#/app'

// Raw API response types from public-pool.io
interface PublicPoolNetworkResponse {
  blocks: number
  currentblockweight: number
  currentblocktx: number
  difficulty: number
  networkhashps: number
  pooledtx: number
  chain: string
  warnings?: string[]
}

interface PublicPoolWorker {
  sessionId: string
  name: string
  bestDifficulty: string
  hashRate: string
  startTime: string
  lastSeen: string
}

interface PublicPoolClientResponse {
  bestDifficulty: string
  workersCount: number
  workers: PublicPoolWorker[]
}

// Utility: Format hashrate to human-readable string
function formatHashrate(hashrate: number): string {
  if (hashrate >= 1e15) return `${(hashrate / 1e15).toFixed(2)} PH/s`
  if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`
  if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`
  if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`
  if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`
  return `${hashrate.toFixed(2)} H/s`
}

// Utility: Calculate "time ago" string
function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// Utility: Check if worker is online (seen within last 5 minutes)
function isWorkerOnline(lastSeen: string): boolean {
  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  const diffMs = now.getTime() - lastSeenDate.getTime()
  return diffMs < 5 * 60 * 1000 // 5 minutes
}

// Utility: Shorten wallet address for display
function shortenWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

export async function fetchBitcoinMiningData(walletAddress: string): Promise<BitcoinMiningData> {
  if (!walletAddress.trim()) {
    throw new Error('Wallet address is required')
  }

  // Fetch both endpoints in parallel
  const [clientResponse, networkResponse] = await Promise.all([
    fetch(`${PUBLIC_POOL_API}/client/${encodeURIComponent(walletAddress)}`),
    fetch(`${PUBLIC_POOL_API}/network`)
  ])

  if (!clientResponse.ok) {
    if (clientResponse.status === 404) {
      throw new Error('Wallet not found on Public Pool')
    }
    throw new Error(`Failed to fetch mining data: ${clientResponse.status}`)
  }

  const clientData: PublicPoolClientResponse = await clientResponse.json()

  // Network data is optional (for pool stats)
  let networkData: PublicPoolNetworkResponse | null = null
  if (networkResponse.ok) {
    networkData = await networkResponse.json()
  }

  // Transform workers
  const workers = clientData.workers.map(worker => {
    const hashrate = parseFloat(worker.hashRate) || 0
    return {
      name: worker.name,
      sessionId: worker.sessionId,
      hashrate,
      hashrateFormatted: formatHashrate(hashrate),
      bestDifficulty: parseFloat(worker.bestDifficulty) || 0,
      startTime: worker.startTime,
      lastSeen: worker.lastSeen,
      lastSeenAgo: getTimeAgo(worker.lastSeen),
      isOnline: isWorkerOnline(worker.lastSeen)
    }
  })

  // Calculate total hashrate
  const totalHashrate = workers.reduce((sum, w) => sum + w.hashrate, 0)

  // Build the response
  const result: BitcoinMiningData = {
    wallet: walletAddress,
    walletShort: shortenWallet(walletAddress),
    bestDifficulty: parseFloat(clientData.bestDifficulty) || 0,
    workersCount: clientData.workersCount,
    totalHashrate,
    totalHashrateFormatted: formatHashrate(totalHashrate),
    workers,
    poolUrl: `${PUBLIC_POOL_WEB}/${walletAddress}`
  }

  // Add pool stats if network data available
  if (networkData) {
    result.pool = {
      totalHashrate: networkData.networkhashps,
      totalHashrateFormatted: formatHashrate(networkData.networkhashps),
      totalMiners: 0, // Not available from this endpoint
      blockHeight: networkData.blocks,
      fee: 0 // Not available from this endpoint
    }
  }

  return result
}

// Image Proxy API - Bypasses hotlink protection for feed images
export function getProxiedImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return ''
  }
  return `${API_BASE}/feeds/image-proxy.php?url=${encodeURIComponent(imageUrl)}`
}

// Recipe Suggestions API (Glyc - getglyc.com)
export async function fetchRecipeSuggestions(
  count: number = 3,
  category: string = ''
): Promise<RecipesData> {
  let url = `/feeds/recipes.php?count=${count}`
  if (category && category !== 'all') {
    url += `&category=${encodeURIComponent(category)}`
  }
  const response = await fetchApi<ApiResponse<RecipesData>>(url)
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch recipes')
  }
  return response.data
}
