<?php
/**
 * iCal Calendar Parser
 * Fetches and parses iCal feeds
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function respond($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

function parseIcalDate($dateStr, $timezone = null) {
    // Handle YYYYMMDD format (all-day events)
    if (preg_match('/^\d{8}$/', $dateStr)) {
        return [
            'datetime' => date('c', strtotime($dateStr)),
            'allDay' => true
        ];
    }

    // Handle YYYYMMDDTHHMMSS format
    if (preg_match('/^(\d{8}T\d{6})(Z)?$/', $dateStr, $matches)) {
        $dt = $matches[1];
        $isUtc = !empty($matches[2]);

        $formatted = substr($dt, 0, 4) . '-' . substr($dt, 4, 2) . '-' . substr($dt, 6, 2) . 'T' .
                     substr($dt, 9, 2) . ':' . substr($dt, 11, 2) . ':' . substr($dt, 13, 2);

        if ($isUtc) {
            $formatted .= 'Z';
        }

        return [
            'datetime' => date('c', strtotime($formatted)),
            'allDay' => false
        ];
    }

    return [
        'datetime' => date('c', strtotime($dateStr)),
        'allDay' => false
    ];
}

function parseIcal($content) {
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

        if ($key === 'BEGIN' && $value === 'VEVENT') {
            $inEvent = true;
            $currentEvent = [];
        } elseif ($key === 'END' && $value === 'VEVENT') {
            $inEvent = false;

            if (!empty($currentEvent['SUMMARY']) && !empty($currentEvent['DTSTART'])) {
                $start = parseIcalDate($currentEvent['DTSTART']);
                $end = !empty($currentEvent['DTEND']) ? parseIcalDate($currentEvent['DTEND']) : null;

                $events[] = [
                    'id' => $currentEvent['UID'] ?? md5(json_encode($currentEvent)),
                    'title' => $currentEvent['SUMMARY'],
                    'start' => $start['datetime'],
                    'end' => $end ? $end['datetime'] : null,
                    'allDay' => $start['allDay'],
                    'location' => $currentEvent['LOCATION'] ?? null
                ];
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

// Parse iCal
$events = parseIcal($content);

// Filter to upcoming events within the specified days
$now = time();
$cutoff = strtotime("+{$daysToShow} days");

$events = array_filter($events, function($event) use ($now, $cutoff) {
    $eventTime = strtotime($event['start']);
    return $eventTime >= $now && $eventTime <= $cutoff;
});

respond(true, array_values($events));
