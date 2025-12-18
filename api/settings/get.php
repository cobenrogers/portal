<?php
/**
 * Get Portal Settings
 * Returns current settings (no auth required for reading)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';

function respond($success, $data = null, $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

// Load settings from file, or return defaults
if (file_exists(SETTINGS_FILE)) {
    $content = file_get_contents(SETTINGS_FILE);
    $settings = json_decode($content, true);

    if ($settings) {
        respond(true, $settings);
    }
}

// Return default settings
respond(true, getDefaultSettings());
