import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchStockQuotes } from '@/services/api'
import { cn } from '@/lib/utils'
import type { StockWidgetSettings, StockQuote } from '@/types'

interface StockWidgetProps {
  settings: StockWidgetSettings
  onSettingsClick?: () => void
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function StockRow({ quote }: { quote: StockQuote }) {
  const isPositive = quote.change >= 0
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500'
  const bgColor = isPositive ? 'bg-green-500/20' : 'bg-red-500/20'

  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">
          {quote.symbol}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate" title={quote.name}>
          {quote.name.length > 18 ? quote.name.substring(0, 18) + '...' : quote.name}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Trend indicator */}
        <div className={cn('p-0.5 rounded', bgColor)}>
          {isPositive ? (
            <TrendingUp className={cn('w-3 h-3', changeColor)} />
          ) : (
            <TrendingDown className={cn('w-3 h-3', changeColor)} />
          )}
        </div>

        {/* Price and change */}
        <div className="text-right min-w-[70px]">
          <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
            {formatPrice(quote.price)}
          </div>
          <div className={cn('text-[10px] font-medium', changeColor)}>
            {isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}

export function StockWidget({ settings, onSettingsClick }: StockWidgetProps) {
  const [quotes, setQuotes] = useState<StockQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQuotes = useCallback(async () => {
    if (settings.symbols.length === 0) {
      setQuotes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchStockQuotes(settings.symbols)
      setQuotes(data.quotes)
      if (data.errors.length > 0) {
        console.warn('Failed to fetch some symbols:', data.errors)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes')
    } finally {
      setIsLoading(false)
    }
  }, [settings.symbols])

  useEffect(() => {
    loadQuotes()
    const interval = setInterval(loadQuotes, settings.refreshInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadQuotes, settings.refreshInterval])

  return (
    <WidgetWrapper
      title={settings.widgetName || 'Stocks'}
      isLoading={isLoading}
      error={error}
      onRefresh={loadQuotes}
      onSettings={onSettingsClick}
    >
      {isLoading && quotes.length === 0 ? (
        <div className="space-y-3">
          {[...Array(Math.min(4, settings.symbols.length || 4))].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-2">
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No stocks configured. Add symbols in settings.
        </div>
      ) : (
        <div className="space-y-0">
          {quotes.map((quote) => (
            <StockRow key={quote.symbol} quote={quote} />
          ))}
        </div>
      )}
    </WidgetWrapper>
  )
}
