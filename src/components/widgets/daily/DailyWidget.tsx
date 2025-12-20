import { useState, useEffect, useCallback } from 'react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchDailyContent } from '@/services/api'
import type { DailyWidgetSettings, DailyData, TriviaData, DailyContentType } from '@/types'

interface DailyWidgetProps {
  settings: DailyWidgetSettings
  onSettingsClick?: () => void
}

// Helper component for consistent section styling
function ContentSection({ children, showBorder }: { children: React.ReactNode; showBorder: boolean }) {
  return (
    <div className={showBorder ? 'pb-2 border-b border-gray-200 dark:border-gray-700' : ''}>
      <div className="flex gap-1.5">
        {children}
      </div>
    </div>
  )
}

// Label component
function ContentLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
      {children}
    </span>
  )
}

// Trivia question with reveal functionality
function TriviaQuestion({ trivia }: { trivia: TriviaData }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
      <div className="mb-1">{trivia.question}</div>
      {revealed ? (
        <div className="font-medium text-green-600 dark:text-green-400">
          Answer: {trivia.correctAnswer}
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Reveal Answer
        </button>
      )}
    </div>
  )
}

export function DailyWidget({ settings, onSettingsClick }: DailyWidgetProps) {
  const [data, setData] = useState<DailyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!settings.enabledContent || settings.enabledContent.length === 0) {
      setError('No content types selected')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchDailyContent(settings.enabledContent)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily content')
    } finally {
      setIsLoading(false)
    }
  }, [settings.enabledContent])

  useEffect(() => {
    loadData()
  }, [loadData])

  const contentCount = settings.enabledContent?.length || 0

  // Order of content types for determining borders
  const contentOrder: DailyContentType[] = ['quote', 'joke', 'word', 'history', 'trivia']

  // Check if a content type is the last enabled one (no border needed after it)
  const isLastEnabled = (type: DailyContentType): boolean => {
    const enabledTypes = settings.enabledContent?.filter(t => contentOrder.includes(t)) || []
    const lastEnabled = enabledTypes.sort((a, b) =>
      contentOrder.indexOf(b) - contentOrder.indexOf(a)
    )[0]
    return type === lastEnabled
  }

  return (
    <WidgetWrapper
      title="The Daily Widget"
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onSettings={onSettingsClick}
    >
      {isLoading && !data ? (
        <div className="animate-pulse space-y-3 py-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        </div>
      ) : !data ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No daily content available.
        </div>
      ) : (
        <div className="space-y-2 py-1">
          {/* Quote Section */}
          {settings.enabledContent?.includes('quote') && data.quote && (
            <ContentSection showBorder={contentCount > 1}>
              <ContentLabel>Quote of the Day:</ContentLabel>
              <blockquote className="text-gray-700 dark:text-gray-300 text-xs italic leading-relaxed">
                "{data.quote.content}" — {data.quote.author}
              </blockquote>
            </ContentSection>
          )}

          {/* Joke Section */}
          {settings.enabledContent?.includes('joke') && data.joke && (
            <ContentSection showBorder={contentCount > 1 && !isLastEnabled('joke')}>
              <ContentLabel>Joke of the Day:</ContentLabel>
              <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                {data.joke.type === 'single' ? (
                  data.joke.joke
                ) : (
                  <span>{data.joke.setup} <span className="font-medium text-gray-900 dark:text-gray-100">{data.joke.punchline}</span></span>
                )}
              </div>
            </ContentSection>
          )}

          {/* Word of the Day Section */}
          {settings.enabledContent?.includes('word') && data.word && (
            <ContentSection showBorder={contentCount > 1 && !isLastEnabled('word')}>
              <ContentLabel>Word of the Day:</ContentLabel>
              <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{data.word.word}</span>
                <span className="text-gray-500 dark:text-gray-400 italic ml-1">({data.word.partOfSpeech})</span>
                <span className="mx-1">—</span>
                {data.word.definition}
              </div>
            </ContentSection>
          )}

          {/* This Day in History Section */}
          {settings.enabledContent?.includes('history') && data.history && (
            <ContentSection showBorder={contentCount > 1 && !isLastEnabled('history')}>
              <ContentLabel>This Day in History:</ContentLabel>
              <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed space-y-0.5">
                {data.history.events.map((event, idx) => (
                  <div key={idx}>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{event.year}:</span> {event.text}
                  </div>
                ))}
              </div>
            </ContentSection>
          )}

          {/* Daily Trivia Section */}
          {settings.enabledContent?.includes('trivia') && data.trivia && (
            <ContentSection showBorder={false}>
              <ContentLabel>Daily Trivia:</ContentLabel>
              <TriviaQuestion trivia={data.trivia} />
            </ContentSection>
          )}
        </div>
      )}
    </WidgetWrapper>
  )
}
