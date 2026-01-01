<?php
/**
 * Image Proxy API
 * Fetches external images to bypass hotlink protection and CORS issues
 *
 * Security: Validates URLs to prevent SSRF attacks
 * Caching: Stores images locally with hash-based filenames
 */

// Cache configuration
define('CACHE_DIR', __DIR__ . '/../cache/images');
define('CACHE_TTL', 86400); // 24 hours in seconds

// Get image URL from query parameter
$imageUrl = $_GET['url'] ?? '';

/**
 * Send error response with appropriate status code
 */
function respondError(int $httpCode, string $message): void {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit;
}

/**
 * Check if an IP address is private/internal (SSRF prevention)
 */
function isPrivateIp(string $ip): bool {
    // Check for private and reserved IP ranges
    $privateRanges = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.0/8',
        '169.254.0.0/16',
        '0.0.0.0/8',
        '224.0.0.0/4',     // Multicast
        '240.0.0.0/4',     // Reserved
        '::1/128',         // IPv6 localhost
        'fc00::/7',        // IPv6 private
        'fe80::/10',       // IPv6 link-local
    ];

    // Use filter_var for quick checks
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        return true;
    }

    return false;
}

/**
 * Validate URL for security (SSRF prevention)
 */
function validateUrl(string $url): bool {
    // Must be valid URL
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }

    // Parse URL
    $parsed = parse_url($url);
    if ($parsed === false) {
        return false;
    }

    // Must be http or https
    $scheme = strtolower($parsed['scheme'] ?? '');
    if ($scheme !== 'http' && $scheme !== 'https') {
        return false;
    }

    // Must have a host
    $host = $parsed['host'] ?? '';
    if (empty($host)) {
        return false;
    }

    // Block localhost and common internal hostnames
    $blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
    if (in_array(strtolower($host), $blockedHosts, true)) {
        return false;
    }

    // Resolve hostname to IP and check if private
    $ip = gethostbyname($host);
    if ($ip !== $host && isPrivateIp($ip)) {
        return false;
    }

    return true;
}

/**
 * Get the origin domain from a URL for Referer header
 */
function getOriginDomain(string $url): string {
    $parsed = parse_url($url);
    if ($parsed === false || !isset($parsed['scheme']) || !isset($parsed['host'])) {
        return '';
    }

    $origin = $parsed['scheme'] . '://' . $parsed['host'];
    if (isset($parsed['port'])) {
        $origin .= ':' . $parsed['port'];
    }

    return $origin;
}

/**
 * Allowed MIME types for images
 */
function isAllowedMimeType(string $mimeType): bool {
    $allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/avif',
        'image/bmp',
        'image/ico',
        'image/x-icon',
        'image/vnd.microsoft.icon',
    ];

    // Normalize and extract base type (ignore charset, etc.)
    $baseMimeType = strtolower(trim(explode(';', $mimeType)[0]));

    return in_array($baseMimeType, $allowedTypes, true);
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(string $mimeType): string {
    $baseMimeType = strtolower(trim(explode(';', $mimeType)[0]));

    $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg',
        'image/avif' => 'avif',
        'image/bmp' => 'bmp',
        'image/ico' => 'ico',
        'image/x-icon' => 'ico',
        'image/vnd.microsoft.icon' => 'ico',
    ];

    return $mimeToExt[$baseMimeType] ?? 'bin';
}

/**
 * Generate cache file path from URL
 * Uses MD5 hash of URL for filename, with extension from MIME type
 */
function getCacheFilePath(string $url, string $extension = 'bin'): string {
    $hash = md5($url);
    return CACHE_DIR . '/' . $hash . '.' . $extension;
}

/**
 * Find existing cache file for URL (any extension)
 * Returns cache path and content type if valid cache exists
 */
function findCachedImage(string $url): ?array {
    $hash = md5($url);
    $pattern = CACHE_DIR . '/' . $hash . '.*';
    $files = glob($pattern);

    if (empty($files)) {
        return null;
    }

    $cacheFile = $files[0];

    // Check if cache is still valid (not expired)
    if (!file_exists($cacheFile) || (time() - filemtime($cacheFile)) > CACHE_TTL) {
        // Cache expired, delete it
        @unlink($cacheFile);
        return null;
    }

    // Determine content type from extension
    $extension = pathinfo($cacheFile, PATHINFO_EXTENSION);
    $extToMime = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'avif' => 'image/avif',
        'bmp' => 'image/bmp',
        'ico' => 'image/x-icon',
    ];

    $contentType = $extToMime[$extension] ?? 'application/octet-stream';

    return [
        'path' => $cacheFile,
        'content_type' => $contentType,
    ];
}

/**
 * Save image data to cache
 * Silently fails if cache directory is not writable
 */
function saveToCache(string $url, string $data, string $contentType): void {
    // Ensure cache directory exists
    if (!is_dir(CACHE_DIR)) {
        @mkdir(CACHE_DIR, 0755, true);
    }

    // Check if directory is writable
    if (!is_writable(CACHE_DIR)) {
        return; // Gracefully fail - serve image without caching
    }

    $extension = getExtensionFromMimeType($contentType);
    $cacheFile = getCacheFilePath($url, $extension);

    // Write to cache (silently fail if error)
    @file_put_contents($cacheFile, $data);
}

/**
 * Fetch image using cURL with proper headers for hotlink bypass
 */
function fetchImage(string $url, int $timeout = 10, int $maxSize = 5242880): ?array {
    if (!function_exists('curl_init')) {
        return null;
    }

    $ch = curl_init();

    // Get origin domain for Referer header (bypasses hotlink protection)
    $referer = getOriginDomain($url);

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_HTTPHEADER => [
            'Accept: image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.9',
        ],
        CURLOPT_REFERER => $referer,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        // Limit download size
        CURLOPT_PROGRESSFUNCTION => function($ch, $downloadSize, $downloaded) use ($maxSize) {
            if ($downloaded > $maxSize || $downloadSize > $maxSize) {
                return 1; // Abort transfer
            }
            return 0;
        },
        CURLOPT_NOPROGRESS => false,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        return null;
    }

    // Validate MIME type
    if (empty($contentType) || !isAllowedMimeType($contentType)) {
        return null;
    }

    return [
        'data' => $response,
        'content_type' => $contentType,
    ];
}

// Validate URL is provided
if (empty($imageUrl)) {
    respondError(400, 'Image URL is required');
}

// Validate URL format and security
if (!validateUrl($imageUrl)) {
    respondError(400, 'Invalid or disallowed image URL');
}

// Check cache first
$cached = findCachedImage($imageUrl);
if ($cached !== null) {
    // Serve from cache
    header('Content-Type: ' . $cached['content_type']);
    header('Cache-Control: public, max-age=' . CACHE_TTL);
    header('Access-Control-Allow-Origin: *');
    header('X-Cache: HIT');
    readfile($cached['path']);
    exit;
}

// Fetch the image from origin
$result = fetchImage($imageUrl);

if ($result === null) {
    respondError(502, 'Failed to fetch image');
}

// Save to cache (gracefully handles errors)
saveToCache($imageUrl, $result['data'], $result['content_type']);

// Output the image with appropriate headers
header('Content-Type: ' . $result['content_type']);
header('Cache-Control: public, max-age=' . CACHE_TTL);
header('Access-Control-Allow-Origin: *');
header('X-Cache: MISS');

echo $result['data'];
