# Portal - Deployment Guide

## Automated Deployment (GitHub Actions)

Portal uses GitHub Actions to automatically deploy on push to main.

### Repository Secrets Required

Go to **Settings → Secrets and variables → Actions** in the GitHub repo and add:

| Secret | Description | Example |
|--------|-------------|---------|
| `FTP_SERVER` | Bluehost FTP server hostname | `ftp.bennernet.com` or the server IP |
| `FTP_USERNAME` | FTP username for deployment | `bennernetdeploy@bennernet.com` |
| `FTP_PASSWORD` | FTP password | (the password you set) |

### How It Works

1. Push code to `main` branch
2. GitHub Actions builds the frontend (`npm run build`)
3. Combines `dist/` and `api/` into deployment package
4. Uploads to `/portal/` on server via FTP

### Manual Trigger

You can also trigger deployment manually:
1. Go to **Actions** tab in GitHub
2. Select "Deploy to Production" workflow
3. Click "Run workflow"

---

## Manual Deployment

For manual deployment without GitHub Actions.

### Prerequisites
- PHP 8.1+ on the server
- Write permissions for the `api/settings/` directory

### Build Steps

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with the compiled frontend.

### Server Directory Structure

Upload the following to your server's `/portal/` directory:

```
public_html/
└── portal/
    ├── index.html          # From dist/
    ├── assets/             # From dist/assets/
    │   ├── index-xxx.js
    │   └── index-xxx.css
    └── api/                # From api/
        ├── feeds/
        │   ├── fetch.php
        │   ├── weather.php
        │   ├── calendar.php
        │   └── geocode.php
        └── settings/
            ├── get.php
            ├── save.php
            ├── verify-pin.php
            └── settings.json   # Created automatically
```

### Upload Process

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Upload `dist/` contents** to `/portal/` on server:
   - `index.html`
   - `assets/` folder

3. **Upload `api/` folder** to `/portal/api/` on server

4. **Set permissions:**
   ```bash
   chmod 755 /path/to/portal/api/settings/
   chmod 644 /path/to/portal/api/settings/settings.json  # if exists
   ```

### Initial Setup

On first access, if `settings.json` doesn't exist, the app will create one with defaults. The default PIN is `1234` - **change this immediately** in the settings.

### Apache .htaccess (if needed)

If you get 404 errors on page refresh, add this `.htaccess` in the `/portal/` directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /portal/

  # Don't rewrite API requests
  RewriteRule ^api/ - [L]

  # Don't rewrite files/directories that exist
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Rewrite everything else to index.html
  RewriteRule . index.html [L]
</IfModule>
```

### Changing the Subdirectory Name

If you want to use a different subdirectory (e.g., `/dashboard/` instead of `/portal/`):

1. Edit `vite.config.ts`:
   ```typescript
   base: '/dashboard/',
   ```

2. Rebuild: `npm run build`

3. Upload to `/dashboard/` on server

4. Update `.htaccess` RewriteBase if using

### Troubleshooting

#### "Failed to load settings" error
- Check that `api/settings/` directory exists and is writable
- Check PHP error logs for permission issues

#### API calls return 404
- Verify `api/` folder was uploaded to the correct location
- Check that PHP is enabled on the server

#### Blank page / JS errors
- Check browser console for errors
- Verify all `assets/` files were uploaded
- Clear browser cache

#### Weather/feeds not loading
- Check that `allow_url_fopen` is enabled in PHP
- Some hosts block outgoing HTTP requests - contact support

### Local Development

For local development, use the Vite dev server which proxies API requests:

```bash
# Terminal 1: Start PHP backend
php -S localhost:8081 -t api

# Terminal 2: Start Vite dev server
npm run dev
```

Access at `http://localhost:5173/portal/`
