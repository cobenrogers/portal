# Changelog

All notable changes to Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.0] - 2024-12-17

### Added
- **Calendar naming**: Calendar widgets can now be given custom names (Work, Personal, Family, etc.) to distinguish multiple calendars
- **Layout persistence**: Widget layout changes are now saved to the server when clicking "Done" after editing
- **PIN modal for layout saves**: Prompts for PIN when saving layout changes to maintain security
- **Dynamic article count**: News widgets now show 6 articles when no images are present, 4 when images exist, to better utilize whitespace

### Changed
- CalendarWidget title now displays `calendarName` from settings instead of hardcoded "Calendar"
- NewsWidget uses `useMemo` to efficiently compute display count based on image availability

## [0.2.0] - 2024-12-17

### Added
- **Weather location search**: Added geocoding search with autocomplete for weather locations
- **Location disambiguation**: Weather widget now stores precise lat/lon coordinates to avoid ambiguous location names
- **Google News RSS integration**: Added CNN via Google News as a workaround for abandoned CNN RSS feeds

### Fixed
- **CNN image extraction**: Enhanced PHP feed parser to handle `media:group` format used by CNN
- **Weather accuracy**: Fixed weather showing wrong location when multiple cities share the same name

### Removed
- Removed direct CNN RSS feeds from presets (feeds are abandoned with 2023 content)

## [0.1.0] - 2024-12-16

### Added
- Initial portal implementation
- **News Widget**: RSS/Atom feed display with thumbnail support
- **Weather Widget**: Current conditions and forecast from Open-Meteo API
- **Calendar Widget**: iCal/ICS feed parsing with event grouping
- **Dashboard**: Responsive grid layout with drag-and-drop reordering
- **Settings Page**: PIN-protected configuration interface
- **Preset Feeds**: Curated list of news sources (BBC, NPR, NYT, TechCrunch, etc.)
- **PHP Backend**: CORS proxy for feeds, settings persistence
- **Theme Support**: Light/dark/system theme options (UI only, not fully implemented)

### Technical
- React 19 + TypeScript + Vite 7 frontend
- Tailwind CSS 4 for styling
- PHP 8.1+ backend for Bluehost compatibility
- File-based JSON settings storage
