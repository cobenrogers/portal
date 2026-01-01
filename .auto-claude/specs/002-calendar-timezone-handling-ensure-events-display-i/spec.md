# Specification: Calendar Timezone Handling

## Overview

Implement proper timezone handling for the calendar widget to ensure events display correctly in the user's local timezone. Currently, the PHP backend parses iCal dates but doesn't properly handle timezone information (TZID), and the frontend uses `toLocaleTimeString()` without explicit timezone configuration. This feature will ensure that calendar events are stored/transmitted in UTC and displayed in the user's local timezone using the browser's native `Intl` API for timezone detection.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature that adds timezone handling capabilities to existing calendar functionality. It requires changes to both the PHP backend (date parsing) and the React frontend (date formatting), making it a cross-stack feature implementation.

## Task Scope

### Services Involved
- **main** (primary) - React frontend for timezone-aware date formatting and display
- **api/feeds** (integration) - PHP backend for proper iCal timezone parsing and UTC normalization

### This Task Will:
- [ ] Create timezone utility functions in `src/lib/timezone.ts` for detecting user timezone and formatting dates
- [ ] Update `CalendarWidget.tsx` to use timezone-aware formatting functions
- [ ] Update `calendar.php` to properly parse iCal TZID parameters and normalize to UTC
- [ ] Ensure all-day events display correctly without time shifting across timezone boundaries
- [ ] Add unit tests for timezone conversion edge cases

### Out of Scope:
- User-configurable timezone preferences (will use browser-detected timezone)
- Timezone display in event details (showing timezone abbreviation like "EST")
- Backend caching of timezone-converted events
- Support for floating time events (events without timezone)

## Service Context

### Main (React Frontend)

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- Styling: Tailwind CSS
- Testing: Vitest

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

### API (PHP Backend)

**Tech Stack:**
- Language: PHP
- Type: REST API endpoints

**Entry Point:** `api/feeds/calendar.php`

**How to Run:**
Served via PHP-enabled web server (Apache/nginx)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/lib/timezone.ts` | main | **CREATE** - New utility file with timezone detection and formatting functions |
| `src/components/widgets/calendar/CalendarWidget.tsx` | main | Update `formatEventTime()` and `formatEventDate()` to use timezone utilities |
| `api/feeds/calendar.php` | api | Fix `parseIcalDate()` to properly handle TZID and normalize to UTC |
| `src/lib/utils.ts` | main | Optional: Add timezone-aware version of `formatRelativeTime()` |
| `src/lib/timezone.test.ts` | main | **CREATE** - Unit tests for timezone utilities |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/lib/utils.ts` | Utility function structure and export patterns |
| `src/lib/utils.test.ts` | Testing patterns for utility functions |
| `src/components/widgets/history/HistoryWidget.tsx` | Date formatting with `toLocaleDateString()` |
| `api/feeds/calendar.php` | iCal parsing structure and date handling |

## Patterns to Follow

### Utility Function Pattern

From `src/lib/utils.ts`:

```typescript
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  // ... formatting logic
  return date.toLocaleDateString()
}
```

**Key Points:**
- Export individual functions (not default exports)
- Accept ISO 8601 string inputs
- Return formatted strings
- Use type annotations

### Date Formatting in Components

From `src/components/widgets/calendar/CalendarWidget.tsx`:

```typescript
function formatEventTime(start: string, end?: string, allDay?: boolean): string {
  if (allDay) return 'All day'
  const startDate = new Date(start)
  const timeStr = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  // ...
}
```

**Key Points:**
- Inline helper functions within component files
- Use `toLocaleTimeString` and `toLocaleDateString` with options object
- Handle edge cases (all-day events)

### PHP Date Handling

From `api/feeds/calendar.php`:

```php
function parseIcalDate($dateStr, $timezone = null) {
    // Handle YYYYMMDD format (all-day events)
    if (preg_match('/^\d{8}$/', $dateStr)) {
        return [
            'datetime' => date('c', strtotime($dateStr)),
            'allDay' => true
        ];
    }
    // ...
}
```

**Key Points:**
- Return associative arrays with typed values
- Use `date('c', ...)` for ISO 8601 output
- Handle multiple date formats

## Requirements

### Functional Requirements

1. **Timezone Detection**
   - Description: Automatically detect user's timezone using browser `Intl` API
   - Acceptance: `Intl.DateTimeFormat().resolvedOptions().timeZone` returns IANA timezone (e.g., "America/New_York")

2. **Event Time Display**
   - Description: Display event times in user's local timezone regardless of source timezone
   - Acceptance: An event at 10:00 AM UTC displays as 5:00 AM for EST users, 2:00 AM for PST users

