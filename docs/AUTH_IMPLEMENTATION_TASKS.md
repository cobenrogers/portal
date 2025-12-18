# Authentication Implementation Tasks

## Phase 1: Basic Shared Authentication

### 1. Infrastructure Setup

- [ ] **1.1 Google Cloud Console Setup**
  - Create Google Cloud project "Bennernet"
  - Enable Google+ API
  - Configure OAuth consent screen
  - Create OAuth 2.0 credentials with redirect URIs:
    - `http://localhost:5173/auth/api/google-callback.php`
    - `http://localhost:8080/auth/api/google-callback.php`
    - `https://bennernet.com/auth/api/google-callback.php`
  - Note down Client ID and Client Secret

- [ ] **1.2 Database Setup**
  - Create `bennernet_users` table
  - Create `bennernet_sessions` table
  - Create `portal_user_settings` table
  - Test database connection

### 2. Backend - Auth Service

- [ ] **2.1 Create auth directory structure**
  ```
  auth/
  ├── api/
  │   ├── auth-config.php
  │   ├── google-login.php
  │   ├── google-callback.php
  │   ├── logout.php
  │   ├── me.php
  │   └── admin/
  │       ├── users.php
  │       └── approve.php
  └── shared/
      ├── database.php
      └── auth.php
  ```

- [ ] **2.2 Implement shared utilities**
  - `auth/shared/database.php` - PDO connection
  - `auth/shared/auth.php` - getCurrentUser, requireAuth, requireApproved, requireAdmin

- [ ] **2.3 Implement OAuth endpoints**
  - `auth/api/google-login.php` - Redirect to Google
  - `auth/api/google-callback.php` - Handle callback, create user/session
  - `auth/api/logout.php` - Clear session and cookie
  - `auth/api/me.php` - Return current user state

- [ ] **2.4 Implement admin endpoints**
  - `auth/api/admin/users.php` - List all users
  - `auth/api/admin/approve.php` - Approve/reject users

- [ ] **2.5 Create auth-config.php template**
  - Add to `.gitignore`
  - Create `auth-config.example.php` for reference

### 3. Backend - Portal Updates

- [ ] **3.1 Update Portal settings endpoints**
  - Modify `portal/api/settings/get.php` to use auth
  - Modify `portal/api/settings/save.php` to use auth (replace PIN)
  - Return preview/demo settings for unauthenticated users

- [ ] **3.2 Data migration script**
  - Script to migrate existing `portal-settings.json` to first admin user
  - Can be run manually after first admin signs in

### 4. Frontend - Portal Updates

- [ ] **4.1 Create auth types**
  - Add `src/types/auth.ts` with User, AuthState interfaces

- [ ] **4.2 Create AuthContext**
  - `src/contexts/AuthContext.tsx`
  - Fetch user state on mount
  - Provide login/logout functions
  - Track loading, authenticated, approved, preview states

- [ ] **4.3 Create auth components**
  - `src/components/auth/LoginButton.tsx`
  - `src/components/auth/UserMenu.tsx`
  - `src/components/auth/PreviewBanner.tsx`

- [ ] **4.4 Update App.tsx**
  - Wrap app in AuthProvider
  - Add PreviewBanner at top
  - Replace settings button logic with auth-based UI
  - Show LoginButton when not authenticated
  - Show UserMenu when authenticated
  - Hide edit controls in preview mode

- [ ] **4.5 Update settings/save logic**
  - Remove PIN verification from frontend
  - Use session-based auth instead

### 5. Development Environment

- [ ] **5.1 Update Vite config**
  - Add proxy for `/auth` endpoints
  - Verify `/api` proxy still works

- [ ] **5.2 Local testing**
  - Test OAuth flow on localhost
  - Test preview mode (unauthenticated)
  - Test pending approval state
  - Test approved user flow
  - Test admin approval workflow

### 6. Testing

#### 6.1 PHP Unit Tests

- [ ] **Set up PHPUnit**
  - Install PHPUnit via Composer
  - Create `auth/phpunit.xml` configuration
  - Create `auth/tests/bootstrap.php` with test helpers

- [ ] **Write unit tests for auth middleware**
  - `tests/unit/AuthTest.php`:
    - `testGetCurrentUserReturnsNullWithNoSession`
    - `testGetCurrentUserReturnsUserWithValidSession`
    - `testGetCurrentUserReturnsNullWithExpiredSession`
    - `testGetCurrentUserReturnsNullWithInvalidToken`
    - `testGenerateUUIDReturnsValidFormat`
    - `testGenerateUUIDReturnsUniqueValues`
  - `tests/unit/FirstUserAdminTest.php`:
    - `testFirstUserBecomesAdmin`
    - `testSecondUserIsNotAdmin`

