<?php
/**
 * RSS/Atom Feed Fetcher
 * Proxies feed requests to avoid CORS issues
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

function getImageFromItem($item, $namespaces) {
    // Try media namespace (various formats)
    if (isset($namespaces['media'])) {
        $media = $item->children($namespaces['media']);

        // Try media:thumbnail directly
        if (isset($media->thumbnail)) {
            $url = (string)$media->thumbnail->attributes()['url'];
            if ($url) return $url;
        }

        // Try media:content directly (check if it's an image)
        if (isset($media->content)) {
            $attrs = $media->content->attributes();
            $medium = (string)$attrs['medium'];
            $type = (string)$attrs['type'];
            if ($medium === 'image' || strpos($type, 'image') !== false) {
                $url = (string)$attrs['url'];
                if ($url) return $url;
            }
        }

        // Try media:group (CNN, others) - contains multiple media:content
        if (isset($media->group)) {
            $group = $media->group->children($namespaces['media']);
            // Look for thumbnail first
            if (isset($group->thumbnail)) {
                $url = (string)$group->thumbnail->attributes()['url'];
                if ($url) return $url;
            }
            // Then try content elements
            foreach ($group->content as $content) {
                $attrs = $content->attributes();
                $medium = (string)$attrs['medium'];
                $type = (string)$attrs['type'];
                if ($medium === 'image' || strpos($type, 'image') !== false) {
                    $url = (string)$attrs['url'];
                    if ($url) return $url;
                }
            }
        }
    }

    // Try enclosure (podcasts, some feeds)
    if (isset($item->enclosure)) {
        $type = (string)$item->enclosure->attributes()['type'];
        if (strpos($type, 'image') !== false) {
            return (string)$item->enclosure->attributes()['url'];
        }
    }

    // Try to extract image from description HTML
    $desc = (string)$item->description;
    if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $desc, $matches)) {
        return $matches[1];
    }

    // Try content:encoded for embedded images (WordPress standard)
    if (isset($namespaces['content'])) {
        $content = $item->children($namespaces['content']);
        if (isset($content->encoded)) {
            $encoded = (string)$content->encoded;
            if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $encoded, $matches)) {
                return $matches[1];
            }
        }
    }

    // Fallback: try direct content:encoded access (different XML parsing)
    $contentEncoded = $item->children('http://purl.org/rss/1.0/modules/content/');
    if (isset($contentEncoded->encoded)) {
        $encoded = (string)$contentEncoded->encoded;
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $encoded, $matches)) {
            return $matches[1];
        }
    }

    return null;
}

function parseFeed($xml) {
    $items = [];
    $namespaces = $xml->getNamespaces(true);

    // Try RSS 2.0 format first
    if (isset($xml->channel->item)) {
        foreach ($xml->channel->item as $item) {
            $items[] = [
                'id' => md5((string)$item->link . (string)$item->title),
                'title' => (string)$item->title,
                'link' => (string)$item->link,
                'description' => strip_tags((string)$item->description),
                'pubDate' => isset($item->pubDate) ? date('c', strtotime((string)$item->pubDate)) : null,
                'source' => (string)$xml->channel->title,
                'image' => getImageFromItem($item, $namespaces)
            ];
        }
    }
    // Try Atom format
    elseif (isset($xml->entry)) {
        foreach ($xml->entry as $entry) {
            $link = '';
            if (isset($entry->link['href'])) {
                $link = (string)$entry->link['href'];
            } elseif (isset($entry->link)) {
                foreach ($entry->link as $l) {
                    if ((string)$l['rel'] === 'alternate' || empty((string)$l['rel'])) {
                        $link = (string)$l['href'];
                        break;
                    }
                }
            }

            // Try to get image from Atom feed
            $image = null;
            if (isset($namespaces['media'])) {
                $media = $entry->children($namespaces['media']);
                if (isset($media->thumbnail)) {
                    $image = (string)$media->thumbnail->attributes()['url'];
                }
            }

            $items[] = [
                'id' => md5($link . (string)$entry->title),
                'title' => (string)$entry->title,
                'link' => $link,
                'description' => isset($entry->summary) ? strip_tags((string)$entry->summary) : '',
                'pubDate' => isset($entry->updated) ? date('c', strtotime((string)$entry->updated)) : null,
                'source' => isset($xml->title) ? (string)$xml->title : '',
                'image' => $image
            ];
        }
    }

    return $items;
}

// Get feed URL from query parameter
$feedUrl = $_GET['url'] ?? '';

if (empty($feedUrl)) {
    respond(false, null, 'Feed URL is required');
}

// Validate URL
if (!filter_var($feedUrl, FILTER_VALIDATE_URL)) {
    respond(false, null, 'Invalid feed URL');
}

// Fetch the feed using cURL for better compatibility
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $feedUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
        'Accept-Language: en-US,en;q=0.9',
        'Cache-Control: no-cache',
    ],
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; PortalFeedReader/1.0; +https://bennernet.com)',
]);

$content = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($content === false || $httpCode >= 400) {
    respond(false, null, $error ?: "Failed to fetch feed (HTTP $httpCode)");
}

// Check if we got HTML instead of XML (some sites redirect feeds to homepage)
$trimmedContent = ltrim($content);
if (stripos($trimmedContent, '<!DOCTYPE html') === 0 || stripos($trimmedContent, '<html') === 0) {
    respond(false, null, 'Feed URL returned HTML instead of RSS/XML. The feed may be disabled or the URL may be incorrect.');
}

// Parse XML
libxml_use_internal_errors(true);
$xml = simplexml_load_string($content);

if ($xml === false) {
    $errors = libxml_get_errors();
    libxml_clear_errors();
    respond(false, null, 'Failed to parse feed XML');
}

// Parse feed items
$items = parseFeed($xml);

respond(true, [
    'items' => $items,
    'lastUpdated' => date('c')
]);
