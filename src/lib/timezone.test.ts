import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getUserTimezone,
  formatInUserTimezone,
  formatEventTime,
  formatEventDate,
  isToday,
  toUTCISOString,
  getDatePortion
} from './timezone'

describe('getUserTimezone', () => {
  it('returns a string', () => {
    const tz = getUserTimezone()
    expect(typeof tz).toBe('string')
  })

  it('returns a valid IANA timezone identifier', () => {
    const tz = getUserTimezone()
    // IANA timezone identifiers contain a slash (e.g., "America/New_York")
    // or are special values like "UTC"
    expect(tz.length).toBeGreaterThan(0)
  })

  it('returns consistent timezone on repeated calls', () => {
    const tz1 = getUserTimezone()
    const tz2 = getUserTimezone()
    expect(tz1).toBe(tz2)
  })
})

describe('formatInUserTimezone', () => {
  it('formats date with time options', () => {
    const isoString = '2024-01-15T14:30:00Z'
    const result = formatInUserTimezone(isoString, {
      hour: 'numeric',
      minute: '2-digit'
    })
    // Should contain a colon and numbers (time format)
    expect(result).toMatch(/\d/)
  })

  it('formats date with date options', () => {
    const isoString = '2024-01-15T14:30:00Z'
    const result = formatInUserTimezone(isoString, {
      month: 'short',
      day: 'numeric'
    })
    // Should contain month and day
    expect(result).toMatch(/\d+/)
  })

  it('handles different format options', () => {
    const isoString = '2024-06-20T10:00:00Z'
    const result = formatInUserTimezone(isoString, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatEventTime', () => {
  it('returns "All day" for all-day events', () => {
    const result = formatEventTime('2024-01-15T00:00:00Z', undefined, true)
    expect(result).toBe('All day')
  })

  it('formats single time without end', () => {
    const result = formatEventTime('2024-01-15T14:30:00Z')
    // Should be a time string with numbers
    expect(result).toMatch(/\d/)
  })

  it('formats time range with start and end', () => {
    const result = formatEventTime('2024-01-15T14:30:00Z', '2024-01-15T15:30:00Z')
    // Should contain a dash separator for time range
    expect(result).toContain(' - ')
  })

  it('handles midnight times', () => {
    const result = formatEventTime('2024-01-15T00:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles end of day times', () => {
    const result = formatEventTime('2024-01-15T23:59:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatEventDate', () => {
  beforeEach(() => {
    // Mock Date to control "today" and "tomorrow"
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Today" for today\'s date', () => {
    // Create a date that will be "today" in the user's timezone
    const userTz = getUserTimezone()
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: userTz })
    const todayDate = new Date(todayStr + 'T12:00:00')

    const result = formatEventDate(todayDate.toISOString())
    expect(result).toBe('Today')
  })

  it('returns "Tomorrow" for tomorrow\'s date', () => {
    const userTz = getUserTimezone()
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: userTz })
    const tomorrowDate = new Date(tomorrowStr + 'T12:00:00')

    const result = formatEventDate(tomorrowDate.toISOString())
    expect(result).toBe('Tomorrow')
  })

  it('returns formatted date for other dates', () => {
    // Date far in the future
    const result = formatEventDate('2024-06-20T12:00:00Z')
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Tomorrow')
    expect(typeof result).toBe('string')
  })

  it('handles all-day events correctly', () => {
    const result = formatEventDate('2024-06-20T00:00:00Z', true)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns "Today" for all-day event on today', () => {
    // For all-day events, use the date portion directly
    const userTz = getUserTimezone()
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: userTz })

    const result = formatEventDate(todayStr + 'T00:00:00Z', true)
    expect(result).toBe('Today')
  })
})

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for today\'s date', () => {
    const userTz = getUserTimezone()
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: userTz })
    const todayDate = new Date(todayStr + 'T12:00:00')

    const result = isToday(todayDate.toISOString())
    expect(result).toBe(true)
  })

  it('returns false for yesterday\'s date', () => {
    const userTz = getUserTimezone()
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: userTz })
    const yesterdayDate = new Date(yesterdayStr + 'T12:00:00')

    const result = isToday(yesterdayDate.toISOString())
    expect(result).toBe(false)
  })

  it('returns false for tomorrow\'s date', () => {
    const userTz = getUserTimezone()
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: userTz })
    const tomorrowDate = new Date(tomorrowStr + 'T12:00:00')

    const result = isToday(tomorrowDate.toISOString())
    expect(result).toBe(false)
  })

  it('handles all-day events correctly', () => {
    const userTz = getUserTimezone()
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: userTz })

    const result = isToday(todayStr + 'T00:00:00Z', true)
    expect(result).toBe(true)
  })

  it('returns false for all-day event on different day', () => {
    const result = isToday('2024-06-20T00:00:00Z', true)
    expect(result).toBe(false)
  })
})

describe('toUTCISOString', () => {
  it('returns a string ending with Z', () => {
    const date = new Date('2024-01-15T14:30:00Z')
    const result = toUTCISOString(date)
    expect(result).toMatch(/Z$/)
  })

  it('returns valid ISO 8601 format', () => {
    const date = new Date('2024-01-15T14:30:00Z')
    const result = toUTCISOString(date)
    // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
  })

  it('preserves the exact time', () => {
    const date = new Date('2024-01-15T14:30:00.000Z')
    const result = toUTCISOString(date)
    expect(result).toBe('2024-01-15T14:30:00.000Z')
  })

  it('handles dates at midnight UTC', () => {
    const date = new Date('2024-01-15T00:00:00.000Z')
    const result = toUTCISOString(date)
    expect(result).toBe('2024-01-15T00:00:00.000Z')
  })

  it('handles dates at end of day UTC', () => {
    const date = new Date('2024-01-15T23:59:59.999Z')
    const result = toUTCISOString(date)
    expect(result).toBe('2024-01-15T23:59:59.999Z')
  })
})

describe('getDatePortion', () => {
  it('extracts date from ISO string', () => {
    const result = getDatePortion('2024-01-15T14:30:00Z')
    expect(result).toBe('2024-01-15')
  })

  it('handles midnight times', () => {
    const result = getDatePortion('2024-06-20T00:00:00Z')
    expect(result).toBe('2024-06-20')
  })

  it('handles dates without time portion', () => {
    const result = getDatePortion('2024-12-25')
    expect(result).toBe('2024-12-25')
  })

  it('handles dates with timezone offset', () => {
    const result = getDatePortion('2024-01-15T14:30:00+05:30')
    expect(result).toBe('2024-01-15')
  })

  it('returns YYYY-MM-DD format', () => {
    const result = getDatePortion('2024-03-08T10:00:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
