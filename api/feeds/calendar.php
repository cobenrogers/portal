<?php
/**
 * iCal Calendar Parser
 * Fetches and parses iCal feeds
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

function respond($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

function parseIcalDate($dateStr, $tzid = null) {
    // Handle YYYYMMDD format (all-day events)
    // All-day events should not be timezone-converted to preserve the date
    if (preg_match('/^\d{8}$/', $dateStr)) {
        $formatted = substr($dateStr, 0, 4) . '-' . substr($dateStr, 4, 2) . '-' . substr($dateStr, 6, 2);
        return [
            'datetime' => $formatted . 'T00:00:00Z',
            'allDay' => true
        ];
    }

    // Handle YYYYMMDDTHHMMSS format
    if (preg_match('/^(\d{8}T\d{6})(Z)?$/', $dateStr, $matches)) {
        $dt = $matches[1];
        $isUtc = !empty($matches[2]);

        $formatted = substr($dt, 0, 4) . '-' . substr($dt, 4, 2) . '-' . substr($dt, 6, 2) . 'T' .
                     substr($dt, 9, 2) . ':' . substr($dt, 11, 2) . ':' . substr($dt, 13, 2);

        // If TZID provided and date is not already UTC, convert to UTC
        if ($tzid && !$isUtc) {
            try {
                $tz = new DateTimeZone($tzid);
                $dateTime = new DateTime($formatted, $tz);
                $dateTime->setTimezone(new DateTimeZone('UTC'));
                return [
                    'datetime' => $dateTime->format('Y-m-d\TH:i:s\Z'),
                    'allDay' => false
                ];
            } catch (Exception $e) {
                // Fall back to treating as UTC if TZID is invalid
            }
        }

        // If already UTC or no TZID provided, output as UTC
        if ($isUtc) {
            return [
                'datetime' => $formatted . 'Z',
                'allDay' => false
            ];
        }

        // No TZID and not UTC - assume local time and convert via strtotime
        return [
            'datetime' => gmdate('Y-m-d\TH:i:s\Z', strtotime($formatted)),
            'allDay' => false
        ];
    }

    // Fallback for other formats
    return [
        'datetime' => gmdate('Y-m-d\TH:i:s\Z', strtotime($dateStr)),
        'allDay' => false
    ];
}

/**
 * Parse RRULE and expand recurring events within the date range
 */
function expandRecurrence($event, $rrule, $rangeStart, $rangeEnd) {
    $events = [];
    $rules = [];

    // Parse RRULE components
    foreach (explode(';', $rrule) as $part) {
        if (strpos($part, '=') !== false) {
            list($key, $value) = explode('=', $part, 2);
            $rules[$key] = $value;
        }
    }

    if (empty($rules['FREQ'])) return [$event];

    $freq = $rules['FREQ'];
    $interval = intval($rules['INTERVAL'] ?? 1);
    $count = isset($rules['COUNT']) ? intval($rules['COUNT']) : null;
    $until = isset($rules['UNTIL']) ? strtotime(parseIcalDate($rules['UNTIL'])['datetime']) : null;

    $startTime = strtotime($event['start']);
    $endTime = $event['end'] ? strtotime($event['end']) : null;
    $duration = $endTime ? ($endTime - $startTime) : 0;

    // Calculate recurrence based on frequency
    $currentStart = $startTime;
    $occurrences = 0;
    $maxOccurrences = $count ?? 365; // Limit to prevent infinite loops

    while ($occurrences < $maxOccurrences) {
        // Check if we've passed the UNTIL date
        if ($until && $currentStart > $until) break;

        // Check if we've passed the range
        if ($currentStart > $rangeEnd) break;

        // If occurrence is within range, add it
        if ($currentStart >= $rangeStart && $currentStart <= $rangeEnd) {
            $instanceStart = date('c', $currentStart);
            $instanceEnd = $duration > 0 ? date('c', $currentStart + $duration) : null;

            $events[] = [
                'id' => $event['id'] . '_' . date('Ymd', $currentStart),
                'title' => $event['title'],
                'start' => $instanceStart,
                'end' => $instanceEnd,
                'allDay' => $event['allDay'],
                'location' => $event['location']
            ];
        }

        // Move to next occurrence
        switch ($freq) {
            case 'DAILY':
                $currentStart = strtotime("+{$interval} day", $currentStart);
                break;
            case 'WEEKLY':
                $currentStart = strtotime("+{$interval} week", $currentStart);
                break;
            case 'MONTHLY':
                $currentStart = strtotime("+{$interval} month", $currentStart);
                break;
            case 'YEARLY':
                $currentStart = strtotime("+{$interval} year", $currentStart);
                break;
            default:
                // Unsupported frequency, return original event
                return [$event];
        }

        $occurrences++;
    }

    return $events;
}

