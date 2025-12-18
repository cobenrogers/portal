<?php
/**
 * Stock Symbol Search API - Search for stock tickers via Yahoo Finance
 *
 * Usage: GET /api/feeds/stock-search.php?q=apple
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: max-age=300'); // Cache for 5 minutes

$query = $_GET['q'] ?? '';
if (empty($query) || strlen($query) < 1) {
    echo json_encode([
        'success' => false,
        'error' => 'Missing or invalid query parameter'
    ]);
    exit;
}

/**
 * Search for stock symbols using Yahoo Finance autocomplete API
 */
function searchSymbols(string $query): array {
    $url = "https://query1.finance.yahoo.com/v1/finance/search?" . http_build_query([
        'q' => $query,
        'quotesCount' => 10,
        'newsCount' => 0,
        'listsCount' => 0,
        'enableFuzzyQuery' => false,
        'quotesQueryId' => 'tss_match_phrase_query'
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept: application/json'
            ],
            'timeout' => 10
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return [];
    }

    $data = json_decode($response, true);
    if (!$data || !isset($data['quotes'])) {
        return [];
    }

    $results = [];
    foreach ($data['quotes'] as $quote) {
        // Filter to only show stocks and ETFs (skip futures, currencies without proper structure, etc.)
        $quoteType = $quote['quoteType'] ?? '';
        if (!in_array($quoteType, ['EQUITY', 'ETF', 'INDEX', 'CRYPTOCURRENCY', 'MUTUALFUND'])) {
            continue;
        }

        $results[] = [
            'symbol' => $quote['symbol'] ?? '',
            'name' => $quote['shortname'] ?? $quote['longname'] ?? $quote['symbol'] ?? '',
            'exchange' => $quote['exchange'] ?? '',
            'type' => $quoteType,
            'exchDisp' => $quote['exchDisp'] ?? ''
        ];
    }

    return array_slice($results, 0, 10);
}

$results = searchSymbols($query);

echo json_encode([
    'success' => true,
    'data' => $results
]);
