import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchFeed, fetchWeather, getSettings, saveSettings } from './api'

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchFeed', () => {
    it('fetches and returns feed data', async () => {
      const mockFeedData = {
        items: [
          { id: '1', title: 'Test Article', link: 'https://example.com', source: 'Test' },
        ],
        lastUpdated: '2024-01-01T00:00:00Z',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockFeedData }),
      } as Response)

      const result = await fetchFeed('https://example.com/feed.xml')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/feeds/fetch.php?url=https%3A%2F%2Fexample.com%2Ffeed.xml'),
        expect.any(Object)
      )
      expect(result).toEqual(mockFeedData)
    })

    it('throws on error response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Feed not found' }),
      } as Response)

      await expect(fetchFeed('https://example.com/feed.xml')).rejects.toThrow('Feed not found')
    })

    it('throws on network error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response)

      await expect(fetchFeed('https://example.com/feed.xml')).rejects.toThrow()
    })
  })

  describe('fetchWeather', () => {
    it('fetches weather with default units', async () => {
      const mockWeather = {
        location: 'New York, US',
        temperature: 72,
        description: 'Sunny',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeather }),
      } as Response)

      const result = await fetchWeather('New York')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/feeds/weather.php?location=New%20York&units=imperial'),
        expect.any(Object)
      )
      expect(result).toEqual(mockWeather)
    })

    it('fetches weather with metric units', async () => {
      const mockWeather = {
        location: 'London, UK',
        temperature: 20,
        description: 'Cloudy',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWeather }),
      } as Response)

      await fetchWeather('London', 'metric')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/feeds/weather.php?location=London&units=metric'),
        expect.any(Object)
      )
    })
  })

  describe('getSettings', () => {
    it('fetches and returns settings', async () => {
      const mockSettings = {
        dashboardLayout: {
          layouts: { lg: [], md: [], sm: [] },
          widgets: [],
        },
        theme: 'light',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSettings }),
      } as Response)

      const result = await getSettings()

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/get.php'),
        expect.any(Object)
      )
      expect(result).toEqual(mockSettings)
    })
  })

  describe('saveSettings', () => {
    it('saves settings with session auth', async () => {
      const mockSettings = {
        dashboardLayout: {
          layouts: { lg: [], md: [], sm: [] },
          widgets: [],
        },
        theme: 'light' as const,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await saveSettings(mockSettings)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/save.php'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ settings: mockSettings }),
        })
      )
    })

    it('throws on unauthorized', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Not authenticated' }),
      } as Response)

      await expect(
        saveSettings({ dashboardLayout: { layouts: { lg: [], md: [], sm: [] }, widgets: [] }, theme: 'light' })
      ).rejects.toThrow()
    })
  })
})