function parseIcal($content, $rangeStart = null, $rangeEnd = null) {
    $events = [];
    $lines = explode("\n", str_replace("\r\n", "\n", $content));

    $inEvent = false;
    $currentEvent = [];
    $currentKey = '';
    $currentValue = '';

    foreach ($lines as $line) {
        $line = rtrim($line);

        // Handle line continuation
        if (strlen($line) > 0 && ($line[0] === ' ' || $line[0] === "\t")) {
            $currentValue .= substr($line, 1);
            continue;
        }

        // Process previous key-value pair
        if ($currentKey && $inEvent) {
            $currentEvent[$currentKey] = $currentValue;
        }

        // Parse new line
        if (strpos($line, ':') === false) continue;

        list($key, $value) = explode(':', $line, 2);

        // Handle parameters in key (e.g., DTSTART;TZID=America/New_York)
        $keyParts = explode(';', $key);
        $key = $keyParts[0];

        // Extract TZID if present in parameters
        $tzid = null;
        foreach ($keyParts as $part) {
            if (strpos($part, 'TZID=') === 0) {
                $tzid = substr($part, 5);
                break;
            }
        }

        // Store TZID separately for DTSTART and DTEND
        if ($inEvent && ($key === 'DTSTART' || $key === 'DTEND') && $tzid) {
            $currentEvent[$key . '_TZID'] = $tzid;
        }

        if ($key === 'BEGIN' && $value === 'VEVENT') {
            $inEvent = true;
            $currentEvent = [];
        } elseif ($key === 'END' && $value === 'VEVENT') {
            $inEvent = false;

            if (!empty($currentEvent['SUMMARY']) && !empty($currentEvent['DTSTART'])) {
                $startTzid = $currentEvent['DTSTART_TZID'] ?? null;
                $endTzid = $currentEvent['DTEND_TZID'] ?? $startTzid;
                $start = parseIcalDate($currentEvent['DTSTART'], $startTzid);
                $end = !empty($currentEvent['DTEND']) ? parseIcalDate($currentEvent['DTEND'], $endTzid) : null;

                $baseEvent = [
                    'id' => $currentEvent['UID'] ?? md5(json_encode($currentEvent)),
                    'title' => $currentEvent['SUMMARY'],
                    'start' => $start['datetime'],
                    'end' => $end ? $end['datetime'] : null,
                    'allDay' => $start['allDay'],
                    'location' => $currentEvent['LOCATION'] ?? null
                ];

                // Handle recurring events
                if (!empty($currentEvent['RRULE']) && $rangeStart && $rangeEnd) {
                    $expanded = expandRecurrence($baseEvent, $currentEvent['RRULE'], $rangeStart, $rangeEnd);
                    $events = array_merge($events, $expanded);
                } else {
                    $events[] = $baseEvent;
                }
            }

            $currentEvent = [];
        }

        $currentKey = $key;
        $currentValue = $value;
    }

    // Sort by start date
    usort($events, function($a, $b) {
        return strtotime($a['start']) - strtotime($b['start']);
    });

    return $events;
}

$calendarUrl = $_GET['url'] ?? '';
$daysToShow = intval($_GET['days'] ?? 7);

if (empty($calendarUrl)) {
    respond(false, null, 'Calendar URL is required');
}

if (!filter_var($calendarUrl, FILTER_VALIDATE_URL)) {
    respond(false, null, 'Invalid calendar URL');
}

// Fetch the calendar
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'user_agent' => 'Portal Calendar Reader/1.0'
    ]
]);

$content = @file_get_contents($calendarUrl, false, $context);

if ($content === false) {
    respond(false, null, 'Failed to fetch calendar');
}

// Define date range for filtering and recurrence expansion
$todayStart = strtotime('today midnight');
$cutoff = strtotime("+{$daysToShow} days midnight");

// Parse iCal with range for recurrence expansion
$events = parseIcal($content, $todayStart, $cutoff);

// Filter to events within the specified days (include all of today)
$events = array_filter($events, function($event) use ($todayStart, $cutoff) {
    $eventTime = strtotime($event['start']);
    // For all-day events, compare dates only
    if ($event['allDay']) {
        $eventDate = strtotime(date('Y-m-d', $eventTime));
        return $eventDate >= $todayStart && $eventDate < $cutoff;
    }
    return $eventTime >= $todayStart && $eventTime < $cutoff;
});

respond(true, array_values($events));
