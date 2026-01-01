# Specification: Feed Image Loading - Handle CDN Issues and Hotlink Protection

## Overview

Some feed images fail to load due to CDN issues and hotlink protection. Many external sites block direct image requests from other domains by checking the Referer header. This feature implements a server-side image proxy that fetches images with proper headers to bypass hotlink protection, combined with a robust React component that gracefully handles failures with fallback behavior. The solution will ensure all feed images either display correctly or show appropriate fallback UI.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation, not a bug fix. We need to create new infrastructure (PHP proxy endpoint), new React components (FeedImage), and integrate them into existing widgets. The current behavior (hiding broken images) is working as designed - we're adding new capability to handle external image loading failures.

## Task Scope

### Services Involved
- **main** (primary) - React frontend with NewsWidget and PHP API backend

### This Task Will:
- [ ] Create PHP image proxy endpoint to fetch external images server-side
- [ ] Implement caching layer for proxied images to improve performance
- [ ] Create reusable FeedImage React component with error handling
- [ ] Update NewsWidget to use proxied image URLs
- [ ] Add security validation to prevent SSRF attacks
- [ ] Implement graceful fallback UI for unavailable images

### Out of Scope:
- Changes to other widgets (RecipesWidget doesn't currently display images)
- Image optimization or resizing
- CDN integration for cached images
- Changes to RSS feed parsing logic in fetch.php

## Service Context

### Main Service

**Tech Stack:**
- Language: TypeScript
- Framework: React with Vite
- Styling: Tailwind CSS
- Testing: Vitest
- Backend: PHP (api directory)

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Directories:**
- `src/` - React frontend source code
- `src/components/widgets/` - Widget components
- `src/services/` - API service functions
- `api/feeds/` - PHP feed endpoints

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `api/feeds/image-proxy.php` | main | **CREATE** - New PHP endpoint to proxy external images |
| `api/cache/images/.gitkeep` | main | **CREATE** - Cache directory for proxied images |
| `src/components/common/FeedImage.tsx` | main | **CREATE** - Reusable image component with error handling |
| `src/components/widgets/news/NewsWidget.tsx` | main | Integrate FeedImage component and proxied URLs |
| `src/services/api.ts` | main | Add `getProxiedImageUrl()` helper function |
| `src/types/index.ts` | main | No changes needed - FeedItem.image type is adequate |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `api/feeds/recipes.php` | cURL implementation pattern with proper headers |
| `api/feeds/fetch.php` | Response format pattern (`respond()` function) |
| `src/services/api.ts` | API_BASE pattern for building URLs |
| `src/components/widgets/news/NewsWidget.tsx` | Current image error handling approach |

## Patterns to Follow

### PHP cURL Pattern

From `api/feeds/recipes.php`:

```php
function fetchUrl(string $url, int $timeout = 10): ?string {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => [...],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);
        // ... handle response
    }
}
```

**Key Points:**
- Use cURL when available, fallback to file_get_contents
- Set reasonable timeouts (10s max)
- Enable SSL verification
- Follow redirects with CURLOPT_FOLLOWLOCATION

### Image Proxy Specific Headers

For bypassing hotlink protection:

```php
curl_setopt($ch, CURLOPT_REFERER, $originalDomain);  // Set referer to image's origin
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
```

**Key Points:**
- Referer must match the image's origin domain
- User-Agent should mimic a real browser
- This bypasses most hotlink protection schemes

### API URL Pattern

From `src/services/api.ts`:

```typescript
const API_BASE = import.meta.env.DEV ? '/api' : './api'

// For image proxy URLs:
export function getProxiedImageUrl(imageUrl: string): string {
  return `${API_BASE}/feeds/image-proxy.php?url=${encodeURIComponent(imageUrl)}`
}
```

**Key Points:**
- Use API_BASE for consistent URL building
- Always encodeURIComponent for query parameters
- Works in both dev and production

### React Image Error Handling Pattern

From `src/components/widgets/news/NewsWidget.tsx`:

```tsx
<img
  src={item.image}
  alt=""
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = 'none'
  }}
/>
```

**Key Points:**
- onError only fires once per img element
- Need state-based approach for proper fallback rendering
- TypeScript requires casting e.target to HTMLImageElement

## Requirements

### Functional Requirements

1. **PHP Image Proxy Endpoint**
   - Description: Server-side endpoint that fetches external images with proper headers
   - Acceptance: Images from feeds with hotlink protection load successfully through proxy

2. **Image Caching**
   - Description: Cache proxied images locally to reduce external requests
   - Acceptance: Second request for same image serves from cache without external fetch

3. **FeedImage React Component**
   - Description: Reusable component that handles image loading with fallback UI
   - Acceptance: Component shows placeholder when image fails, renders correctly when image loads

4. **NewsWidget Integration**
   - Description: Update NewsWidget to use proxied URLs and FeedImage component
   - Acceptance: Images in news feeds display correctly, failures show graceful fallback

5. **Security Validation**
   - Description: Validate URLs to prevent SSRF attacks
   - Acceptance: Only valid HTTP/HTTPS image URLs are proxied, invalid requests are rejected

### Edge Cases

1. **Image URL is null/undefined** - Skip proxying, show placeholder
2. **Image URL is relative** - Skip proxying (can't determine origin)
3. **Image takes too long** - 10 second timeout, show placeholder
4. **Invalid MIME type returned** - Reject non-image responses
5. **Cache directory not writable** - Serve image without caching
6. **Very large images** - Set reasonable size limit (e.g., 5MB)
7. **Redirect loops** - Limit redirects to 5 hops

## Implementation Notes

### DO
- Follow the cURL pattern in `api/feeds/recipes.php` for HTTP requests
- Use `api/feeds/fetch.php`'s `respond()` function pattern for JSON responses
- Set proper Referer header matching the image's origin domain
- Cache images with URL-based hash filenames (e.g., `md5($url).ext`)
- Use native `loading="lazy"` attribute on images
- Verify MIME type with `curl_getinfo($ch, CURLINFO_CONTENT_TYPE)`
- Return proper Content-Type header when serving cached images

### DON'T
- Create overly complex caching logic - simple filesystem cache is fine
- Proxy images from untrusted/internal URLs (validate http/https)
- Store cache files with original filenames (security risk)
- Block the main thread - proxy requests should be async-friendly
- Add external npm packages - use native React patterns

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- API: http://localhost:3000/api (proxied by Vite dev server)

### Required Environment Variables
- None required for this feature

### Test Data
Use any news feed URL that has images. Example feeds that may have hotlink-protected images:
- News sites (CNN, BBC, etc.)
- Tech blogs (TechCrunch, Ars Technica)

## Success Criteria

The task is complete when:

1. [ ] PHP image proxy endpoint created at `api/feeds/image-proxy.php`
2. [ ] Proxy bypasses hotlink protection by setting proper Referer header
3. [ ] Images are cached in `api/cache/images/` directory
4. [ ] FeedImage component created with error state handling
5. [ ] NewsWidget uses proxied URLs for images
6. [ ] Security validation prevents SSRF attacks
7. [ ] Fallback UI displays for failed images
8. [ ] No console errors when images fail to load
9. [ ] Existing tests still pass

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| FeedImage renders | `src/components/common/FeedImage.test.tsx` | Component renders with image URL |
| FeedImage error state | `src/components/common/FeedImage.test.tsx` | Fallback shown when image fails |
| FeedImage with null src | `src/components/common/FeedImage.test.tsx` | Shows placeholder for null/undefined |
| getProxiedImageUrl | `src/services/api.test.ts` | Returns correctly encoded proxy URL |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Image proxy endpoint | PHP backend | Returns image with correct Content-Type |
| Proxy with cache | PHP backend | Second request returns cached image |
| Proxy security | PHP backend | Rejects invalid/internal URLs |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| News widget with images | 1. Load dashboard 2. View news widget with image feed | Images display (either proxied or fallback) |
| Failed image handling | 1. Configure feed with broken images 2. View widget | Fallback placeholder shown, no console errors |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| News Widget | `http://localhost:3000` | Images load from feeds with hotlink protection |
| FeedImage fallback | `http://localhost:3000` | Broken images show placeholder, not broken icon |
| Network tab | DevTools | Verify images go through `/api/feeds/image-proxy.php` |

### Database Verification (if applicable)
N/A - No database changes in this feature

### File System Verification
| Check | Command | Expected |
|-------|---------|----------|
| Cache directory exists | `ls api/cache/images/` | Directory exists with .gitkeep |
| Cached images stored | `ls api/cache/images/` (after use) | MD5-hashed image files |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete
- [ ] Cache directory created and functional
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (cURL in PHP, useState in React)
- [ ] No security vulnerabilities introduced (SSRF protection verified)
- [ ] Images from known hotlink-protected sources load correctly
