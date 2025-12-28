import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, UtensilsCrossed } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchRecipeSuggestions } from '@/services/api'
import type { RecipesWidgetSettings, RecipeSuggestion } from '@/types'

interface RecipesWidgetProps {
  settings: RecipesWidgetSettings
  onSettingsClick?: () => void
}

export function RecipesWidget({ settings, onSettingsClick }: RecipesWidgetProps) {
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchRecipeSuggestions(settings.recipeCount, settings.category)
      setRecipes(result.recipes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes')
    } finally {
      setIsLoading(false)
    }
  }, [settings.recipeCount, settings.category])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, settings.refreshInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData, settings.refreshInterval])

  return (
    <WidgetWrapper
      title={settings.widgetName || 'Recipe Suggestions'}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onSettings={onSettingsClick}
    >
      {isLoading && recipes.length === 0 ? (
        <div className="space-y-2">
          {[...Array(settings.recipeCount)].map((_, i) => (
            <div key={i} className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No recipes available
          {settings.category !== 'all' && (
            <span className="block text-xs mt-1">
              Try selecting a different category
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <a
              key={recipe.id}
              href={recipe.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <UtensilsCrossed className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 truncate flex-1">
                {recipe.title}
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ))}

          {/* View more link */}
          <a
            href="https://getglyc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:underline pt-2 border-t border-gray-200 dark:border-gray-700 mt-2"
          >
            <span>Browse more on Glyc</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </WidgetWrapper>
  )
}
