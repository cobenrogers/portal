<?php
/**
 * Save Portal Settings
 * Requires PIN authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

function respond($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    respond(false, null, 'Method not allowed');
}

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    respond(false, null, 'Invalid request body');
}

$pin = $input['pin'] ?? '';
$settings = $input['settings'] ?? null;

// Verify PIN
if ($pin !== SETTINGS_PIN) {
    http_response_code(401);
    respond(false, null, 'Invalid PIN');
}

// Validate settings structure
if (!$settings || !is_array($settings)) {
    respond(false, null, 'Invalid settings data');
}

// Save settings to file
$result = file_put_contents(SETTINGS_FILE, json_encode($settings, JSON_PRETTY_PRINT));

if ($result === false) {
    respond(false, null, 'Failed to save settings');
}

respond(true);
