<?php
/**
 * Location Geocoding Search
 * Returns multiple results so user can pick the right one
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

$query = $_GET['q'] ?? '';

if (empty($query)) {
    respond(false, null, 'Search query is required');
}

// Use Open-Meteo geocoding API
$url = 'https://geocoding-api.open-meteo.com/v1/search?' . http_build_query([
    'name' => $query,
    'count' => 10,
    'language' => 'en',
    'format' => 'json'
]);

$response = @file_get_contents($url);
if ($response === false) {
    respond(false, null, 'Failed to search locations');
}

$data = json_decode($response, true);
if (!$data || empty($data['results'])) {
    respond(true, []);
}

// Format results
$locations = [];
foreach ($data['results'] as $result) {
    $parts = [$result['name']];

    // Add admin regions for context
    if (!empty($result['admin1'])) {
        $parts[] = $result['admin1'];
    }
    if (!empty($result['country'])) {
        $parts[] = $result['country'];
    }

    $locations[] = [
        'id' => $result['id'],
        'name' => $result['name'],
        'displayName' => implode(', ', $parts),
        'latitude' => $result['latitude'],
        'longitude' => $result['longitude'],
        'country' => $result['country'] ?? '',
        'admin1' => $result['admin1'] ?? '', // State/Province
        'admin2' => $result['admin2'] ?? '', // County
    ];
}

respond(true, $locations);
