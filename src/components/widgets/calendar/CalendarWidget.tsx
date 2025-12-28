import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchCalendarEvents } from '@/services/api'
import { cn } from '@/lib/utils'
import type { CalendarWidgetSettings, CalendarEvent, CalendarColor, CalendarSource } from '@/types'

// Color classes for calendar sources
const CALENDAR_COLORS: Record<CalendarColor, { border: string; bg: string; dot: string }> = {
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    dot: 'bg-blue-500',
  },
  green: {
    border: 'border-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    dot: 'bg-green-500',
  },
  purple: {
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    dot: 'bg-purple-500',
  },
  red: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    dot: 'bg-red-500',
  },
  orange: {
    border: 'border-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    dot: 'bg-orange-500',
  },
  pink: {
    border: 'border-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    dot: 'bg-pink-500',
  },
}

interface CalendarWidgetProps {
  settings: CalendarWidgetSettings
  onSettingsClick?: () => void
}

function formatEventTime(start: string, end?: string, allDay?: boolean): string {
  if (allDay) return 'All day'
  const startDate = new Date(start)
  const timeStr = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (end) {
    const endDate = new Date(end)
    const endTimeStr = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `${timeStr} - ${endTimeStr}`
  }
  return timeStr
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  today.setHours(0, 0, 0, 0)
  tomorrow.setHours(0, 0, 0, 0)
  const eventDate = new Date(date)
  eventDate.setHours(0, 0, 0, 0)

  if (eventDate.getTime() === today.getTime()) return 'Today'
  if (eventDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Helper to get calendar sources from settings (handles legacy single calendar)
function getCalendarSources(settings: CalendarWidgetSettings): CalendarSource[] {
  // If new multi-calendar format exists, use it
  if (settings.calendars && settings.calendars.length > 0) {
    return settings.calendars
  }
  // Legacy single calendar support
  if (settings.calendarUrl) {
    return [{
      id: 'legacy',
      name: settings.calendarName || 'Calendar',
      url: settings.calendarUrl,
      color: 'blue',
    }]
  }
  return []
}

export function CalendarWidget({ settings, onSettingsClick }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calendarSources = useMemo(() => getCalendarSources(settings), [settings])

  const loadEvents = useCallback(async () => {
    if (calendarSources.length === 0) {
      setEvents([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // Fetch events from all calendar sources in parallel
      const eventPromises = calendarSources.map(async (source) => {
        try {
          const sourceEvents = await fetchCalendarEvents(source.url, settings.daysToShow)
          // Tag each event with its source calendar info
          return sourceEvents.map(event => ({
            ...event,
            sourceId: source.id,
            sourceColor: source.color,
          }))
        } catch {
          // If one calendar fails, continue with others
          console.warn(`Failed to load calendar: ${source.name}`)
          return []
        }
      })

      const allEventsArrays = await Promise.all(eventPromises)
      // Merge all events and sort by start time
      const mergedEvents = allEventsArrays.flat().sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
      )
      setEvents(mergedEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setIsLoading(false)
    }
  }, [calendarSources, settings.daysToShow])

  useEffect(() => {
    loadEvents()
    // Refresh calendar every 15 minutes
    const interval = setInterval(loadEvents, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadEvents])

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {}
    for (const event of events) {
      const dateKey = formatEventDate(event.start)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(event)
    }
    return groups
  }, [events])

  // Widget title: use calendarName, or if multiple calendars, just "Calendar"
  const widgetTitle = useMemo(() => {
    if (settings.calendarName) return settings.calendarName
    if (calendarSources.length > 1) return 'Calendar'
    if (calendarSources.length === 1) return calendarSources[0].name
    return 'Calendar'
  }, [settings.calendarName, calendarSources])

  return (
    <WidgetWrapper
      title={widgetTitle}
      isLoading={isLoading}
      error={error}
      onRefresh={loadEvents}
      onSettings={onSettingsClick}
    >
      {calendarSources.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>No calendar configured</p>
          <p className="text-xs mt-1">Add a calendar in settings</p>
        </div>
      ) : isLoading && events.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendar legend for multiple calendars */}
          {calendarSources.length > 1 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b dark:border-gray-700">
              {calendarSources.map((source) => (
                <div key={source.id} className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', CALENDAR_COLORS[source.color].dot)} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{source.name}</span>
                </div>
              ))}
            </div>
          )}
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <p
                className={cn(
                  'text-xs font-semibold mb-2',
                  date === 'Today' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {date}
              </p>
              <ul className="space-y-2">
                {dateEvents.map((event) => {
                  // Get color classes for the event's source calendar
                  const colorClasses = event.sourceColor
                    ? CALENDAR_COLORS[event.sourceColor]
                    : CALENDAR_COLORS.blue

                  return (
                    <li
                      key={event.id}
                      className={cn(
                        'text-sm p-2 rounded border-l-2',
                        colorClasses.border,
                        isToday(event.start)
                          ? colorClasses.bg
                          : 'bg-gray-50 dark:bg-gray-700/50'
                      )}
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatEventTime(event.start, event.end, event.allDay)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  )
}
