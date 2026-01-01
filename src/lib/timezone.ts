/**
 * Timezone utilities for calendar event display
 * Uses native Intl API for timezone detection and formatting
 */

/**
 * Get the user's current timezone from the browser
 * @returns IANA timezone identifier (e.g., "America/New_York")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Format an ISO date string for display in the user's timezone
 * @param isoString - ISO 8601 date string (should be in UTC)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date/time string in user's timezone
 */
export function formatInUserTimezone(
  isoString: string,
  options: Intl.DateTimeFormatOptions
): string {
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    ...options,
    timeZone: getUserTimezone()
  })
}

/**
 * Format event time for display, respecting user's timezone
 * @param start - ISO 8601 start date string (UTC)
 * @param end - Optional ISO 8601 end date string (UTC)
 * @param allDay - Whether this is an all-day event
 * @returns Formatted time string (e.g., "10:00 AM - 11:00 AM" or "All day")
 */
export function formatEventTime(start: string, end?: string, allDay?: boolean): string {
  if (allDay) return 'All day'

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit'
  }

  const startTimeStr = formatInUserTimezone(start, timeOptions)

  if (end) {
    const endTimeStr = formatInUserTimezone(end, timeOptions)
    return `${startTimeStr} - ${endTimeStr}`
  }

  return startTimeStr
}

/**
 * Format event date for display, respecting user's timezone
 * Returns "Today", "Tomorrow", or formatted date string
 * @param dateStr - ISO 8601 date string (UTC)
 * @param allDay - Whether this is an all-day event (uses date portion only)
 * @returns Formatted date string (e.g., "Today", "Tomorrow", "Wed, Jan 15")
 */
export function formatEventDate(dateStr: string, allDay?: boolean): string {
  const userTimezone = getUserTimezone()

  // For all-day events, parse only the date portion to avoid timezone shifting
  // All-day events should stay on their specified date regardless of timezone
  let eventDate: Date
  if (allDay) {
    // Extract YYYY-MM-DD from the ISO string and treat as local date
    const datePart = dateStr.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    eventDate = new Date(year, month - 1, day)
  } else {
    eventDate = new Date(dateStr)
  }

  // Get today and tomorrow in user's timezone
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: userTimezone })
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: userTimezone })

  // Get the event date string in user's timezone (for non-all-day events)
  // or use the local date (for all-day events)
  let eventDateStr: string
  if (allDay) {
    // For all-day events, format the local date
    eventDateStr = eventDate.toLocaleDateString('en-CA')
  } else {
    // For timed events, convert to user's timezone
    eventDateStr = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: userTimezone })
  }

  if (eventDateStr === todayStr) return 'Today'
  if (eventDateStr === tomorrowStr) return 'Tomorrow'

  // Format for display
  if (allDay) {
    return eventDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return formatInUserTimezone(dateStr, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Check if a date string represents today in the user's timezone
 * @param dateStr - ISO 8601 date string (UTC)
 * @param allDay - Whether this is an all-day event
 * @returns true if the date is today in user's timezone
 */
export function isToday(dateStr: string, allDay?: boolean): boolean {
  const userTimezone = getUserTimezone()

  // Get today's date in user's timezone
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: userTimezone })

  if (allDay) {
    // For all-day events, use the date portion directly
    const datePart = dateStr.split('T')[0]
    return datePart === todayStr
  }

  // For timed events, convert to user's timezone
  const eventDateStr = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: userTimezone })
  return eventDateStr === todayStr
}

/**
 * Convert a date to ISO string in UTC
 * Useful for sending dates to the API in normalized format
 * @param date - Date object
 * @returns ISO 8601 string with Z suffix (UTC)
 */
export function toUTCISOString(date: Date): string {
  return date.toISOString()
}

/**
 * Parse an ISO date string and get the date portion only (YYYY-MM-DD)
 * Useful for all-day events where time is not relevant
 * @param isoString - ISO 8601 date string
 * @returns Date portion in YYYY-MM-DD format
 */
export function getDatePortion(isoString: string): string {
  return isoString.split('T')[0]
}
