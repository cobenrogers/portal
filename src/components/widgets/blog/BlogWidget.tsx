import { useState, useEffect, useCallback, useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { FeedImage } from '@/components/common/FeedImage'
import { fetchFeed } from '@/services/api'
import { truncateText } from '@/lib/utils'
import type { BlogWidgetSettings, FeedItem } from '@/types'

interface BlogWidgetProps {
  settings: BlogWidgetSettings
  onSettingsClick?: () => void
}

function BlogArticle({ item }: { item: FeedItem }) {
  return (
    <li>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors"
      >
        <FeedImage
          src={item.image !== 'undefined' ? item.image : null}
          alt=""
          className="w-16 h-16 object-cover rounded flex-shrink-0"
          fallbackElement={
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          }
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight line-clamp-2">
            {truncateText(item.title, 100)}
          </h3>
          {item.pubDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date(item.pubDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
      </a>
    </li>
  )
}

export function BlogWidget({ settings, onSettingsClick }: BlogWidgetProps) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFeed = useCallback(async () => {
    if (!settings.feedUrl) {
      setItems([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchFeed(settings.feedUrl)
      setItems(data.items.slice(0, settings.maxArticles))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blog feed')
    } finally {
      setIsLoading(false)
    }
  }, [settings.feedUrl, settings.maxArticles])

  useEffect(() => {
    loadFeed()
    const interval = setInterval(loadFeed, settings.refreshInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadFeed, settings.refreshInterval])

  // Limit display based on whether images are present
  const displayItems = useMemo(() => {
    const hasImages = items.some(item => item.image && item.image !== 'undefined')
    // Show fewer items if images are present to avoid overflow
    const displayCount = hasImages ? Math.min(settings.maxArticles, 3) : settings.maxArticles
    return items.slice(0, displayCount)
  }, [items, settings.maxArticles])

  return (
    <WidgetWrapper
      title={settings.blogName || 'Blog'}
      isLoading={isLoading}
      error={error}
      onRefresh={loadFeed}
      onSettings={onSettingsClick}
    >
      {isLoading && items.length === 0 ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !settings.feedUrl ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No blog feed configured. Add a feed URL in settings.
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No articles found
        </div>
      ) : (
        <ul className="space-y-0">
          {displayItems.map((item) => (
            <BlogArticle key={item.id} item={item} />
          ))}
        </ul>
      )}
    </WidgetWrapper>
  )
}
