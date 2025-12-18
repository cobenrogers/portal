<?php
/**
 * Portal Settings Configuration
 * PIN: 236543
 */

define('SETTINGS_PIN', '236543');
define('SETTINGS_FILE', __DIR__ . '/portal-settings.json');

function getDefaultSettings() {
    return [
        'dashboardLayout' => [
            'layouts' => [
                'lg' => [
                    ['i' => 'news-1', 'x' => 0, 'y' => 0, 'w' => 4, 'h' => 4],
                    ['i' => 'weather-1', 'x' => 4, 'y' => 0, 'w' => 2, 'h' => 3],
                    ['i' => 'calendar-1', 'x' => 6, 'y' => 0, 'w' => 2, 'h' => 4],
                ],
                'md' => [
                    ['i' => 'news-1', 'x' => 0, 'y' => 0, 'w' => 4, 'h' => 4],
                    ['i' => 'weather-1', 'x' => 4, 'y' => 0, 'w' => 2, 'h' => 3],
                    ['i' => 'calendar-1', 'x' => 0, 'y' => 4, 'w' => 3, 'h' => 4],
                ],
                'sm' => [
                    ['i' => 'news-1', 'x' => 0, 'y' => 0, 'w' => 2, 'h' => 4],
                    ['i' => 'weather-1', 'x' => 0, 'y' => 4, 'w' => 2, 'h' => 3],
                    ['i' => 'calendar-1', 'x' => 0, 'y' => 7, 'w' => 2, 'h' => 4],
                ]
            ],
            'widgets' => [
                [
                    'id' => 'news-1',
                    'type' => 'news',
                    'title' => 'Top News',
                    'settings' => [
                        'feedUrl' => 'https://feeds.bbci.co.uk/news/rss.xml',
                        'feedName' => 'BBC News',
                        'maxItems' => 10,
                        'refreshInterval' => 15
                    ]
                ],
                [
                    'id' => 'weather-1',
                    'type' => 'weather',
                    'title' => 'Weather',
                    'settings' => [
                        'location' => 'New York',
                        'units' => 'imperial',
                        'showForecast' => true
                    ]
                ],
                [
                    'id' => 'calendar-1',
                    'type' => 'calendar',
                    'title' => 'Calendar',
                    'settings' => [
                        'calendarUrl' => '',
                        'daysToShow' => 7
                    ]
                ]
            ]
        ],
        'theme' => 'light'
    ];
}
