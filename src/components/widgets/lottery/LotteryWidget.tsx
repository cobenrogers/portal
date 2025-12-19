import { useState, useEffect, useCallback } from 'react'
import { Ticket, Calendar } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchLotteryData } from '@/services/api'
import { cn } from '@/lib/utils'
import type { LotteryWidgetSettings, LotteryGame } from '@/types'

interface LotteryWidgetProps {
  settings: LotteryWidgetSettings
  onSettingsClick?: () => void
}

function LotteryBall({ number, isSpecial = false, label }: { number: number; isSpecial?: boolean; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
          isSpecial
            ? 'bg-red-500 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600'
        )}
      >
        {number}
      </div>
      {label && (
        <span className="text-[8px] text-gray-500 dark:text-gray-400 leading-none">{label}</span>
      )}
    </div>
  )
}

function GameSection({ game }: { game: LotteryGame }) {
  const isPowerball = game.name === 'Powerball'
  const bgGradient = isPowerball
    ? 'bg-gradient-to-r from-red-600 to-red-700'
    : 'bg-gradient-to-r from-yellow-500 to-yellow-600'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header with game name and jackpot */}
      <div className={cn('px-2 py-1 text-white', bgGradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Ticket className="w-3 h-3" />
            <span className="font-bold text-xs">{game.name}</span>
          </div>
          {game.jackpot && (
            <span className="font-bold text-xs">{game.jackpot}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-2 py-1.5 space-y-1 bg-gray-50 dark:bg-gray-800/50">
        {/* Last drawing info */}
        <div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
            Last Drawing: {game.lastDrawDate}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {game.winningNumbers.map((num, idx) => (
              <LotteryBall key={idx} number={num} />
            ))}
            <LotteryBall
              number={game.specialBall}
              isSpecial
              label={game.specialBallName}
            />
            {game.multiplier && (
              <div className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-semibold">
                {game.multiplier}x
              </div>
            )}
          </div>
        </div>

        {/* Next drawing */}
        <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-300 pt-1 border-t border-gray-200 dark:border-gray-700">
          <Calendar className="w-3 h-3" />
          <span>Next: <span className="font-medium">{game.nextDrawing}</span></span>
          <span className="text-gray-400 dark:text-gray-500">({game.drawDays})</span>
        </div>
      </div>
    </div>
  )
}

export function LotteryWidget({ settings, onSettingsClick }: LotteryWidgetProps) {
  const [powerball, setPowerball] = useState<LotteryGame | null>(null)
  const [megaMillions, setMegaMillions] = useState<LotteryGame | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchLotteryData()
      setPowerball(data.powerball)
      setMegaMillions(data.megaMillions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lottery data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    // Refresh based on settings (default to 60 minutes since lottery data doesn't change often)
    const interval = setInterval(loadData, (settings.refreshInterval || 60) * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData, settings.refreshInterval])

  return (
    <WidgetWrapper
      title="Lottery"
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onSettings={onSettingsClick}
    >
      {isLoading && !powerball && !megaMillions ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-b-lg space-y-1">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  ))}
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : !powerball && !megaMillions ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs text-center py-2">
          No lottery data available.
        </div>
      ) : (
        <div className="space-y-2">
          {powerball && <GameSection game={powerball} />}
          {megaMillions && <GameSection game={megaMillions} />}
        </div>
      )}
    </WidgetWrapper>
  )
}