#### 6.2 PHP Integration Tests

- [ ] **Set up test database**
  - Create `bennernet_test` database
  - Mirror production schema
  - Add reset helper function

- [ ] **Write integration tests**
  - `tests/integration/MeEndpointTest.php`:
    - `testMeReturnsPreviewForUnauthenticated`
    - `testMeReturnsUserForAuthenticated`
    - `testMeReturnsPreviewForPendingUser`
  - `tests/integration/AdminEndpointsTest.php`:
    - `testApproveUserRequiresAdmin`
    - `testApproveUserSucceedsForAdmin`
    - `testListUsersReturnsAllUsers`

#### 6.3 Frontend Unit Tests (Vitest)

- [ ] **Set up Vitest with React Testing Library**
  - Ensure `@testing-library/react` is installed
  - Configure test environment in `vitest.config.ts`

- [ ] **Write AuthContext tests**
  - `src/contexts/AuthContext.test.tsx`:
    - `it('starts in loading state')`
    - `it('sets preview mode for unauthenticated users')`
    - `it('sets user data for authenticated users')`
    - `it('sets preview mode for pending users')`
    - `it('handles fetch errors gracefully')`

- [ ] **Write component tests**
  - `src/components/auth/LoginButton.test.tsx`:
    - `it('renders sign in text')`
    - `it('calls login function when clicked')`
  - `src/components/auth/PreviewBanner.test.tsx`:
    - `it('renders nothing when not in preview mode')`
    - `it('shows preview message for guests')`
    - `it('shows pending message for unapproved users')`
  - `src/components/auth/UserMenu.test.tsx`:
    - `it('renders user avatar')`
    - `it('opens dropdown on click')`
    - `it('calls logout when sign out clicked')`

#### 6.4 E2E Tests (Playwright)

- [ ] **Set up Playwright**
  - Install `@playwright/test`
  - Create `portal/playwright.config.ts`
  - Create `portal/e2e/` directory

- [ ] **Write authentication E2E tests**
  - `e2e/auth.spec.ts`:
    - `test('shows preview banner for unauthenticated users')`
    - `test('shows dashboard in preview mode')`
    - `test('login button redirects to Google')`
    - `test('shows user menu for authenticated users')`
    - `test('shows edit button for approved users')`
    - `test('can open user menu and logout')`
    - `test('shows pending approval banner')`
    - `test('hides edit controls for pending users')`

- [ ] **Write settings E2E tests**
  - `e2e/settings.spec.ts`:
    - `test('can save settings when authenticated')`
    - `test('cannot save settings in preview mode')`

#### 6.5 CI Integration

- [ ] **Create GitHub Actions workflow**
  - `.github/workflows/test.yml`
  - PHP tests job with MySQL service
  - Frontend unit tests job
  - E2E tests job with Playwright

- [ ] **Add npm scripts**
  - `test` - Run Vitest
  - `test:coverage` - Run Vitest with coverage
  - `test:e2e` - Run Playwright
  - `test:php` - Run PHPUnit
  - `test:all` - Run all test suites

---

### 7. Production Deployment

- [ ] **7.1 Deploy auth service**
  - Upload `auth/` directory to bennernet.com
  - Create production `auth-config.php`
  - Verify database connection

- [ ] **7.2 Deploy Portal updates**
  - Deploy updated settings endpoints
  - Deploy updated frontend build
  - Test OAuth flow in production

- [ ] **7.3 Migration**
  - First sign-in becomes admin
  - Migrate existing settings to admin user
  - Verify everything works
  - Remove old PIN-based code (optional cleanup)

---

## Phase 2: Per-App Permissions (Future)

*Only implement when needed*

- [ ] Add `bennernet_app_permissions` table
- [ ] Add app-specific auth functions to middleware
- [ ] Update `me.php` to include app permissions
- [ ] Build enhanced admin panel with app × user matrix
- [ ] Update each app to check app-specific permissions

---

## Estimated Timeline

| Task Group | Effort |
|------------|--------|
| 1. Infrastructure Setup | 30 min |
| 2. Backend - Auth Service | 2-3 hours |
| 3. Backend - Portal Updates | 1 hour |
| 4. Frontend - Portal Updates | 2-3 hours |
| 5. Development Environment | 30 min |
| 6. Production Deployment | 1 hour |

**Total: ~8-10 hours (1-2 days)**

---

## Notes

- Google OAuth works on localhost without HTTPS
- First user to sign in automatically becomes admin
- Cookies use domain `.bennernet.com` for SSO in production
- Session duration is 30 days by default
- Preview mode shows demo/default settings, not real user data
