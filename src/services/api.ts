import type { ApiResponse, FeedResponse, WeatherData, CalendarEvent, PortalSettings, GeoLocation } from '@/types'

// Use relative path for subdirectory deployment - resolves to /portal/api/ in production
const API_BASE = import.meta.env.DEV ? '/api' : './api'

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
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

export async function saveSettings(settings: PortalSettings, pin: string): Promise<void> {
  const response = await fetchApi<ApiResponse<void>>('/settings/save.php', {
    method: 'POST',
    body: JSON.stringify({ settings, pin }),
  })
  if (!response.success) {
    throw new Error(response.error || 'Failed to save settings')
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const response = await fetchApi<ApiResponse<{ valid: boolean }>>('/settings/verify-pin.php', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
  return response.success && response.data?.valid === true
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
