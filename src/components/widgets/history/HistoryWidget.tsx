import { useState, useEffect, useCallback } from 'react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchHistoryData } from '@/services/api'
import type { HistoryData } from '@/types'

interface HistoryWidgetProps {
  onSettingsClick?: () => void
}

export function HistoryWidget({ onSettingsClick }: HistoryWidgetProps) {
  const [data, setData] = useState<HistoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchHistoryData()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <WidgetWrapper
      title={`This Day in History`}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onSettings={onSettingsClick}
    >
      {isLoading && !data ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        </div>
      ) : !data || data.events.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No historical events available.
        </div>
      ) : (
        <div className="space-y-2 py-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {todayFormatted}
          </div>
          <div className="space-y-2">
            {data.events.map((event, idx) => (
              <div
                key={idx}
                className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {event.year}:
                </span>{' '}
                {event.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetWrapper>
  )
}
