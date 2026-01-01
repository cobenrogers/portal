<?php
/**
 * Debug script to see raw feed content
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$feedUrl = 'https://ibdmovement.com/feed/';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $feedUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Accept: application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
    ],
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; PortalFeedReader/1.0; +https://bennernet.com)',
]);

$content = curl_exec($ch);
curl_close($ch);

$xml = simplexml_load_string($content);
$namespaces = $xml->getNamespaces(true);

$debug = [];
$debug['namespaces'] = $namespaces;

// Get first item
if (isset($xml->channel->item[0])) {
    $item = $xml->channel->item[0];
    $debug['item_title'] = (string)$item->title;
    $debug['item_description_raw'] = (string)$item->description;

    // Try content namespace
    $contentNs = 'http://purl.org/rss/1.0/modules/content/';
    $contentChildren = $item->children($contentNs);
    $debug['content_children_count'] = count($contentChildren);

    if (isset($contentChildren->encoded)) {
        $encoded = (string)$contentChildren->encoded;
        $debug['content_encoded_length'] = strlen($encoded);
        $debug['content_encoded_preview'] = substr($encoded, 0, 500);

        // Try to find img
        if (preg_match('/<img[^>]+src\s*=\s*["\']([^"\']+)["\']/', $encoded, $matches)) {
            $debug['found_image'] = $matches[1];
        } else {
            $debug['found_image'] = 'NO MATCH';
            // Show any img tags
            if (preg_match_all('/<img[^>]+>/', $encoded, $imgMatches)) {
                $debug['img_tags_found'] = $imgMatches[0];
            }
        }
    } else {
        $debug['content_encoded'] = 'NOT FOUND';
    }

    // Also try via namespace alias
    if (isset($namespaces['content'])) {
        $contentViaAlias = $item->children($namespaces['content']);
        $debug['content_via_alias_count'] = count($contentViaAlias);
        if (isset($contentViaAlias->encoded)) {
            $debug['content_via_alias_length'] = strlen((string)$contentViaAlias->encoded);
        }
    }
}

echo json_encode($debug, JSON_PRETTY_PRINT);