3. **All-Day Event Handling**
   - Description: All-day events should not shift dates across timezone boundaries
   - Acceptance: A "Birthday" event on January 15th displays as January 15th in all timezones

4. **UTC Normalization (Backend)**
   - Description: PHP backend should output all dates in UTC (ISO 8601 with Z suffix)
   - Acceptance: API response contains dates like `"2024-01-15T15:00:00Z"` not `"2024-01-15T10:00:00-05:00"`

5. **TZID Parsing (Backend)**
   - Description: Parse and respect TZID parameters from iCal DTSTART/DTEND
   - Acceptance: `DTSTART;TZID=America/New_York:20240115T100000` converts to `2024-01-15T15:00:00Z`

### Edge Cases

1. **DST Transitions** - Events during daylight saving time changes should display correctly (spring forward/fall back)
2. **Cross-Midnight Events** - Events that span midnight in one timezone but not another should show correct dates
3. **Server Timezone Mismatch** - Backend should work correctly regardless of server's configured timezone
4. **Invalid Timezone** - Gracefully handle unknown TZID values by falling back to UTC

## Implementation Notes

### DO
- Use native `Intl.DateTimeFormat` API for all timezone conversions (zero dependencies)
- Create a centralized `src/lib/timezone.ts` for all timezone utilities
- Use explicit `timeZone` option in all `toLocaleString()` calls
- Store/transmit dates in UTC format (ISO 8601 with Z suffix)
- Handle all-day events specially (preserve date, ignore time)
- Add `timezone` field to `CalendarEvent` type if source timezone needed

### DON'T
- Don't add external libraries (date-fns-tz, moment-timezone, luxon) - native API is sufficient
- Don't modify the `CalendarEvent` interface without updating types/index.ts
- Don't convert all-day events to specific times
- Don't assume server timezone matches user timezone
- Don't cache timezone detection result (browser can change)

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- None required for this feature

## Success Criteria

The task is complete when:

1. [ ] User's timezone is automatically detected using `Intl.DateTimeFormat().resolvedOptions().timeZone`
2. [ ] Calendar events display times in user's local timezone
3. [ ] All-day events show the correct date regardless of timezone
4. [ ] PHP backend outputs all dates in UTC (ISO 8601 with Z suffix)
5. [ ] PHP backend correctly parses iCal TZID parameters
6. [ ] No console errors related to date parsing
7. [ ] Existing tests still pass
8. [ ] New timezone utility tests pass

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| getUserTimezone() | `src/lib/timezone.test.ts` | Returns valid IANA timezone string |
| formatEventTimeInTimezone() | `src/lib/timezone.test.ts` | Correctly converts UTC to local time |
| formatEventDateInTimezone() | `src/lib/timezone.test.ts` | Returns "Today"/"Tomorrow" correctly |
| All-day event handling | `src/lib/timezone.test.ts` | All-day events don't shift dates |
| DST edge cases | `src/lib/timezone.test.ts` | Events during DST transitions display correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Calendar API response | api ↔ main | API returns UTC dates, frontend displays in local timezone |
| iCal TZID parsing | api | Events with TZID are correctly converted to UTC |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View calendar events | 1. Open portal 2. View calendar widget | Events display in user's local timezone |
| All-day events | 1. Calendar has all-day event 2. View in different timezone | Date remains consistent |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| CalendarWidget | `http://localhost:3000` | Events show correct times for browser timezone |
| CalendarWidget | `http://localhost:3000` | All-day events show "All day" not specific time |
| CalendarWidget | `http://localhost:3000` | "Today"/"Tomorrow" labels correct for local date |

### Database Verification (if applicable)
Not applicable - no database in this feature.

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (utility functions in lib/, component helpers inline)
- [ ] No security vulnerabilities introduced
- [ ] Events with TZID display correctly
- [ ] All-day events don't shift across timezone boundaries

## Technical Implementation Details

### New File: `src/lib/timezone.ts`

```typescript
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
```

### PHP Backend Update: `api/feeds/calendar.php`

The `parseIcalDate()` function needs to:
1. Extract TZID from the parameter string
2. Use PHP's `DateTimeZone` to convert to UTC
3. Output ISO 8601 with Z suffix

```php
function parseIcalDate($dateStr, $tzid = null) {
    // ... existing format detection ...

    // If TZID provided, convert to UTC
    if ($tzid && !$isUtc) {
        try {
            $tz = new DateTimeZone($tzid);
            $dt = new DateTime($formatted, $tz);
            $dt->setTimezone(new DateTimeZone('UTC'));
            $formatted = $dt->format('c');
        } catch (Exception $e) {
            // Fall back to treating as UTC if TZID is invalid
        }
    }

    return [
        'datetime' => $formatted,
        'allDay' => false
    ];
}
```
