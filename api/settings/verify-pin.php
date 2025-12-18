<?php
/**
 * Verify PIN
 * Check if provided PIN is correct
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

// Verify PIN
$isValid = $pin === SETTINGS_PIN;

respond(true, ['valid' => $isValid]);
