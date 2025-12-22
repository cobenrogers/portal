import { useState, useEffect, useCallback } from 'react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchTriviaData } from '@/services/api'
import type { TriviaData } from '@/types'

interface TriviaWidgetProps {
  onSettingsClick?: () => void
}

export function TriviaWidget({ onSettingsClick }: TriviaWidgetProps) {
  const [data, setData] = useState<TriviaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  // Shuffle answers only once when data changes
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setRevealed(false)
    setSelectedAnswer(null)
    try {
      const result = await fetchTriviaData()
      setData(result)
      // Shuffle answers when new data loads
      const allAnswers = [result.correctAnswer, ...result.incorrectAnswers]
      setShuffledAnswers(allAnswers.sort(() => Math.random() - 0.5))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trivia')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAnswerClick = (answer: string) => {
    if (revealed) return
    setSelectedAnswer(answer)
    setRevealed(true)
  }

  return (
    <WidgetWrapper
      title="Daily Trivia"
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onSettings={onSettingsClick}
    >
      {isLoading && !data ? (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="space-y-1 mt-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-full" />
            ))}
          </div>
        </div>
      ) : !data ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No trivia available.
        </div>
      ) : (
        <div className="space-y-3 py-1">
          {/* Category and difficulty */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {data.category}
            </span>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
              data.difficulty === 'easy'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : data.difficulty === 'medium'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}>
              {data.difficulty}
            </span>
          </div>

          {/* Question */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {data.question}
          </p>

          {/* Answer options */}
          <div className="space-y-1.5">
            {shuffledAnswers.map((answer, idx) => {
              const isCorrect = answer === data.correctAnswer
              const isSelected = answer === selectedAnswer
              const showResult = revealed

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerClick(answer)}
                  disabled={revealed}
                  className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors ${
                    showResult
                      ? isCorrect
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                        : isSelected
                        ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 cursor-pointer'
                  }`}
                >
                  {answer}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </WidgetWrapper>
  )
}
