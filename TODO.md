# Portal - TODO List

## High Priority

### Features

- [X] **GitHub Actions deployment**: Set up automated deployment to Bluehost via GitHub Actions
- [X] **Dark mode implementation**: Full dark mode with theme selector (light/dark/system) and Tailwind CSS dark variants
- [ ] **Error recovery**: Better handling when feed/API fails (cached fallback data)
- [ ] **Offline support**: Service worker for basic offline functionality

### Bugs

- [X] **Widget refresh button not working**: Fixed by adding pointer-events-none to icons and stopPropagation on mousedown/pointerdown events.
- [ ] **Feed image loading**: Some feeds have images that fail to load (CDN issues, hotlink protection)
- [ ] **Calendar timezone handling**: Ensure events display in user's local timezone correctly

## Medium Priority

### Improvements

- [ ] **Loading performance**: Lazy load widgets below the fold
- [ ] **Image optimization**: Proxy images through backend for caching/resizing
- [ ] **Accessibility**: Full keyboard navigation and screen reader support
- [ ] **Mobile gestures**: Swipe to refresh on touch devices

## Low Priority



### New Widget Types

### Infrastructure

- [X] **Google OAuth authentication**: SSO via bennernet-auth service with session cookies
- [X] **User accounts**: Database-backed user management with admin approval workflow
- [X] **Admin dashboard**: User management UI at /auth/admin/
- [ ] **Import/Export**: Backup and restore settings
- [ ] **PWA manifest**: Install as mobile app

### Developer Experience

- [ ] **E2E tests**: Playwright or Cypress test suite
- [X] **CI/CD pipeline**: Automated testing and deployment
- [ ] **Docker setup**: Containerized development environment
- [ ] **API documentation**: OpenAPI/Swagger spec for PHP endpoints

## Future consideration

- [ ] **Publish Google OAuth app**: Add privacy policy & terms of service pages, submit for Google verification
- [ ] **Widget resize**: Allow widgets to span multiple columns for larger displays
- [ ] **Bookmarks widget**: Quick links to favorite sites
- [ ] **Todo widget**: Simple task list with local storage
- [ ] **Notes widget**: Sticky note style quick notes
- [ ] **Clock widget**: Large time display with multiple timezones
- [ ] **Additional news presets**: Add more international news sources
- [ ] **Weather alerts**: Display severe weather warnings when available
- [ ] **Calendar colors**: Support different colors for different calendars
- [ ] **Widget refresh indicator**: Show last updated time on each widget
- [ ] **Compact mode**: Option for denser widget layouts
- [ ] **Search within feeds**: Filter news articles by keyword




## Completed

**Calendar widget custom naming**

- [X] 
- [X] **Stock ticker widget**: Display stock prices and daily changes using Yahoo Finance API

### v0.3.0

- [X] Calendar widget custom naming
- [X] Layout persistence with PIN protection
- [X] Dynamic article count (4 with images, 6 without)

### v0.2.0

- [X] Weather location search with geocoding
- [X] Location disambiguation (lat/lon storage)
- [X] Google News RSS integration for CNN
- [X] CNN media:group image extraction fix

### v0.1.0

- [X] News widget with RSS/Atom support
- [X] Weather widget with Open-Meteo
- [X] Calendar widget with iCal parsing
- [X] Drag-and-drop widget reordering
- [X] PIN-protected settings
- [X] Responsive grid layout
- [X] Preset feed selection

---

*Last updated: December 18, 2024*
