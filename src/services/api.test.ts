import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchFeed, fetchWeather, getSettings, saveSettings, getProxiedImageUrl, fetchBitcoinMiningData } from './api'

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

  describe('getProxiedImageUrl', () => {
    it('returns empty string for null input', () => {
      const result = getProxiedImageUrl(null)
      expect(result).toBe('')
    })

    it('returns empty string for undefined input', () => {
      const result = getProxiedImageUrl(undefined)
      expect(result).toBe('')
    })

    it('returns empty string for empty string input', () => {
      const result = getProxiedImageUrl('')
      expect(result).toBe('')
    })

    it('returns proxied URL for valid image URL', () => {
      const imageUrl = 'https://example.com/image.jpg'
      const result = getProxiedImageUrl(imageUrl)
      expect(result).toContain('/api/feeds/image-proxy.php?url=')
      expect(result).toContain(encodeURIComponent(imageUrl))
    })

    it('properly encodes special characters in URL', () => {
      const imageUrl = 'https://example.com/image.jpg?size=large&format=webp'
      const result = getProxiedImageUrl(imageUrl)
      expect(result).toContain(encodeURIComponent(imageUrl))
    })

    it('handles URLs with spaces and unicode characters', () => {
      const imageUrl = 'https://example.com/my image.jpg'
      const result = getProxiedImageUrl(imageUrl)
      expect(result).toContain(encodeURIComponent(imageUrl))
    })
  })

  describe('fetchBitcoinMiningData', () => {
    it('throws error for empty wallet address', async () => {
      await expect(fetchBitcoinMiningData('')).rejects.toThrow('Wallet address is required')
      await expect(fetchBitcoinMiningData('   ')).rejects.toThrow('Wallet address is required')
    })

    it('fetches and transforms mining data correctly', async () => {
      const mockClientData = {
        bestDifficulty: '828.54',
        workersCount: 1,
        workers: [{
          sessionId: 'abc123',
          name: 'miner1',
          bestDifficulty: '2.33',
          hashRate: '1000000',
          startTime: '2024-01-01T00:00:00Z',
          lastSeen: new Date().toISOString() // Current time = online
        }]
      }

      const mockNetworkData = {
        blocks: 930480,
        currentblockweight: 1286193,
        currentblocktx: 1205,
        difficulty: 148258433855481.3,
        networkhashps: 1.154466466352633e21,
        pooledtx: 34,
        chain: 'main'
      }

      // Mock both API calls
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClientData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNetworkData,
        } as Response)

      const result = await fetchBitcoinMiningData('testWallet123')

      expect(result.wallet).toBe('testWallet123')
      expect(result.bestDifficulty).toBe(828.54)
      expect(result.workersCount).toBe(1)
      expect(result.workers).toHaveLength(1)
      expect(result.workers[0].name).toBe('miner1')
      expect(result.workers[0].hashrate).toBe(1000000)
      expect(result.workers[0].hashrateFormatted).toBe('1.00 MH/s')
      expect(result.workers[0].isOnline).toBe(true)
      expect(result.pool?.blockHeight).toBe(930480)
      expect(result.poolUrl).toContain('testWallet123')
    })

    it('handles 404 error for unknown wallet', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response)

      await expect(fetchBitcoinMiningData('unknownWallet')).rejects.toThrow('Wallet not found on Public Pool')
    })

    it('handles network data fetch failure gracefully', async () => {
      const mockClientData = {
        bestDifficulty: '100',
        workersCount: 0,
        workers: []
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClientData,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({}),
        } as Response)

      const result = await fetchBitcoinMiningData('testWallet')

      // Should still work, just without pool stats
      expect(result.wallet).toBe('testWallet')
      expect(result.pool).toBeUndefined()
    })
  })
})
