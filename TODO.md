# Portal - TODO List

## High Priority

### Features
- [ ] **GitHub Actions deployment**: Set up automated deployment to Bluehost via GitHub Actions
- [ ] **Dark mode implementation**: Theme selector exists but dark mode styles not fully applied
- [ ] **Widget resize**: Allow widgets to span multiple columns for larger displays
- [ ] **Error recovery**: Better handling when feed/API fails (cached fallback data)
- [ ] **Offline support**: Service worker for basic offline functionality

### Bugs
- [ ] **Widget refresh button not working**: Refresh/settings buttons in widget headers don't respond to clicks in production (works in dev). Possibly related to drag-and-drop event handling or minification issue.
- [ ] **Feed image loading**: Some feeds have images that fail to load (CDN issues, hotlink protection)
- [ ] **Calendar timezone handling**: Ensure events display in user's local timezone correctly

## Medium Priority

### Features
- [ ] **Additional news presets**: Add more international news sources
- [ ] **Weather alerts**: Display severe weather warnings when available
- [ ] **Calendar colors**: Support different colors for different calendars
- [ ] **Widget refresh indicator**: Show last updated time on each widget
- [ ] **Compact mode**: Option for denser widget layouts
- [ ] **Search within feeds**: Filter news articles by keyword

### Improvements
- [ ] **Loading performance**: Lazy load widgets below the fold
- [ ] **Image optimization**: Proxy images through backend for caching/resizing
- [ ] **Accessibility**: Full keyboard navigation and screen reader support
- [ ] **Mobile gestures**: Swipe to refresh on touch devices

## Low Priority

### New Widget Types
- [ ] **Stock ticker widget**: Display stock prices and daily changes for configurable list of symbols (consider free APIs: Alpha Vantage, Finnhub, Yahoo Finance)
- [ ] **Bookmarks widget**: Quick links to favorite sites
- [ ] **Todo widget**: Simple task list with local storage
- [ ] **Notes widget**: Sticky note style quick notes
- [ ] **Clock widget**: Large time display with multiple timezones

### Infrastructure
- [ ] **Database backend**: Optional MySQL/PostgreSQL for multi-user support
- [ ] **User accounts**: Multiple users with individual dashboards
- [ ] **Import/Export**: Backup and restore settings
- [ ] **PWA manifest**: Install as mobile app

### Developer Experience
- [ ] **E2E tests**: Playwright or Cypress test suite
- [ ] **CI/CD pipeline**: Automated testing and deployment
- [ ] **Docker setup**: Containerized development environment
- [ ] **API documentation**: OpenAPI/Swagger spec for PHP endpoints

## Completed

### v0.3.0
- [x] Calendar widget custom naming
- [x] Layout persistence with PIN protection
- [x] Dynamic article count (4 with images, 6 without)

### v0.2.0
- [x] Weather location search with geocoding
- [x] Location disambiguation (lat/lon storage)
- [x] Google News RSS integration for CNN
- [x] CNN media:group image extraction fix

### v0.1.0
- [x] News widget with RSS/Atom support
- [x] Weather widget with Open-Meteo
- [x] Calendar widget with iCal parsing
- [x] Drag-and-drop widget reordering
- [x] PIN-protected settings
- [x] Responsive grid layout
- [x] Preset feed selection

---

*Last updated: December 17, 2024*
