import { useState, useEffect, useCallback } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchWeather } from '@/services/api'
import type { WeatherWidgetSettings, WeatherData } from '@/types'

interface WeatherWidgetProps {
  settings: WeatherWidgetSettings
  onSettingsClick?: () => void
}

const weatherIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  default: Cloud,
}

function getWeatherIcon(description: string) {
  const lower = description.toLowerCase()
  if (lower.includes('clear') || lower.includes('sunny')) return weatherIcons.clear
  if (lower.includes('rain') || lower.includes('drizzle')) return weatherIcons.rain
  if (lower.includes('snow')) return weatherIcons.snow
  if (lower.includes('cloud')) return weatherIcons.clouds
  return weatherIcons.default
}

export function WeatherWidget({ settings, onSettingsClick }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWeather = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchWeather(
        settings.location,
        settings.units,
        settings.latitude,
        settings.longitude
      )
      setWeather(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather')
    } finally {
      setIsLoading(false)
    }
  }, [settings.location, settings.units, settings.latitude, settings.longitude])

  useEffect(() => {
    loadWeather()
    // Refresh weather every 30 minutes
    const interval = setInterval(loadWeather, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadWeather])

  const tempUnit = settings.units === 'imperial' ? '°F' : '°C'
  const speedUnit = settings.units === 'imperial' ? 'mph' : 'km/h'

  const Icon = weather ? getWeatherIcon(weather.description) : Cloud

  return (
    <WidgetWrapper
      title={settings.location}
      isLoading={isLoading}
      error={error}
      onRefresh={loadWeather}
      onSettings={onSettingsClick}
    >
      {isLoading && !weather ? (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
            <div className="h-10 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
      ) : weather ? (
        <div className="space-y-4">
          {/* Current weather */}
          <div className="flex items-center gap-4">
            <Icon className="w-16 h-16 text-blue-500" />
            <div>
              <p className="text-4xl font-bold text-gray-900">
                {Math.round(weather.temperature)}{tempUnit}
              </p>
              <p className="text-sm text-gray-500 capitalize">{weather.description}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Droplets className="w-4 h-4" />
              <span>{weather.humidity}% humidity</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Wind className="w-4 h-4" />
              <span>{weather.windSpeed} {speedUnit}</span>
            </div>
          </div>

          {/* Forecast */}
          {settings.showForecast && weather.forecast && weather.forecast.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Forecast</p>
              <div className="grid grid-cols-3 gap-2">
                {weather.forecast.slice(0, 3).map((day) => {
                  const DayIcon = getWeatherIcon(day.description)
                  return (
                    <div key={day.date} className="text-center">
                      <p className="text-xs text-gray-500">{day.date}</p>
                      <DayIcon className="w-6 h-6 mx-auto text-gray-400 my-1" />
                      <p className="text-xs">
                        <span className="font-medium">{Math.round(day.high)}°</span>
                        <span className="text-gray-400"> / {Math.round(day.low)}°</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </WidgetWrapper>
  )
}
