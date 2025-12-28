import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Cpu, Activity, Zap, Users, AlertTriangle } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchBitcoinMiningData } from '@/services/api'
import { cn } from '@/lib/utils'
import type { BitcoinMiningWidgetSettings, BitcoinMiningData, BitcoinMiningWorker } from '@/types'

const PUBLIC_POOL_URL = 'https://web.public-pool.io'

interface BitcoinMiningWidgetProps {
  settings: BitcoinMiningWidgetSettings
  onSettingsClick?: () => void
}

function WorkerRow({ worker }: { worker: BitcoinMiningWorker }) {
  return (
    <div className="grid grid-cols-2 gap-3 py-1.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          worker.isOnline ? 'bg-green-500' : 'bg-gray-400'
        )} />
        <div className="min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">
            {worker.name}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {worker.lastSeenAgo}
          </div>
        </div>
      </div>
      <div>
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
          {worker.hashrateFormatted}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400">
          Best: {worker.bestDifficulty.toFixed(2)}
        </div>
      </div>
    </div>
  )
}

function StatItem({ icon: Icon, label, value, className }: {
  icon: React.ElementType
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon className="w-4 h-4 text-orange-500" />
      <div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </div>
        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {value}
        </div>
      </div>
    </div>
  )
}

function ErrorDisplay({ error, walletAddress }: { error: string; walletAddress: string }) {
  const walletUrl = `${PUBLIC_POOL_URL}/${walletAddress}`

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <div className="font-medium mb-1">Unable to fetch mining data</div>
          <div className="text-amber-700 dark:text-amber-300">{error}</div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          View your mining stats directly on Public Pool:
        </p>
        <a
          href={walletUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-xs font-medium"
        >
          <span>Open Public Pool</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}

export function BitcoinMiningWidget({ settings, onSettingsClick }: BitcoinMiningWidgetProps) {
  const [data, setData] = useState<BitcoinMiningData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!settings.walletAddress) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchBitcoinMiningData(settings.walletAddress)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mining data')
    } finally {
      setIsLoading(false)
    }
  }, [settings.walletAddress])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, settings.refreshInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData, settings.refreshInterval])

  // Handle error state with custom display (don't pass to WidgetWrapper)
  const hasError = error && settings.walletAddress

  return (
    <WidgetWrapper
      title={settings.widgetName || 'Bitcoin Mining'}
      isLoading={isLoading}
      error={null} // Handle error ourselves
      onRefresh={loadData}
      onSettings={onSettingsClick}
    >
      {isLoading && !data && !error ? (
        <div className="space-y-3">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
          <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : !settings.walletAddress ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No wallet configured. Add a Bitcoin wallet address in settings.
        </div>
      ) : hasError ? (
        <ErrorDisplay error={error} walletAddress={settings.walletAddress} />
      ) : !data ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No mining data available
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <StatItem
              icon={Zap}
              label="Hashrate"
              value={data.totalHashrateFormatted}
            />
            <StatItem
              icon={Activity}
              label="Best Diff"
              value={data.bestDifficulty.toFixed(2)}
            />
          </div>

          {/* Workers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>Workers ({data.workersCount})</span>
              </div>
            </div>
            {data.workers.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-xs text-center py-2">
                No active workers
              </div>
            ) : (
              <div className="space-y-0">
                {data.workers.map((worker) => (
                  <WorkerRow key={worker.sessionId} worker={worker} />
                ))}
              </div>
            )}
          </div>

          {/* Pool Stats */}
          {data.pool && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Pool Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Miners:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                    {data.pool.totalMiners.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Block:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                    {data.pool.blockHeight.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* View on Public Pool Link */}
          <a
            href={data.poolUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:underline pt-1"
          >
            <span>View on Public Pool</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </WidgetWrapper>
  )
}
