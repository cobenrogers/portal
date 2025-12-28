<?php
/**
 * Bitcoin Mining API - Fetches mining stats from public-pool.io
 *
 * Usage: GET /api/feeds/bitcoin-mining.php?wallet=3Lz1kdPGRqytQsPnz1md7dPqBxPjhXAuR1
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Get wallet address from query parameter
$wallet = $_GET['wallet'] ?? '';
if (empty($wallet)) {
    echo json_encode([
        'success' => false,
        'error' => 'Missing wallet parameter'
    ]);
    exit;
}

// Validate wallet address format (Bitcoin addresses are 26-35 alphanumeric characters)
if (!preg_match('/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/', $wallet)) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid Bitcoin wallet address format'
    ]);
    exit;
}

/**
 * Fetch client/miner data from public-pool.io
 */
function fetchMiningData(string $wallet): ?array {
    // Public Pool API endpoint (port 40557)
    $clientUrl = "https://public-pool.io:40557/api/client/{$wallet}";

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Portal Dashboard/1.0',
                'Accept: application/json'
            ],
            'timeout' => 15
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ]);

    $response = @file_get_contents($clientUrl, false, $context);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!$data) {
        return null;
    }

    return $data;
}

/**
 * Fetch pool-wide statistics
 */
function fetchPoolStats(): ?array {
    $poolUrl = "https://public-pool.io:40557/api/pool";

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: Portal Dashboard/1.0',
                'Accept: application/json'
            ],
            'timeout' => 10
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ]);

    $response = @file_get_contents($poolUrl, false, $context);
    if ($response === false) {
        return null;
    }

    return json_decode($response, true);
}

/**
 * Format hashrate to human-readable string
 */
function formatHashrate(float $hashrate): string {
    $units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
    $unitIndex = 0;

    while ($hashrate >= 1000 && $unitIndex < count($units) - 1) {
        $hashrate /= 1000;
        $unitIndex++;
    }

    return number_format($hashrate, 2) . ' ' . $units[$unitIndex];
}

/**
 * Calculate time since last seen
 */
function getTimeSince(string $timestamp): string {
    $lastSeen = new DateTime($timestamp);
    $now = new DateTime();
    $diff = $now->diff($lastSeen);

    if ($diff->days > 0) {
        return $diff->days . 'd ago';
    } elseif ($diff->h > 0) {
        return $diff->h . 'h ago';
    } elseif ($diff->i > 0) {
        return $diff->i . 'm ago';
    } else {
        return 'Just now';
    }
}

// Fetch mining data
$miningData = fetchMiningData($wallet);
if ($miningData === null) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch mining data. Wallet may not be active on public-pool.io'
    ]);
    exit;
}

// Fetch pool stats (optional, don't fail if unavailable)
$poolStats = fetchPoolStats();

// Calculate total hashrate from all workers
$totalHashrate = 0;
$workers = [];

if (isset($miningData['workers']) && is_array($miningData['workers'])) {
    foreach ($miningData['workers'] as $worker) {
        $hashrate = floatval($worker['hashRate'] ?? 0);
        $totalHashrate += $hashrate;

        $workers[] = [
            'name' => $worker['name'] ?? 'Unknown',
            'sessionId' => $worker['sessionId'] ?? '',
            'hashrate' => $hashrate,
            'hashrateFormatted' => formatHashrate($hashrate),
            'bestDifficulty' => floatval($worker['bestDifficulty'] ?? 0),
            'startTime' => $worker['startTime'] ?? null,
            'lastSeen' => $worker['lastSeen'] ?? null,
            'lastSeenAgo' => isset($worker['lastSeen']) ? getTimeSince($worker['lastSeen']) : 'Unknown',
            'isOnline' => isset($worker['lastSeen']) &&
                (new DateTime())->diff(new DateTime($worker['lastSeen']))->i < 5
        ];
    }
}

// Build response
$response = [
    'wallet' => $wallet,
    'walletShort' => substr($wallet, 0, 8) . '...' . substr($wallet, -6),
    'bestDifficulty' => floatval($miningData['bestDifficulty'] ?? 0),
    'workersCount' => intval($miningData['workersCount'] ?? 0),
    'totalHashrate' => $totalHashrate,
    'totalHashrateFormatted' => formatHashrate($totalHashrate),
    'workers' => $workers,
    'poolUrl' => "https://web.public-pool.io/#/app/{$wallet}"
];

// Add pool stats if available
if ($poolStats) {
    $response['pool'] = [
        'totalHashrate' => floatval($poolStats['totalHashRate'] ?? 0),
        'totalHashrateFormatted' => formatHashrate(floatval($poolStats['totalHashRate'] ?? 0)),
        'totalMiners' => intval($poolStats['totalMiners'] ?? 0),
        'blockHeight' => intval($poolStats['blockHeight'] ?? 0),
        'fee' => floatval($poolStats['fee'] ?? 0)
    ];
}

echo json_encode([
    'success' => true,
    'data' => $response
]);
