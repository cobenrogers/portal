# Portal

A customizable personal dashboard application that aggregates news, weather, calendar events, and stock prices into a single, responsive interface.

## Features

- **Drag-and-drop widget layout** - Personalize your dashboard arrangement
- **Responsive design** - Adapts to desktop, tablet, and mobile screens
- **Dark mode support** - Light, dark, and system theme options
- **Real-time data updates** - Configurable refresh intervals per widget
- **Google OAuth authentication** - Secure access with admin approval workflow
- **Preview mode** - View dashboard without authentication

## Widget Types

### News Widget
- RSS/Atom feed aggregation from 24+ preset sources (CNN, BBC, NYT, NPR, etc.)
- Custom feed URL support
- Image extraction and display
- Configurable refresh interval and max items

### Weather Widget
- Current conditions (temperature, humidity, wind speed)
- 3-day forecast display
- Location search with geocoding
- Imperial and metric unit support
- Powered by Open-Meteo API (free, no API key required)

### Calendar Widget
- iCal/ICS feed support (Google Calendar, Apple Calendar, Outlook)
- Events grouped by date with "Today" highlighting
- All-day and timed event support
- Configurable days to show (1-30)

### Stock Widget
- Real-time quotes with price and change percentage
- Support for stocks, ETFs, indices, and crypto
- Up to 10 symbols per widget
- Popular stocks quick-add feature

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite 7
- Tailwind CSS 4
- Lucide React icons
- Vitest + React Testing Library

### Backend
- PHP 8.1+
- JSON file-based settings storage
- RESTful API endpoints

## Getting Started

### Prerequisites
- Node.js 20+
- PHP 8.1+ with SimpleXML and JSON extensions
- MySQL (for authentication service)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/portal.git
cd portal

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run test     # Run tests
npm run lint     # Run ESLint
```

## Project Structure

```
portal/
├── api/                    # PHP backend
│   ├── feeds/
│   │   ├── fetch.php       # RSS/Atom feed proxy
│   │   ├── weather.php     # Weather data proxy
│   │   ├── calendar.php    # iCal feed parser
│   │   ├── geocode.php     # Location search
│   │   ├── stocks.php      # Stock quote fetching
│   │   └── stock-search.php # Symbol lookup
│   └── settings/
│       ├── get.php         # Load settings
│       └── save.php        # Save settings (auth required)
├── docs/                   # Documentation
│   ├── REQUIREMENTS.md
│   └── DESIGN.md
├── src/                    # React frontend
│   ├── components/
│   │   ├── ui/             # Reusable UI components
│   │   └── widgets/        # Widget implementations
│   ├── contexts/           # React contexts (Auth, Theme)
│   ├── pages/              # Page components
│   ├── services/           # API client functions
│   └── types/              # TypeScript interfaces
└── public/                 # Static assets
```

## API Endpoints

### Feed Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feeds/fetch.php` | GET | Proxy RSS/Atom feeds |
| `/api/feeds/weather.php` | GET | Get weather data |
| `/api/feeds/calendar.php` | GET | Parse iCal feeds |
| `/api/feeds/geocode.php` | GET | Search locations |
| `/api/feeds/stocks.php` | GET | Fetch stock quotes |
| `/api/feeds/stock-search.php` | GET | Search stock symbols |

### Settings Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings/get.php` | GET | Load dashboard settings |
| `/api/settings/save.php` | POST | Save settings (requires auth) |

## Authentication

Portal uses Google OAuth 2.0 via an external authentication service. Users must be authenticated AND approved by an admin to modify dashboard settings. Unauthenticated users can view the dashboard in preview mode.

## Deployment

### Build
```bash
npm run build
```

### Server Requirements
- PHP 8.1+ with SimpleXML, JSON extensions
- Write permissions for `api/settings/` directory
- Apache/Nginx serving static files from `dist/`

### GitHub Actions
Automated deployment via FTP on push to `main` branch.

## External Services

- **Open-Meteo** - Weather data (free, no API key)
- **Yahoo Finance** - Stock quotes
- **Google OAuth** - Authentication

## Documentation

- [Requirements](docs/REQUIREMENTS.md) - Functional and non-functional requirements
- [Design](docs/DESIGN.md) - Architecture and technical design
