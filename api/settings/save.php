<?php
/**
 * Save Portal Settings
 * Requires session authentication (approved user)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

// Try to load auth - fallback to PIN if auth not configured
// Path: portal/api/settings/ -> agents/auth/ (3 levels up)
$authAvailable = file_exists(__DIR__ . '/../../../auth/shared/auth.php') &&
                 file_exists(__DIR__ . '/../../../auth/auth-config.php');

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

$settings = $input['settings'] ?? null;

// Authenticate user
if ($authAvailable) {
    // Use session-based auth
    require_once __DIR__ . '/../../../auth/shared/auth.php';

    $user = getCurrentUser();

    if (!$user) {
        http_response_code(401);
        respond(false, null, 'Not authenticated');
    }

    if (!$user['is_approved'] && !$user['is_admin']) {
        http_response_code(403);
        respond(false, null, 'Account pending approval');
    }

    // TODO: In future, save to database per-user instead of file
    // For now, save to file (only approved users can save)

} else {
    // Fallback: PIN-based auth (legacy mode)
    $pin = $input['pin'] ?? '';

    if ($pin !== SETTINGS_PIN) {
        http_response_code(401);
        respond(false, null, 'Invalid PIN');
    }
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
