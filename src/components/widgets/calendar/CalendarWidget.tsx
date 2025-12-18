import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'
import { WidgetWrapper } from '../WidgetWrapper'
import { fetchCalendarEvents } from '@/services/api'
import { cn } from '@/lib/utils'
import type { CalendarWidgetSettings, CalendarEvent } from '@/types'

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

export function CalendarWidget({ settings, onSettingsClick }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    if (!settings.calendarUrl) {
      setEvents([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCalendarEvents(settings.calendarUrl, settings.daysToShow)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setIsLoading(false)
    }
  }, [settings.calendarUrl, settings.daysToShow])

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

  return (
    <WidgetWrapper
      title={settings.calendarName || 'Calendar'}
      isLoading={isLoading}
      error={error}
      onRefresh={loadEvents}
      onSettings={onSettingsClick}
    >
      {!settings.calendarUrl ? (
        <div className="text-gray-500 text-sm text-center py-4">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No calendar configured</p>
          <p className="text-xs mt-1">Add an iCal URL in settings</p>
        </div>
      ) : isLoading && events.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-4">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <p
                className={cn(
                  'text-xs font-semibold mb-2',
                  date === 'Today' ? 'text-blue-600' : 'text-gray-500'
                )}
              >
                {date}
              </p>
              <ul className="space-y-2">
                {dateEvents.map((event) => (
                  <li
                    key={event.id}
                    className={cn(
                      'text-sm p-2 rounded border-l-2',
                      isToday(event.start)
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WidgetWrapper>
  )
}
