<?php
/**
 * Recipe Suggestions API Proxy
 * Fetches random recipes from Glyc API (getglyc.com)
 */

header('Content-Type: application/json');

// Parameters
$count = isset($_GET['count']) ? max(1, min(10, (int)$_GET['count'])) : 3;
$category = isset($_GET['category']) ? trim($_GET['category']) : '';

// Build Glyc API URL
$glycApiUrl = 'https://getglyc.com/api/recipes/random';
$params = ['count' => $count];
if ($category) {
    $params['category'] = $category;
}
$url = $glycApiUrl . '?' . http_build_query($params);

/**
 * Fetch URL using cURL (preferred) or file_get_contents fallback
 */
function fetchUrl(string $url, int $timeout = 10): ?string {
    // Try cURL first (preferred)
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => [
                'User-Agent: Portal Dashboard/1.0',
                'Accept: application/json'
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            return null;
        }

        return $response;
    }

    // Fallback to file_get_contents
    $context = stream_context_create([
        'http' => [
            'timeout' => $timeout,
            'header' => "Accept: application/json\r\n"
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    return $response === false ? null : $response;
}

$response = fetchUrl($url);

if ($response === null) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch recipes from Glyc'
    ]);
    exit;
}

$data = json_decode($response, true);

if (!$data || !isset($data['success']) || !$data['success']) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => $data['error']['message'] ?? 'Invalid response from Glyc API'
    ]);
    exit;
}

// Transform recipes to include proper URLs
$recipes = array_map(function($recipe) {
    return [
        'id' => $recipe['id'],
        'title' => $recipe['title'],
        'url' => 'https://getglyc.com/#/recipe/' . $recipe['id'],
        'sourceUrl' => $recipe['source_url'] ?? null
    ];
}, $data['recipes'] ?? []);

echo json_encode([
    'success' => true,
    'data' => [
        'recipes' => $recipes
    ]
]);
