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
 * More robust extraction targeting the "Estimated Jackpot" section
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

    // Look for "Estimated Jackpot" followed by dollar amount
    // Pattern: Estimated Jackpot ... $XX Million/Billion
    if (preg_match('/Estimated\s+Jackpot[^$]*(\$[\d,]+(?:\.\d+)?\s*(?:Billion|Million))/is', $html, $matches)) {
        $result['jackpot'] = trim($matches[1]);
    }
    // Fallback: Look for large jackpot amounts (over $10 Million) that are likely the main jackpot
    elseif (preg_match_all('/\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(Billion|Million)/i', $html, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $amount = (float)str_replace(',', '', $match[1]);
            $unit = strtolower($match[2]);
            // Only consider amounts >= $20 million (minimum Powerball jackpot)
            if (($unit === 'million' && $amount >= 20) || $unit === 'billion') {
                $result['jackpot'] = '$' . $match[1] . ' ' . ucfirst($unit);
                break;
            }
        }
    }

    // Extract next drawing date
    if (preg_match('/Next\s+Draw(?:ing)?[:\s]*([A-Za-z]+day,?\s*[A-Za-z]+\.?\s*\d+)/i', $html, $matches)) {
        $result['nextDrawing'] = trim($matches[1]);
    }

    return !empty($result) ? $result : null;
}

/**
 * Fetch Mega Millions data from official API
 * Returns jackpot, winning numbers, and next drawing info
 */
function fetchMegaMillionsAPI(): ?array {
    $url = 'https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData';

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Accept: application/xml'
            ],
            'timeout' => 10
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    // Parse XML wrapper to get JSON string
    $xml = @simplexml_load_string($response);
    if ($xml === false) {
        return null;
    }

    $jsonString = (string)$xml;
    $data = json_decode($jsonString, true);
    if (!$data) {
        return null;
    }

    $result = [];

    // Extract winning numbers from Drawing object
    if (isset($data['Drawing'])) {
        $d = $data['Drawing'];
        $result['winningNumbers'] = [
            (int)($d['N1'] ?? 0),
            (int)($d['N2'] ?? 0),
            (int)($d['N3'] ?? 0),
            (int)($d['N4'] ?? 0),
            (int)($d['N5'] ?? 0)
        ];
        $result['megaBall'] = (int)($d['MBall'] ?? 0);
        $result['megaplier'] = isset($d['Megaplier']) && $d['Megaplier'] > 0 ? (int)$d['Megaplier'] : null;
        $result['lastDrawDate'] = isset($d['PlayDate']) ? date('M j, Y', strtotime($d['PlayDate'])) : null;
    }

    // Extract jackpot info
    if (isset($data['Jackpot'])) {
        $j = $data['Jackpot'];
        $nextPrize = $j['NextPrizePool'] ?? 0;
        $result['jackpot'] = formatJackpot($nextPrize);
    }

    // Extract next drawing date
    if (isset($data['NextDrawingDate'])) {
        $result['nextDrawing'] = date('l, M j', strtotime($data['NextDrawingDate']));
    }

    return $result;
}

/**
 * Format jackpot amount as human-readable string
 */
function formatJackpot(float $amount): string {
    if ($amount >= 1000000000) {
        return '$' . number_format($amount / 1000000000, 2) . ' Billion';
    } elseif ($amount >= 1000000) {
        return '$' . number_format($amount / 1000000, 0) . ' Million';
    }
    return '$' . number_format($amount, 0);
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
$powerballData = fetchNYOpenData('d6yy-54nr', 1); // Powerball dataset (for winning numbers)
$powerballJackpot = scrapePowerballJackpot(); // Scrape jackpot from official site

// Use official Mega Millions API (provides all data including jackpot)
$megaMillionsAPI = fetchMegaMillionsAPI();

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

// Process Mega Millions data from official API
if ($megaMillionsAPI && !empty($megaMillionsAPI['winningNumbers'])) {
    $response['data']['megaMillions'] = [
        'name' => 'Mega Millions',
        'lastDrawDate' => $megaMillionsAPI['lastDrawDate'] ?? null,
        'winningNumbers' => $megaMillionsAPI['winningNumbers'],
        'specialBall' => $megaMillionsAPI['megaBall'] ?? 0,
        'specialBallName' => 'Mega Ball',
        'multiplier' => $megaMillionsAPI['megaplier'] ?? null,
        'jackpot' => $megaMillionsAPI['jackpot'] ?? null,
        'nextDrawing' => $megaMillionsAPI['nextDrawing'] ?? getNextDrawingDate('megamillions'),
        'drawDays' => 'Tue, Fri'
    ];
}

// Check for complete failure
if ($response['data']['powerball'] === null && $response['data']['megaMillions'] === null) {
    $response['success'] = false;
    $response['error'] = 'Failed to fetch lottery data from all sources';
}

echo json_encode($response);
