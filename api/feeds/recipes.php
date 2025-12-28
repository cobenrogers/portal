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

// Fetch from Glyc API
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'header' => "Accept: application/json\r\n"
    ]
]);

$response = @file_get_contents($url, false, $context);

if ($response === false) {
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
