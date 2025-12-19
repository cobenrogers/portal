<?php
/**
 * Lottery Data API - Fetches Powerball and Mega Millions data
 *
 * Primary source: NY Open Data (free, official)
 * Secondary source: Official lottery websites (scraped for jackpot info)
 *
 * Usage: GET /api/feeds/lottery.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

/**
 * Fetch data from NY Open Data API
 */
function fetchNYOpenData(string $datasetId, int $limit = 5): ?array {
    $url = "https://data.ny.gov/resource/{$datasetId}.json?\$limit={$limit}&\$order=draw_date%20DESC";

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Accept: application/json'
            ],
            'timeout' => 10
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    return json_decode($response, true);
}

/**
 * Scrape jackpot info from official Powerball website
 */
function scrapePowerballJackpot(): ?array {
    $url = 'https://www.powerball.com/';

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept: text/html,application/xhtml+xml'
            ],
            'timeout' => 10
        ]
    ]);

    $html = @file_get_contents($url, false, $context);
    if ($html === false) {
        return null;
    }

    $result = [];

    // Extract jackpot amount - look for patterns like "$1.50 Billion" or "$250 Million"
    if (preg_match('/\$[\d,]+(?:\.\d+)?\s*(?:Billion|Million)/i', $html, $matches)) {
        $result['jackpot'] = $matches[0];
    }

    // Extract next drawing date - look for day names
    if (preg_match('/Next\s+Draw(?:ing)?[:\s]+([A-Za-z]+day,?\s+[A-Za-z]+\.?\s+\d+)/i', $html, $matches)) {
        $result['nextDrawing'] = trim($matches[1]);
    }

    return !empty($result) ? $result : null;
}

/**
 * Scrape jackpot info from official Mega Millions website
 */
function scrapeMegaMillionsJackpot(): ?array {
    $url = 'https://www.megamillions.com/';

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept: text/html,application/xhtml+xml'
            ],
            'timeout' => 10
        ]
    ]);

    $html = @file_get_contents($url, false, $context);
    if ($html === false) {
        return null;
    }

    $result = [];

    // Extract jackpot amount
    if (preg_match('/\$[\d,]+(?:\.\d+)?\s*(?:Billion|Million)/i', $html, $matches)) {
        $result['jackpot'] = $matches[0];
    }

    // Extract next drawing date
    if (preg_match('/Next\s+Draw(?:ing)?[:\s]+([A-Za-z]+day,?\s+[A-Za-z]+\.?\s+\d+)/i', $html, $matches)) {
        $result['nextDrawing'] = trim($matches[1]);
    }

    return !empty($result) ? $result : null;
}

/**
 * Calculate next drawing date based on schedule
 * Powerball: Monday, Wednesday, Saturday
 * Mega Millions: Tuesday, Friday
 */
function getNextDrawingDate(string $game): string {
    $now = new DateTime('now', new DateTimeZone('America/New_York'));
    $cutoffHour = 23; // Drawings are typically at 10:59 PM ET

    if ($game === 'powerball') {
        $drawDays = [1, 3, 6]; // Monday=1, Wednesday=3, Saturday=6
    } else {
        $drawDays = [2, 5]; // Tuesday=2, Friday=5
    }

    $currentDay = (int)$now->format('N'); // 1=Monday, 7=Sunday
    $currentHour = (int)$now->format('H');

    // Find next drawing day
    $daysUntilNext = null;
    foreach ($drawDays as $drawDay) {
        $diff = $drawDay - $currentDay;
        if ($diff < 0) $diff += 7;

        // If it's today but past cutoff, skip to next occurrence
        if ($diff === 0 && $currentHour >= $cutoffHour) {
            continue;
        }

        if ($daysUntilNext === null || $diff < $daysUntilNext) {
            $daysUntilNext = $diff;
        }
    }

    // If no valid day found this week, get first day next week
    if ($daysUntilNext === null) {
        $daysUntilNext = $drawDays[0] + (7 - $currentDay);
    }

    $nextDate = clone $now;
    $nextDate->modify("+{$daysUntilNext} days");

    return $nextDate->format('l, M j'); // e.g., "Saturday, Dec 21"
}

/**
 * Parse winning numbers from NY data format
 * Powerball format: "25 33 53 62 66 17" (last number is Powerball)
 * Mega Millions format: "20 24 46 59 65 07" (last number is Mega Ball)
 */
function parseWinningNumbers(string $numbers, string $game): array {
    $parts = explode(' ', trim($numbers));
    $mainNumbers = array_slice($parts, 0, 5);
    $specialBall = end($parts);

    return [
        'numbers' => array_map('intval', $mainNumbers),
        'specialBall' => (int)$specialBall,
        'specialBallName' => $game === 'powerball' ? 'Powerball' : 'Mega Ball'
    ];
}

// Fetch data from all sources
$powerballData = fetchNYOpenData('d6yy-54nr', 1); // Powerball dataset
$megaMillionsData = fetchNYOpenData('5xaw-6ayf', 1); // Mega Millions dataset

$powerballJackpot = scrapePowerballJackpot();
$megaMillionsJackpot = scrapeMegaMillionsJackpot();

// Build response
$response = [
    'success' => true,
    'data' => [
        'powerball' => null,
        'megaMillions' => null,
        'timestamp' => date('c')
    ]
];

// Process Powerball data
if (!empty($powerballData) && isset($powerballData[0])) {
    $pb = $powerballData[0];
    $winningNumbers = parseWinningNumbers($pb['winning_numbers'] ?? '', 'powerball');

    $response['data']['powerball'] = [
        'name' => 'Powerball',
        'lastDrawDate' => isset($pb['draw_date']) ? date('M j, Y', strtotime($pb['draw_date'])) : null,
        'winningNumbers' => $winningNumbers['numbers'],
        'specialBall' => $winningNumbers['specialBall'],
        'specialBallName' => $winningNumbers['specialBallName'],
        'multiplier' => isset($pb['multiplier']) ? (int)$pb['multiplier'] : null,
        'jackpot' => $powerballJackpot['jackpot'] ?? null,
        'nextDrawing' => $powerballJackpot['nextDrawing'] ?? getNextDrawingDate('powerball'),
        'drawDays' => 'Mon, Wed, Sat'
    ];
}

// Process Mega Millions data
if (!empty($megaMillionsData) && isset($megaMillionsData[0])) {
    $mm = $megaMillionsData[0];
    $winningNumbers = parseWinningNumbers($mm['winning_numbers'] ?? '', 'megamillions');

    $response['data']['megaMillions'] = [
        'name' => 'Mega Millions',
        'lastDrawDate' => isset($mm['draw_date']) ? date('M j, Y', strtotime($mm['draw_date'])) : null,
        'winningNumbers' => $winningNumbers['numbers'],
        'specialBall' => $winningNumbers['specialBall'],
        'specialBallName' => $winningNumbers['specialBallName'],
        'multiplier' => isset($mm['mega_ball']) ? null : null, // MM doesn't have multiplier in same format
        'jackpot' => $megaMillionsJackpot['jackpot'] ?? null,
        'nextDrawing' => $megaMillionsJackpot['nextDrawing'] ?? getNextDrawingDate('megamillions'),
        'drawDays' => 'Tue, Fri'
    ];
}

// Check for complete failure
if ($response['data']['powerball'] === null && $response['data']['megaMillions'] === null) {
    $response['success'] = false;
    $response['error'] = 'Failed to fetch lottery data from all sources';
}

echo json_encode($response);
