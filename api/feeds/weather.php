<?php
/**
 * Weather Data Fetcher
 * Uses Open-Meteo (free, no API key required)
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

function getCoordinates($location) {
    // Use Open-Meteo geocoding API
    $url = 'https://geocoding-api.open-meteo.com/v1/search?' . http_build_query([
        'name' => $location,
        'count' => 1,
        'language' => 'en',
        'format' => 'json'
    ]);

    $response = @file_get_contents($url);
    if ($response === false) return null;

    $data = json_decode($response, true);
    if (empty($data['results'])) return null;

    return [
        'lat' => $data['results'][0]['latitude'],
        'lon' => $data['results'][0]['longitude'],
        'name' => $data['results'][0]['name'],
        'country' => $data['results'][0]['country'] ?? ''
    ];
}

function getWeatherDescription($code) {
    $descriptions = [
        0 => 'Clear sky',
        1 => 'Mainly clear',
        2 => 'Partly cloudy',
        3 => 'Overcast',
        45 => 'Fog',
        48 => 'Depositing rime fog',
        51 => 'Light drizzle',
        53 => 'Moderate drizzle',
        55 => 'Dense drizzle',
        61 => 'Slight rain',
        63 => 'Moderate rain',
        65 => 'Heavy rain',
        71 => 'Slight snow',
        73 => 'Moderate snow',
        75 => 'Heavy snow',
        77 => 'Snow grains',
        80 => 'Slight rain showers',
        81 => 'Moderate rain showers',
        82 => 'Violent rain showers',
        85 => 'Slight snow showers',
        86 => 'Heavy snow showers',
        95 => 'Thunderstorm',
        96 => 'Thunderstorm with slight hail',
        99 => 'Thunderstorm with heavy hail'
    ];
    return $descriptions[$code] ?? 'Unknown';
}

$location = $_GET['location'] ?? '';
$lat = $_GET['lat'] ?? '';
$lon = $_GET['lon'] ?? '';
$units = $_GET['units'] ?? 'imperial';

// If lat/lon provided, use them directly
if (!empty($lat) && !empty($lon)) {
    $coords = [
        'lat' => (float)$lat,
        'lon' => (float)$lon,
        'name' => $location ?: 'Selected Location',
        'country' => ''
    ];
} else {
    // Fall back to geocoding by location name
    if (empty($location)) {
        respond(false, null, 'Location is required');
    }

    $coords = getCoordinates($location);
    if (!$coords) {
        respond(false, null, 'Location not found');
    }
}

// Fetch weather from Open-Meteo
$tempUnit = $units === 'imperial' ? 'fahrenheit' : 'celsius';
$windUnit = $units === 'imperial' ? 'mph' : 'kmh';

$weatherUrl = 'https://api.open-meteo.com/v1/forecast?' . http_build_query([
    'latitude' => $coords['lat'],
    'longitude' => $coords['lon'],
    'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    'daily' => 'weather_code,temperature_2m_max,temperature_2m_min',
    'temperature_unit' => $tempUnit,
    'wind_speed_unit' => $windUnit,
    'timezone' => 'auto',
    'forecast_days' => 5
]);

$weatherResponse = @file_get_contents($weatherUrl);
if ($weatherResponse === false) {
    respond(false, null, 'Failed to fetch weather data');
}

$weather = json_decode($weatherResponse, true);
if (!$weather || isset($weather['error'])) {
    respond(false, null, 'Invalid weather data');
}

$current = $weather['current'] ?? [];
$daily = $weather['daily'] ?? [];

// Build forecast array
$forecast = [];
if (!empty($daily['time'])) {
    for ($i = 1; $i < min(4, count($daily['time'])); $i++) {
        $forecast[] = [
            'date' => date('D', strtotime($daily['time'][$i])),
            'high' => $daily['temperature_2m_max'][$i] ?? 0,
            'low' => $daily['temperature_2m_min'][$i] ?? 0,
            'description' => getWeatherDescription($daily['weather_code'][$i] ?? 0),
            'icon' => 'cloud'
        ];
    }
}

$locationName = $coords['name'];
if ($coords['country']) {
    $locationName .= ', ' . $coords['country'];
}

respond(true, [
    'location' => $locationName,
    'temperature' => $current['temperature_2m'] ?? 0,
    'feelsLike' => $current['apparent_temperature'] ?? 0,
    'description' => getWeatherDescription($current['weather_code'] ?? 0),
    'icon' => 'cloud',
    'humidity' => $current['relative_humidity_2m'] ?? 0,
    'windSpeed' => $current['wind_speed_10m'] ?? 0,
    'forecast' => $forecast
]);
