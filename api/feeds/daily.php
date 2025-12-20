<?php
/**
 * Daily Content API - Fetches daily quote and joke data
 *
 * Combines quote and joke APIs into a single endpoint.
 * Accepts a 'content' parameter to specify which content types to fetch.
 *
 * Usage: GET /api/feeds/daily.php?content=quote,joke
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

$cacheDir = __DIR__ . '/../cache/';
$quoteCacheFile = $cacheDir . 'quote-cache.json';
$jokeCacheFile = $cacheDir . 'joke-cache.json';
$today = date('Y-m-d');

// Parse requested content types
$requestedContent = isset($_GET['content']) ? explode(',', $_GET['content']) : ['quote', 'joke'];
$requestedContent = array_map('trim', $requestedContent);
$requestedContent = array_filter($requestedContent, fn($c) => in_array($c, ['quote', 'joke']));

if (empty($requestedContent)) {
    $requestedContent = ['quote', 'joke'];
}

/**
 * Check if we have a valid cached item for today
 */
function getCached(string $cacheFile, string $today): ?array {
    if (!file_exists($cacheFile)) {
        return null;
    }

    $cached = json_decode(file_get_contents($cacheFile), true);
    if (!$cached || !isset($cached['cachedAt']) || $cached['cachedAt'] !== $today) {
        return null;
    }

    return $cached;
}

/**
 * Fetch quote from ZenQuotes API
 */
function fetchQuoteFromApi(): ?array {
    $url = 'https://zenquotes.io/api/today';

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Accept: application/json',
                'User-Agent: Portal/1.0'
            ],
            'timeout' => 10
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!$data || !is_array($data) || empty($data[0])) {
        return null;
    }

    $quote = $data[0];
    return [
        'content' => $quote['q'] ?? '',
        'author' => $quote['a'] ?? 'Unknown'
    ];
}

/**
 * Fetch joke from JokeAPI
 * Uses safe-mode to exclude nsfw, religious, political, racist, sexist, explicit content
 */
function fetchJokeFromApi(): ?array {
    $url = 'https://v2.jokeapi.dev/joke/Any?safe-mode';

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Accept: application/json',
                'User-Agent: Portal/1.0'
            ],
            'timeout' => 10
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!$data || isset($data['error']) && $data['error'] === true) {
        return null;
    }

    $joke = [
        'type' => $data['type'] ?? 'single',
        'category' => $data['category'] ?? 'Misc'
    ];

    if ($data['type'] === 'single') {
        $joke['joke'] = $data['joke'] ?? '';
    } else {
        $joke['setup'] = $data['setup'] ?? '';
        $joke['punchline'] = $data['delivery'] ?? '';
    }

    return $joke;
}

/**
 * Save data to cache
 */
function cacheData(string $cacheFile, array $data, string $today): void {
    $data['cachedAt'] = $today;
    file_put_contents($cacheFile, json_encode($data, JSON_PRETTY_PRINT));
}

/**
 * Get quote data (from cache or API)
 */
function getQuote(string $cacheFile, string $today): ?array {
    // Try cache first
    $cached = getCached($cacheFile, $today);
    if ($cached) {
        return $cached;
    }

    // Fetch from API
    $quote = fetchQuoteFromApi();
    if (!$quote) {
        return null;
    }

    // Cache and return
    cacheData($cacheFile, $quote, $today);
    $quote['cachedAt'] = $today;
    return $quote;
}

/**
 * Get joke data (from cache or API)
 */
function getJoke(string $cacheFile, string $today): ?array {
    // Try cache first
    $cached = getCached($cacheFile, $today);
    if ($cached) {
        return $cached;
    }

    // Fetch from API
    $joke = fetchJokeFromApi();
    if (!$joke) {
        return null;
    }

    // Cache and return
    cacheData($cacheFile, $joke, $today);
    $joke['cachedAt'] = $today;
    return $joke;
}

// Build response with requested content
$result = [];
$errors = [];

if (in_array('quote', $requestedContent)) {
    $quote = getQuote($quoteCacheFile, $today);
    if ($quote) {
        $result['quote'] = $quote;
    } else {
        $errors[] = 'Failed to fetch quote';
    }
}

if (in_array('joke', $requestedContent)) {
    $joke = getJoke($jokeCacheFile, $today);
    if ($joke) {
        $result['joke'] = $joke;
    } else {
        $errors[] = 'Failed to fetch joke';
    }
}

// Return response
if (empty($result)) {
    echo json_encode([
        'success' => false,
        'error' => implode(', ', $errors)
    ]);
} else {
    echo json_encode([
        'success' => true,
        'data' => $result,
        'errors' => $errors
    ]);
}
