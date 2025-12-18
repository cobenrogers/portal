import { useState, useEffect, useCallback, useMemo } from 'react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchFeed } from '@/services/api'
import { truncateText } from '@/lib/utils'
import type { NewsWidgetSettings, FeedItem } from '@/types'

interface NewsWidgetProps {
  settings: NewsWidgetSettings
  onSettingsClick?: () => void
}

export function NewsWidget({ settings, onSettingsClick }: NewsWidgetProps) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFeed = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchFeed(settings.feedUrl)
      setItems(data.items.slice(0, settings.maxItems))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setIsLoading(false)
    }
  }, [settings.feedUrl, settings.maxItems])

  useEffect(() => {
    loadFeed()
    const interval = setInterval(loadFeed, settings.refreshInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadFeed, settings.refreshInterval])

  // Show 6 articles if no images, 4 if images are present (to fill whitespace)
  const displayItems = useMemo(() => {
    const hasImages = items.some(item => item.image && item.image !== 'undefined')
    const displayCount = hasImages ? 4 : 6
    return items.slice(0, displayCount)
  }, [items])

  return (
    <WidgetWrapper
      title={settings.feedName}
      isLoading={isLoading}
      error={error}
      onRefresh={loadFeed}
      onSettings={onSettingsClick}
    >
      {isLoading && items.length === 0 ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {displayItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-2"
              >
                {item.image && item.image !== 'undefined' ? (
                  <img
                    src={item.image}
                    alt=""
                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0">•</span>
                )}
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
                  {truncateText(item.title, 80)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </WidgetWrapper>
  )
}
