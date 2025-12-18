# Portal - Design Document

## Architecture Overview

Portal follows a client-server architecture with a React frontend and PHP backend API.

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   React 19 + Vite                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │  News   │  │ Weather │  │Calendar │  Widgets     │   │
│  │  │ Widget  │  │ Widget  │  │ Widget  │              │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘              │   │
│  │       │            │            │                    │   │
│  │  ┌────┴────────────┴────────────┴────┐              │   │
│  │  │          Dashboard Grid            │              │   │
│  │  └────────────────┬───────────────────┘              │   │
│  │                   │                                   │   │
│  │  ┌────────────────┴───────────────────┐              │   │
│  │  │         API Service Layer          │              │   │
│  │  └────────────────┬───────────────────┘              │   │
│  └───────────────────│───────────────────────────────────┘   │
└──────────────────────│──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────│──────────────────────────────────────┐
│                      │         Server (PHP 8.1+)            │
│  ┌───────────────────┴───────────────────────────────────┐  │
│  │                    /api/ Endpoints                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │  feeds/  │ │ feeds/   │ │ feeds/   │ │settings/ │ │  │
│  │  │fetch.php │ │weather.php│ │calendar.php│ │ *.php  │ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │  │
│  └───────│────────────│────────────│────────────│────────┘  │
│          │            │            │            │            │
│     External      Open-Meteo    External    settings.json   │
│    RSS Feeds        API        iCal Feeds                   │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library

### Backend
- **Runtime**: PHP 8.1+
- **Storage**: JSON file-based (settings.json)
- **APIs**: RESTful JSON endpoints

## Directory Structure

```
portal/
├── api/                    # PHP backend
│   ├── feeds/
│   │   ├── fetch.php       # RSS/Atom feed proxy
│   │   ├── weather.php     # Weather data proxy
│   │   ├── calendar.php    # iCal feed parser
│   │   └── geocode.php     # Location search
│   └── settings/
│       ├── get.php         # Load settings
│       ├── save.php        # Save settings (PIN protected)
│       └── verify-pin.php  # PIN verification
├── docs/                   # Documentation
├── src/                    # React frontend
│   ├── components/
│   │   ├── ui/             # Reusable UI components
│   │   ├── widgets/        # Widget implementations
│   │   │   ├── news/
│   │   │   ├── weather/
│   │   │   └── calendar/
│   │   └── Dashboard.tsx   # Grid layout manager
│   ├── pages/
│   │   └── Settings.tsx    # Settings page
│   ├── services/
│   │   └── api.ts          # API client functions
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   ├── lib/
│   │   └── utils.ts        # Utility functions
│   └── App.tsx             # Main application
├── public/                 # Static assets
└── package.json
```

## Data Models

### Settings Structure
```typescript
interface PortalSettings {
  dashboardLayout: DashboardLayout
  theme: 'light' | 'dark' | 'system'
}

interface DashboardLayout {
  layouts: {
    lg: LayoutItem[]  // >= 1200px
    md: LayoutItem[]  // >= 768px
    sm: LayoutItem[]  // < 768px
  }
  widgets: WidgetConfig[]
}

interface WidgetConfig {
  id: string
  type: 'news' | 'weather' | 'calendar'
  title: string
  settings: NewsWidgetSettings | WeatherWidgetSettings | CalendarWidgetSettings
}
```

### Widget Settings
```typescript
interface NewsWidgetSettings {
  feedUrl: string
  feedName: string
  maxItems: number
  refreshInterval: number  // minutes
}

interface WeatherWidgetSettings {
  location: string
  latitude?: number
  longitude?: number
  units: 'imperial' | 'metric'
  showForecast: boolean
}

interface CalendarWidgetSettings {
  calendarName: string
  calendarUrl?: string
  daysToShow: number
}
```

## API Endpoints

### Feed Endpoints

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/api/feeds/fetch.php` | GET | `url` | Proxy RSS/Atom feeds |
| `/api/feeds/weather.php` | GET | `location`, `lat`, `lon`, `units` | Get weather data |
| `/api/feeds/calendar.php` | GET | `url`, `days` | Parse iCal feeds |
| `/api/feeds/geocode.php` | GET | `q` | Search locations |

### Settings Endpoints

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/api/settings/get.php` | GET | - | Load settings |
| `/api/settings/save.php` | POST | `settings`, `pin` | Save settings |
| `/api/settings/verify-pin.php` | POST | `pin` | Verify PIN |

## Component Design

### Widget Wrapper Pattern
All widgets use a common `WidgetWrapper` component that provides:
- Title header with refresh button
- Loading skeleton state
- Error display with retry
- Settings button (when in edit mode)

### Dashboard Grid
- CSS Grid-based responsive layout
- Drag-and-drop reordering (edit mode only)
- 3 columns (lg), 2 columns (md), 1 column (sm)
- Equal-sized widget cards

### State Management
- React useState/useCallback for local state
- Settings fetched on app load
- Layout changes tracked with ref for dirty detection
- PIN modal for saving protected changes

## Security Considerations

### PIN Protection
- PIN stored hashed in `settings.json`
- Required for settings page access
- Required for layout change persistence
- Verified server-side before any write operation

### CORS Proxy
- All external feed requests go through PHP proxy
- Prevents CORS issues with RSS feeds
- Allows server-side validation of URLs

### Input Validation
- URL validation before fetching
- Timeout limits on external requests
- XML parsing error handling

## Error Handling

### Client-Side
- Try/catch around all API calls
- Error state displayed in widget with retry option
- Toast notifications for save operations

### Server-Side
- Consistent JSON response format: `{ success, data, error }`
- HTTP timeout handling (10 second limit)
- XML parsing error recovery

## Performance Optimizations

### Caching
- Weather: 30-minute refresh interval
- News: Configurable refresh (default 15 min)
- Calendar: 15-minute refresh interval

### Rendering
- useMemo for computed values (sorted widgets, display items)
- useCallback for event handlers
- Conditional rendering for loading states

## Deployment

### Build Process
```bash
npm run build    # Creates dist/ folder
```

### Server Requirements
- PHP 8.1+ with SimpleXML, JSON extensions
- Write permissions for `api/settings/` directory
- Apache/Nginx serving static files from `dist/`

### Environment
- Development: Vite dev server with PHP proxy
- Production: Static files + PHP API on same domain
