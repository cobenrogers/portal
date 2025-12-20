<?php
/**
 * Daily Content API - Fetches daily content (quote, joke, word, history, trivia)
 *
 * Combines multiple daily content APIs into a single endpoint.
 * Accepts a 'content' parameter to specify which content types to fetch.
 *
 * Usage: GET /api/feeds/daily.php?content=quote,joke,word,history,trivia
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Use Mountain Time for daily content refresh (MDT/MST)
date_default_timezone_set('America/Denver');

$cacheDir = __DIR__ . '/../cache/';
$quoteCacheFile = $cacheDir . 'quote-cache.json';
$jokeCacheFile = $cacheDir . 'joke-cache.json';
$wordCacheFile = $cacheDir . 'word-cache.json';
$historyCacheFile = $cacheDir . 'history-cache.json';
$triviaCacheFile = $cacheDir . 'trivia-cache.json';
$today = date('Y-m-d'); // Now uses Mountain Time

// Parse requested content types
$validTypes = ['quote', 'joke', 'word', 'history', 'trivia'];
$requestedContent = isset($_GET['content']) ? explode(',', $_GET['content']) : ['quote', 'joke'];
$requestedContent = array_map('trim', $requestedContent);
$requestedContent = array_filter($requestedContent, fn($c) => in_array($c, $validTypes));

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
 * Fetch word of the day from Free Dictionary API with a curated word list
 * Since Free Dictionary doesn't have a WOTD endpoint, we pick a word from a curated list
 * based on the day of year for consistency
 */
function fetchWordFromApi(): ?array {
    // Curated word list - interesting vocabulary words
    $words = [
        'ephemeral', 'serendipity', 'mellifluous', 'eloquent', 'ubiquitous',
        'ethereal', 'luminous', 'resilient', 'enigmatic', 'paradigm',
        'quintessential', 'ineffable', 'epiphany', 'solitude', 'nostalgia',
        'euphoria', 'wanderlust', 'petrichor', 'sonder', 'vellichor',
        'aurora', 'cascade', 'effervescent', 'halcyon', 'incandescent',
        'labyrinthine', 'nebulous', 'opulent', 'pristine', 'quixotic',
        'renaissance', 'sublime', 'transcendent', 'verdant', 'whimsical',
        'zenith', 'ambivalent', 'benevolent', 'cacophony', 'dichotomy',
        'ebullient', 'fastidious', 'gregarious', 'harbinger', 'idyllic',
        'juxtapose', 'kinetic', 'loquacious', 'magnanimous', 'nefarious'
    ];

    // Pick word based on day of year for consistency
    $dayOfYear = date('z');
    $wordIndex = $dayOfYear % count($words);
    $word = $words[$wordIndex];

    $url = "https://api.dictionaryapi.dev/api/v2/entries/en/{$word}";

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

    $entry = $data[0];
    $meaning = $entry['meanings'][0] ?? null;

    if (!$meaning) {
        return null;
    }

    $definition = $meaning['definitions'][0] ?? null;

    return [
        'word' => $entry['word'] ?? $word,
        'definition' => $definition['definition'] ?? 'No definition available',
        'partOfSpeech' => $meaning['partOfSpeech'] ?? 'unknown',
        'example' => $definition['example'] ?? null
    ];
}

/**
 * Fetch this day in history from Muffinlabs API
 */
function fetchHistoryFromApi(): ?array {
    $month = date('n');
    $day = date('j');
    $url = "http://history.muffinlabs.com/date/{$month}/{$day}";

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
    if (!$data || !isset($data['data']['Events'])) {
        return null;
    }

    // Get a few interesting events (limit to 3 for display)
    $events = array_slice($data['data']['Events'], 0, 3);
    $formattedEvents = [];

    foreach ($events as $event) {
        $formattedEvents[] = [
            'year' => $event['year'] ?? '',
            'text' => $event['text'] ?? ''
        ];
    }

    return [
        'events' => $formattedEvents
    ];
}

/**
 * Fetch daily trivia from Open Trivia Database
 */
function fetchTriviaFromApi(): ?array {
    $url = 'https://opentdb.com/api.php?amount=1&type=multiple';

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
    if (!$data || $data['response_code'] !== 0 || empty($data['results'])) {
        return null;
    }

    $trivia = $data['results'][0];

    return [
        'question' => html_entity_decode($trivia['question'] ?? '', ENT_QUOTES | ENT_HTML5),
        'correctAnswer' => html_entity_decode($trivia['correct_answer'] ?? '', ENT_QUOTES | ENT_HTML5),
        'incorrectAnswers' => array_map(fn($a) => html_entity_decode($a, ENT_QUOTES | ENT_HTML5), $trivia['incorrect_answers'] ?? []),
        'category' => html_entity_decode($trivia['category'] ?? '', ENT_QUOTES | ENT_HTML5),
        'difficulty' => $trivia['difficulty'] ?? 'medium'
    ];
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

/**
 * Get word data (from cache or API)
 */
function getWord(string $cacheFile, string $today): ?array {
    // Try cache first
    $cached = getCached($cacheFile, $today);
    if ($cached) {
        return $cached;
    }

    // Fetch from API
    $word = fetchWordFromApi();
    if (!$word) {
        return null;
    }

    // Cache and return
    cacheData($cacheFile, $word, $today);
    $word['cachedAt'] = $today;
    return $word;
}

/**
 * Get history data (from cache or API)
 */
function getHistory(string $cacheFile, string $today): ?array {
    // Try cache first
    $cached = getCached($cacheFile, $today);
    if ($cached) {
        return $cached;
    }

    // Fetch from API
    $history = fetchHistoryFromApi();
    if (!$history) {
        return null;
    }

    // Cache and return
    cacheData($cacheFile, $history, $today);
    $history['cachedAt'] = $today;
    return $history;
}

/**
 * Get trivia data (from cache or API)
 */
function getTrivia(string $cacheFile, string $today): ?array {
    // Try cache first
    $cached = getCached($cacheFile, $today);
    if ($cached) {
        return $cached;
    }

    // Fetch from API
    $trivia = fetchTriviaFromApi();
    if (!$trivia) {
        return null;
    }

    // Cache and return
    cacheData($cacheFile, $trivia, $today);
    $trivia['cachedAt'] = $today;
    return $trivia;
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

if (in_array('word', $requestedContent)) {
    $word = getWord($wordCacheFile, $today);
    if ($word) {
        $result['word'] = $word;
    } else {
        $errors[] = 'Failed to fetch word';
    }
}

if (in_array('history', $requestedContent)) {
    $history = getHistory($historyCacheFile, $today);
    if ($history) {
        $result['history'] = $history;
    } else {
        $errors[] = 'Failed to fetch history';
    }
}

if (in_array('trivia', $requestedContent)) {
    $trivia = getTrivia($triviaCacheFile, $today);
    if ($trivia) {
        $result['trivia'] = $trivia;
    } else {
        $errors[] = 'Failed to fetch trivia';
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
