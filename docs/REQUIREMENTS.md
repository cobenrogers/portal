# Portal - Requirements Document

## Overview

Portal is a personal home page/dashboard application that displays configurable widgets for news, weather, and calendar information. It serves as a customizable information hub for daily use.

## Functional Requirements

### Core Features

#### FR-1: Widget System
- **FR-1.1**: Support multiple widget types (News, Weather, Calendar)
- **FR-1.2**: Allow adding/removing widgets dynamically
- **FR-1.3**: Support drag-and-drop widget reordering
- **FR-1.4**: Persist widget configuration across sessions
- **FR-1.5**: Responsive grid layout adapting to screen sizes (lg/md/sm breakpoints)

#### FR-2: News Widget
- **FR-2.1**: Display RSS/Atom feed content
- **FR-2.2**: Support preset feed selection from curated list
- **FR-2.3**: Support custom feed URLs
- **FR-2.4**: Extract and display thumbnail images when available
- **FR-2.5**: Show 6 articles when no images present, 4 when images exist
- **FR-2.6**: Configurable refresh interval
- **FR-2.7**: Configurable max items to fetch

#### FR-3: Weather Widget
- **FR-3.1**: Display current weather conditions (temperature, humidity, wind)
- **FR-3.2**: Show weather description and appropriate icon
- **FR-3.3**: Support location search with disambiguation
- **FR-3.4**: Store precise lat/lon coordinates for accurate weather
- **FR-3.5**: Support imperial and metric units
- **FR-3.6**: Optional multi-day forecast display
- **FR-3.7**: Auto-refresh every 30 minutes

#### FR-4: Calendar Widget
- **FR-4.1**: Display events from iCal/ICS feeds
- **FR-4.2**: Support custom calendar naming (Work, Personal, etc.)
- **FR-4.3**: Group events by date (Today, Tomorrow, etc.)
- **FR-4.4**: Show event time, title, and location
- **FR-4.5**: Support all-day events
- **FR-4.6**: Configurable days to show (1-30)
- **FR-4.7**: Auto-refresh every 15 minutes

#### FR-5: Settings Management
- **FR-5.1**: PIN-protected settings access
- **FR-5.2**: PIN-protected layout changes
- **FR-5.3**: Theme selection (light/dark/system)
- **FR-5.4**: Persistent settings storage on server

### Data Sources

#### DS-1: News Feeds
- RSS 2.0 and Atom format support
- Media namespace support for images (media:thumbnail, media:content, media:group)
- Enclosure tag support for images
- HTML content parsing for embedded images

#### DS-2: Weather Data
- Open-Meteo API for weather data (free, no API key required)
- Open-Meteo Geocoding API for location search

#### DS-3: Calendar Data
- Standard iCal/ICS format support
- Google Calendar, Apple Calendar, Outlook compatible

## Non-Functional Requirements

### NFR-1: Performance
- Widget data should load within 3 seconds
- Smooth drag-and-drop interactions (60fps)
- Efficient caching to minimize API calls

### NFR-2: Security
- PIN protection for settings modification
- CORS proxy for external feed fetching
- Input validation on all API endpoints
- No sensitive data in client-side storage

### NFR-3: Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for desktop and tablet
- PHP 8.1+ backend compatibility (Bluehost hosting)

### NFR-4: Usability
- Intuitive widget management
- Clear visual feedback for loading/error states
- Accessible color contrast ratios

## Constraints

- **Hosting**: Bluehost shared hosting (PHP backend required)
- **No API Keys**: Weather service must not require paid API keys
- **CORS**: External feeds require server-side proxy
- **Storage**: File-based settings storage (no database)

## Future Considerations

- Additional widget types (stocks, todo lists, bookmarks)
- Multiple dashboard/page support
- User accounts with individual settings
- Dark mode theme implementation
- Mobile app wrapper (PWA)
