<?php
/**
 * Stock Quote API - Fetches stock data from Yahoo Finance
 *
 * Usage: GET /api/feeds/stocks.php?symbols=AAPL,GOOGL,MSFT
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Get symbols from query parameter
$symbolsParam = $_GET['symbols'] ?? '';
if (empty($symbolsParam)) {
    echo json_encode([
        'success' => false,
        'error' => 'Missing symbols parameter'
    ]);
    exit;
}

// Parse and validate symbols (limit to 10 to prevent abuse)
$symbols = array_slice(
    array_filter(
        array_map('trim', explode(',', strtoupper($symbolsParam))),
        fn($s) => preg_match('/^[A-Z]{1,5}$/', $s)
    ),
    0,
    10
);

if (empty($symbols)) {
    echo json_encode([
        'success' => false,
        'error' => 'No valid symbols provided'
    ]);
    exit;
}

/**
 * Fetch quote data for a single symbol from Yahoo Finance
 */
function fetchQuote(string $symbol): ?array {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}?interval=1d&range=1d";

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
        return null;
    }

    $data = json_decode($response, true);
    if (!$data || !isset($data['chart']['result'][0])) {
        return null;
    }

    $result = $data['chart']['result'][0];
    $meta = $result['meta'] ?? [];
    $quote = $result['indicators']['quote'][0] ?? [];

    // Get the latest values
    $currentPrice = $meta['regularMarketPrice'] ?? null;
    $previousClose = $meta['chartPreviousClose'] ?? $meta['previousClose'] ?? null;

    if ($currentPrice === null) {
        return null;
    }

    // Calculate change and percentage
    $change = $previousClose ? $currentPrice - $previousClose : 0;
    $changePercent = $previousClose ? ($change / $previousClose) * 100 : 0;

    // Get high/low from quote data
    $highs = $quote['high'] ?? [];
    $lows = $quote['low'] ?? [];
    $dayHigh = !empty($highs) ? max(array_filter($highs, fn($v) => $v !== null)) : null;
    $dayLow = !empty($lows) ? min(array_filter($lows, fn($v) => $v !== null)) : null;

    return [
        'symbol' => $symbol,
        'name' => $meta['shortName'] ?? $meta['longName'] ?? $symbol,
        'price' => round($currentPrice, 2),
        'change' => round($change, 2),
        'changePercent' => round($changePercent, 2),
        'previousClose' => $previousClose ? round($previousClose, 2) : null,
        'dayHigh' => $dayHigh ? round($dayHigh, 2) : null,
        'dayLow' => $dayLow ? round($dayLow, 2) : null,
        'volume' => $meta['regularMarketVolume'] ?? null,
        'marketState' => $meta['marketState'] ?? 'UNKNOWN',
        'exchange' => $meta['exchangeName'] ?? null
    ];
}

// Fetch all symbols
$quotes = [];
$errors = [];

foreach ($symbols as $symbol) {
    $quote = fetchQuote($symbol);
    if ($quote) {
        $quotes[] = $quote;
    } else {
        $errors[] = $symbol;
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'quotes' => $quotes,
        'errors' => $errors,
        'timestamp' => date('c')
    ]
]);
