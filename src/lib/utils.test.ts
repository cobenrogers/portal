import { describe, it, expect } from 'vitest'
import { cn, generateId, formatRelativeTime, truncateText } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})

describe('generateId', () => {
  it('generates a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('generates unique ids', () => {
    const ids = new Set([...Array(100)].map(() => generateId()))
    expect(ids.size).toBe(100)
  })

  it('generates ids of expected length', () => {
    const id = generateId()
    expect(id.length).toBeGreaterThanOrEqual(8)
  })
})

describe('formatRelativeTime', () => {
  it('returns "just now" for recent times', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')
  })

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')
  })

  it('returns formatted date for older times', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatRelativeTime(twoWeeksAgo)
    // Should be a date string, not "Xd ago"
    expect(result).not.toContain('ago')
  })
})

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('truncates long text with ellipsis', () => {
    expect(truncateText('hello world', 8)).toBe('hello...')
  })

  it('handles exact length', () => {
    expect(truncateText('hello', 5)).toBe('hello')
  })

  it('handles empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })
})
