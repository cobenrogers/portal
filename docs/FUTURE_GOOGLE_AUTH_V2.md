# Bennernet Shared Authentication - Implementation Plan v2

> **Status:** Ready for Implementation
> **Approach:** Phased rollout - Basic auth first, granular permissions later
> **Scope:** Shared auth service for Portal, Helm, and future apps

---

## Overview

This document outlines a **phased approach** to implementing Google OAuth authentication across bennernet.com applications. Phase 1 delivers core authentication with blanket user approval. Phase 2 adds granular per-app permissions.

### Goals

1. Single sign-on across all bennernet.com apps
2. Google OAuth for secure, passwordless authentication
3. Preview mode for unauthenticated visitors
4. Admin approval workflow for new users
5. *(Phase 2)* Per-app permission granularity

---

## Phase Summary

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1** | Shared auth, SSO, preview mode, blanket approval | 2 days |
| **Phase 2** | Per-app permissions, roles, enhanced admin panel | 1-2 days |

**Recommendation:** Implement Phase 1 first. Add Phase 2 when you actually need per-app control.

---

## Architecture

### Directory Structure

```
bennernet.com/
├── auth/                      # Shared auth service (NEW)
│   ├── api/
│   │   ├── auth-config.php    # OAuth credentials (gitignored)
│   │   ├── google-login.php   # Initiates OAuth flow
│   │   ├── google-callback.php # Handles OAuth callback
│   │   ├── logout.php         # Clears session
│   │   └── me.php             # Returns current user
│   ├── shared/
│   │   ├── database.php       # MySQL connection
│   │   └── auth.php           # Auth middleware
│   └── admin/                 # Admin panel (Phase 1: simple, Phase 2: enhanced)
│       └── index.php
│
├── portal/                    # Portal app (existing)
│   ├── api/                   # Portal-specific APIs (feeds, settings)
│   └── src/                   # React frontend
│
└── helm/                      # Helm app (future)
    ├── api/
    └── src/
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Authentication Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User visits bennernet.com/portal/                              │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐     No cookie      ┌──────────────┐           │
│  │  Check for   │ ─────────────────► │ Preview Mode │           │
│  │   session    │                    │ (read-only)  │           │
│  └──────────────┘                    └──────────────┘           │
│         │                                   │                    │
│         │ Has cookie                        │ Click "Sign in"    │
│         ▼                                   ▼                    │
│  ┌──────────────┐                    ┌──────────────┐           │
│  │   Validate   │                    │ Google OAuth │           │
│  │   session    │                    │    Flow      │           │
│  └──────────────┘                    └──────────────┘           │
│         │                                   │                    │
│         ▼                                   ▼                    │
│  ┌──────────────┐                    ┌──────────────┐           │
│  │ Check if     │                    │ Create user  │           │
│  │ approved     │                    │ + session    │           │
│  └──────────────┘                    └──────────────┘           │
│         │                                   │                    │
│    ┌────┴────┐                              │                    │
│    ▼         ▼                              ▼                    │
│ Approved  Pending                    ┌──────────────┐           │
│    │         │                       │ First user = │           │
│    ▼         ▼                       │ auto admin   │           │
│ Full      Preview +                  └──────────────┘           │
│ Access    "Pending" msg                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Basic Shared Authentication

### 1.1 Database Schema

```sql
-- Shared user table
CREATE TABLE bennernet_users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,    -- Blanket approval for all apps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    INDEX idx_google_id (google_id),
    INDEX idx_email (email)
);

-- Session management
CREATE TABLE bennernet_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- App-specific settings (one table per app)
CREATE TABLE portal_user_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    settings_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE
);
```

### 1.2 Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "Bennernet"
3. Enable "Google+ API" (for user info)
4. Navigate to "APIs & Services" > "Credentials"
5. Configure OAuth consent screen:
   - App name: "Bennernet"
   - User support email: your email
   - Authorized domains: `bennernet.com`
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: "Bennernet Web"
   - Authorized redirect URIs:
     ```
     http://localhost:5173/auth/api/google-callback.php
     http://localhost:8080/auth/api/google-callback.php
     https://bennernet.com/auth/api/google-callback.php
     ```

### 1.3 Configuration File

```php
<?php
// auth/api/auth-config.php (GITIGNORED)

// Google OAuth
define('GOOGLE_CLIENT_ID', 'your-client-id.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', 'your-client-secret');

// Determine redirect URI based on environment
$isLocal = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:5173', 'localhost:8080', '127.0.0.1:5173']);
define('GOOGLE_REDIRECT_URI', $isLocal
    ? 'http://localhost:5173/auth/api/google-callback.php'
    : 'https://bennernet.com/auth/api/google-callback.php'
);

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');

// Session
define('SESSION_DURATION', 60 * 60 * 24 * 30); // 30 days

// Cookie domain (for SSO across subpaths)
define('COOKIE_DOMAIN', $isLocal ? '' : '.bennernet.com');
```

### 1.4 Shared Database Connection

```php
<?php
// auth/shared/database.php

require_once __DIR__ . '/../api/auth-config.php';

function getDatabase(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
    }

    return $pdo;
}
```

### 1.5 Auth Middleware

```php
<?php
// auth/shared/auth.php

require_once __DIR__ . '/database.php';

/**
 * Get current authenticated user from session cookie
 */
function getCurrentUser(): ?array {
    $token = $_COOKIE['bennernet_session'] ?? '';

    if (empty($token)) {
        return null;
    }

    $pdo = getDatabase();
    $stmt = $pdo->prepare('
        SELECT u.* FROM bennernet_users u
        JOIN bennernet_sessions s ON s.user_id = u.id
        WHERE s.token = ?
          AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

/**
 * Require authentication - returns user or exits with 401
 */
function requireAuth(): array {
    $user = getCurrentUser();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }

    return $user;
}

/**
 * Require approved user
 */
function requireApproved(): array {
    $user = requireAuth();

    if (!$user['is_approved']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Account pending approval']);
        exit;
    }

    return $user;
}

/**
 * Require admin
 */
function requireAdmin(): array {
    $user = requireApproved();

    if (!$user['is_admin']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }

    return $user;
}

/**
 * Generate UUID
 */
function generateUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
```

### 1.6 OAuth Endpoints

#### google-login.php

```php
<?php
// auth/api/google-login.php

require_once __DIR__ . '/auth-config.php';

// Store return URL in session for after callback
session_start();
$_SESSION['auth_return_url'] = $_GET['return'] ?? '/portal/';

$params = http_build_query([
    'client_id' => GOOGLE_CLIENT_ID,
    'redirect_uri' => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope' => 'openid email profile',
    'access_type' => 'online',
    'prompt' => 'select_account'
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
```

#### google-callback.php

```php
<?php
// auth/api/google-callback.php

require_once __DIR__ . '/auth-config.php';
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

session_start();
$returnUrl = $_SESSION['auth_return_url'] ?? '/portal/';
unset($_SESSION['auth_return_url']);

$code = $_GET['code'] ?? '';
if (empty($code)) {
    header('Location: ' . $returnUrl . '?error=auth_failed');
    exit;
}

// Exchange code for tokens
$tokenResponse = exchangeCodeForTokens($code);
if (!$tokenResponse || isset($tokenResponse['error'])) {
    header('Location: ' . $returnUrl . '?error=token_failed');
    exit;
}

// Get user info from Google
$userInfo = getGoogleUserInfo($tokenResponse['access_token']);
if (!$userInfo || isset($userInfo['error'])) {
    header('Location: ' . $returnUrl . '?error=user_info_failed');
    exit;
}

// Find or create user
$user = findOrCreateUser($userInfo);

// Create session
$session = createSession($user['id']);

// Set domain-wide cookie
setcookie('bennernet_session', $session['token'], [
    'expires' => time() + SESSION_DURATION,
    'path' => '/',
    'domain' => COOKIE_DOMAIN,
    'secure' => !empty(COOKIE_DOMAIN), // Only secure in production
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Redirect based on approval status
if ($user['is_approved']) {
    header('Location: ' . $returnUrl);
} else {
    header('Location: ' . $returnUrl . '?pending=true');
}
exit;

// --- Helper Functions ---

function exchangeCodeForTokens(string $code): ?array {
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'code' => $code,
            'client_id' => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'redirect_uri' => GOOGLE_REDIRECT_URI,
            'grant_type' => 'authorization_code'
        ])
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

function getGoogleUserInfo(string $accessToken): ?array {
    $ch = curl_init('https://www.googleapis.com/oauth2/v2/userinfo');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken]
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

function findOrCreateUser(array $googleUser): array {
    $pdo = getDatabase();

    // Check if user exists
    $stmt = $pdo->prepare('SELECT * FROM bennernet_users WHERE google_id = ?');
    $stmt->execute([$googleUser['id']]);
    $user = $stmt->fetch();

    if ($user) {
        // Update last login and info
        $stmt = $pdo->prepare('
            UPDATE bennernet_users
            SET last_login_at = NOW(), name = ?, avatar_url = ?
            WHERE id = ?
        ');
        $stmt->execute([$googleUser['name'], $googleUser['picture'] ?? null, $user['id']]);
        return $user;
    }

    // Create new user
    $userId = generateUUID();

    // First user is auto-approved as admin
    $isFirstUser = $pdo->query('SELECT COUNT(*) FROM bennernet_users')->fetchColumn() == 0;

    $stmt = $pdo->prepare('
        INSERT INTO bennernet_users (id, google_id, email, name, avatar_url, is_admin, is_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $userId,
        $googleUser['id'],
        $googleUser['email'],
        $googleUser['name'],
        $googleUser['picture'] ?? null,
        $isFirstUser,
        $isFirstUser
    ]);

    return [
        'id' => $userId,
        'is_approved' => $isFirstUser,
        'is_admin' => $isFirstUser
    ];
}

function createSession(string $userId): array {
    $pdo = getDatabase();

    $sessionId = generateUUID();
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

    $stmt = $pdo->prepare('
        INSERT INTO bennernet_sessions (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([$sessionId, $userId, $token, $expiresAt]);

    return ['id' => $sessionId, 'token' => $token, 'expires_at' => $expiresAt];
}
```

#### me.php

```php
<?php
// auth/api/me.php

require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$user = getCurrentUser();

if (!$user) {
    echo json_encode([
        'success' => true,
        'data' => [
            'authenticated' => false,
            'preview' => true,
            'message' => 'Sign in with Google to customize'
        ]
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'authenticated' => true,
        'preview' => !$user['is_approved'],
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'avatarUrl' => $user['avatar_url'],
            'isAdmin' => (bool)$user['is_admin'],
            'isApproved' => (bool)$user['is_approved']
        ],
        'message' => $user['is_approved'] ? null : 'Your account is pending approval'
    ]
]);
```

#### logout.php

```php
<?php
// auth/api/logout.php

require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/auth-config.php';

header('Content-Type: application/json');

$token = $_COOKIE['bennernet_session'] ?? '';

if ($token) {
    $pdo = getDatabase();
    $stmt = $pdo->prepare('DELETE FROM bennernet_sessions WHERE token = ?');
    $stmt->execute([$token]);
}

// Clear cookie
setcookie('bennernet_session', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'domain' => COOKIE_DOMAIN,
    'secure' => !empty(COOKIE_DOMAIN),
    'httponly' => true,
    'samesite' => 'Lax'
]);

echo json_encode(['success' => true]);
```

### 1.7 Admin Endpoints (Phase 1 - Simple)

#### admin/users.php

```php
<?php
// auth/api/admin/users.php

require_once __DIR__ . '/../../shared/database.php';
require_once __DIR__ . '/../../shared/auth.php';

header('Content-Type: application/json');

$admin = requireAdmin();
$pdo = getDatabase();

$stmt = $pdo->query('
    SELECT id, email, name, avatar_url, is_admin, is_approved, created_at, last_login_at
    FROM bennernet_users
    ORDER BY created_at DESC
');

echo json_encode([
    'success' => true,
    'data' => $stmt->fetchAll()
]);
```

#### admin/approve.php

```php
<?php
// auth/api/admin/approve.php

require_once __DIR__ . '/../../shared/database.php';
require_once __DIR__ . '/../../shared/auth.php';

header('Content-Type: application/json');

$admin = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['userId'] ?? '';
$approve = $input['approve'] ?? true;

if (empty($userId)) {
    echo json_encode(['success' => false, 'error' => 'userId required']);
    exit;
}

$pdo = getDatabase();
$stmt = $pdo->prepare('UPDATE bennernet_users SET is_approved = ? WHERE id = ?');
$stmt->execute([$approve ? 1 : 0, $userId]);

echo json_encode(['success' => true]);
```

### 1.8 Frontend Integration

#### Types (src/types/auth.ts)

```typescript
export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isAdmin: boolean
  isApproved: boolean
}

export interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  isApproved: boolean
  isPreview: boolean
  isAdmin: boolean
  user: User | null
  message?: string
}
```

#### Auth Context (src/contexts/AuthContext.tsx)

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, AuthState } from '@/types/auth'

interface AuthContextType extends AuthState {
  login: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,
    isPreview: true,
    isAdmin: false,
    user: null
  })

  const refreshUser = async () => {
    try {
      const response = await fetch('/auth/api/me.php')
      const result = await response.json()

      if (result.success) {
        const data = result.data
        setAuth({
          isLoading: false,
          isAuthenticated: data.authenticated,
          isApproved: data.user?.isApproved ?? false,
          isPreview: data.preview,
          isAdmin: data.user?.isAdmin ?? false,
          user: data.user ?? null,
          message: data.message
        })
      }
    } catch {
      setAuth(prev => ({ ...prev, isLoading: false, isPreview: true }))
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = () => {
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `/auth/api/google-login.php?return=${returnUrl}`
  }

  const logout = async () => {
    await fetch('/auth/api/logout.php', { method: 'POST' })
    setAuth({
      isLoading: false,
      isAuthenticated: false,
      isApproved: false,
      isPreview: true,
      isAdmin: false,
      user: null
    })
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

#### Login Button Component

```typescript
// src/components/auth/LoginButton.tsx
import { useAuth } from '@/contexts/AuthContext'

export function LoginButton() {
  const { login } = useAuth()

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  )
}
```

#### User Menu Component

```typescript
// src/components/auth/UserMenu.tsx
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!isAuthenticated || !user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
            <div className="px-4 py-2 border-b dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

#### Preview Banner Component

```typescript
// src/components/auth/PreviewBanner.tsx
import { useAuth } from '@/contexts/AuthContext'

export function PreviewBanner() {
  const { isPreview, isAuthenticated, message, login } = useAuth()

  if (!isPreview) return null

  // Pending approval
  if (isAuthenticated) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-yellow-800 dark:text-yellow-200 text-sm">
            {message || 'Your account is pending approval'}
          </span>
        </div>
      </div>
    )
  }

  // Guest preview
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-blue-800 dark:text-blue-200 text-sm">
          Preview Mode - View only
        </span>
        <button
          onClick={login}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Sign in to customize
        </button>
      </div>
    </div>
  )
}
```

### 1.9 Update Portal Settings Endpoints

#### portal/api/settings/get.php (Updated)

```php
<?php
require_once __DIR__ . '/../../auth/shared/database.php';
require_once __DIR__ . '/../../auth/shared/auth.php';
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$user = getCurrentUser();

if (!$user || !$user['is_approved']) {
    // Return demo/default settings for preview mode
    echo json_encode(['success' => true, 'data' => getDefaultSettings(), 'preview' => true]);
    exit;
}

// Get user's settings from database
$pdo = getDatabase();
$stmt = $pdo->prepare('SELECT settings_json FROM portal_user_settings WHERE user_id = ?');
$stmt->execute([$user['id']]);
$result = $stmt->fetch();

if ($result) {
    echo json_encode(['success' => true, 'data' => json_decode($result['settings_json'], true)]);
} else {
    // No settings yet, return defaults
    echo json_encode(['success' => true, 'data' => getDefaultSettings()]);
}
```

#### portal/api/settings/save.php (Updated)

```php
<?php
require_once __DIR__ . '/../../auth/shared/database.php';
require_once __DIR__ . '/../../auth/shared/auth.php';

header('Content-Type: application/json');

// Require approved user (replaces PIN)
$user = requireApproved();

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['settings'])) {
    echo json_encode(['success' => false, 'error' => 'Settings data required']);
    exit;
}

$pdo = getDatabase();

// Upsert user settings
$stmt = $pdo->prepare('
    INSERT INTO portal_user_settings (user_id, settings_json)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)
');
$stmt->execute([$user['id'], json_encode($input['settings'])]);

echo json_encode(['success' => true]);
```

---

## Phase 2: Per-App Permissions (Future)

When you need granular control over which users can access which apps:

### 2.1 Additional Database Table

```sql
CREATE TABLE bennernet_app_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    app_name VARCHAR(50) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    role ENUM('viewer', 'member', 'admin') DEFAULT 'member',
    approved_by VARCHAR(36),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_app (user_id, app_name)
);
```

### 2.2 Enhanced Auth Middleware

Add functions to check app-specific permissions:

```php
function isApprovedForApp(string $userId, string $appName): bool {
    $pdo = getDatabase();
    $stmt = $pdo->prepare('
        SELECT is_approved FROM bennernet_app_permissions
        WHERE user_id = ? AND app_name = ?
    ');
    $stmt->execute([$userId, $appName]);
    $result = $stmt->fetch();
    return $result && $result['is_approved'];
}

function requireAppAuth(string $appName): array {
    $user = requireAuth();

    // Global admins bypass
    if ($user['is_admin']) return $user;

    if (!isApprovedForApp($user['id'], $appName)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => "No access to $appName"]);
        exit;
    }

    return $user;
}
```

### 2.3 Enhanced Admin Panel

Build a matrix UI showing users × apps with approval checkboxes and role selectors.

---

## Local Development Setup

### Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### PHP Development Server

```bash
# From project root
php -S localhost:8080 -t .
```

### Local Database

Use MAMP, XAMPP, or Docker for MySQL locally. Create the tables from section 1.1.

### Testing OAuth Locally

1. Google OAuth supports `localhost` redirect URIs
2. Cookies work without domain on localhost
3. HTTP is fine for local development (no HTTPS required)

---

## Deployment Checklist

### Phase 1

- [ ] Create MySQL database and tables
- [ ] Set up Google Cloud Console project and OAuth credentials
- [ ] Deploy `/auth/` directory to bennernet.com
- [ ] Create `auth-config.php` with production credentials
- [ ] Add `auth-config.php` to `.gitignore`
- [ ] Update Portal settings endpoints to use auth
- [ ] Add AuthContext to Portal frontend
- [ ] Update Portal header with login/user menu
- [ ] Test OAuth flow end-to-end
- [ ] Verify first user becomes admin
- [ ] Test approval workflow

### Phase 2 (When Needed)

- [ ] Add `bennernet_app_permissions` table
- [ ] Update auth middleware with app-specific functions
- [ ] Build enhanced admin panel
- [ ] Update each app to check app-specific permissions

---

## Security Considerations

1. **HTTPS**: Production uses HTTPS; cookies are secure
2. **HttpOnly Cookies**: Session tokens not accessible via JavaScript
3. **SameSite=Lax**: Prevents CSRF on state-changing requests
4. **Token Expiry**: Sessions expire after 30 days
5. **Admin Approval**: New users require manual approval
6. **First User = Admin**: Bootstraps the system securely

---

## Testing Strategy

### Overview

Testing is organized into three layers:
1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test API endpoints and database interactions
3. **UI Tests** - Test frontend components and user flows

### Test Stack

| Layer | Tool | Location |
|-------|------|----------|
| PHP Unit Tests | PHPUnit | `auth/tests/unit/` |
| PHP Integration Tests | PHPUnit + Test DB | `auth/tests/integration/` |
| Frontend Unit Tests | Vitest | `portal/src/**/*.test.ts` |
| Frontend Integration | Vitest + MSW | `portal/src/**/*.test.tsx` |
| E2E / UI Tests | Playwright | `portal/e2e/` |

---

### Unit Tests (PHP)

Test auth middleware functions in isolation using mocks.

#### Setup

```bash
# Install PHPUnit
composer require --dev phpunit/phpunit
```

#### Test Structure

```
auth/
├── tests/
│   ├── unit/
│   │   ├── AuthTest.php
│   │   └── DatabaseTest.php
│   ├── integration/
│   │   ├── GoogleCallbackTest.php
│   │   ├── MeEndpointTest.php
│   │   └── AdminEndpointsTest.php
│   ├── fixtures/
│   │   └── test-data.sql
│   └── bootstrap.php
└── phpunit.xml
```

#### auth/phpunit.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="tests/bootstrap.php" colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/unit</directory>
        </testsuite>
        <testsuite name="Integration">
            <directory>tests/integration</directory>
        </testsuite>
    </testsuites>
    <php>
        <env name="DB_NAME" value="bennernet_test"/>
        <env name="TESTING" value="true"/>
    </php>
</phpunit>
```

#### auth/tests/bootstrap.php

```php
<?php
// Test bootstrap - load test config
define('TESTING', true);
define('DB_HOST', 'localhost');
define('DB_NAME', 'bennernet_test');
define('DB_USER', 'root');
define('DB_PASS', '');

require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

// Helper to reset test database
function resetTestDatabase(): void {
    $pdo = getDatabase();
    $pdo->exec('TRUNCATE TABLE bennernet_sessions');
    $pdo->exec('TRUNCATE TABLE portal_user_settings');
    $pdo->exec('DELETE FROM bennernet_users');
}

// Helper to create test user
function createTestUser(array $overrides = []): array {
    $pdo = getDatabase();
    $userId = generateUUID();

    $defaults = [
        'id' => $userId,
        'google_id' => 'google_' . $userId,
        'email' => 'test@example.com',
        'name' => 'Test User',
        'avatar_url' => null,
        'is_admin' => false,
        'is_approved' => false
    ];

    $data = array_merge($defaults, $overrides);

    $stmt = $pdo->prepare('
        INSERT INTO bennernet_users (id, google_id, email, name, avatar_url, is_admin, is_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $data['id'], $data['google_id'], $data['email'],
        $data['name'], $data['avatar_url'], $data['is_admin'], $data['is_approved']
    ]);

    return $data;
}

// Helper to create test session
function createTestSession(string $userId): string {
    $pdo = getDatabase();
    $token = bin2hex(random_bytes(32));

    $stmt = $pdo->prepare('
        INSERT INTO bennernet_sessions (id, user_id, token, expires_at)
        VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
    ');
    $stmt->execute([generateUUID(), $userId, $token]);

    return $token;
}
```

#### auth/tests/unit/AuthTest.php

```php
<?php
use PHPUnit\Framework\TestCase;

class AuthTest extends TestCase
{
    protected function setUp(): void
    {
        resetTestDatabase();
    }

    public function testGetCurrentUserReturnsNullWithNoSession(): void
    {
        // No cookie set
        unset($_COOKIE['bennernet_session']);

        $user = getCurrentUser();

        $this->assertNull($user);
    }

    public function testGetCurrentUserReturnsUserWithValidSession(): void
    {
        $testUser = createTestUser(['is_approved' => true]);
        $token = createTestSession($testUser['id']);
        $_COOKIE['bennernet_session'] = $token;

        $user = getCurrentUser();

        $this->assertNotNull($user);
        $this->assertEquals($testUser['email'], $user['email']);
    }

    public function testGetCurrentUserReturnsNullWithExpiredSession(): void
    {
        $testUser = createTestUser();
        $pdo = getDatabase();
        $token = bin2hex(random_bytes(32));

        // Create expired session
        $stmt = $pdo->prepare('
            INSERT INTO bennernet_sessions (id, user_id, token, expires_at)
            VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 1 DAY))
        ');
        $stmt->execute([generateUUID(), $testUser['id'], $token]);

        $_COOKIE['bennernet_session'] = $token;

        $user = getCurrentUser();

        $this->assertNull($user);
    }

    public function testGetCurrentUserReturnsNullWithInvalidToken(): void
    {
        $_COOKIE['bennernet_session'] = 'invalid_token_12345';

        $user = getCurrentUser();

        $this->assertNull($user);
    }

    public function testGenerateUUIDReturnsValidFormat(): void
    {
        $uuid = generateUUID();

        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
            $uuid
        );
    }

    public function testGenerateUUIDReturnsUniqueValues(): void
    {
        $uuid1 = generateUUID();
        $uuid2 = generateUUID();

        $this->assertNotEquals($uuid1, $uuid2);
    }
}
```

#### auth/tests/unit/FirstUserAdminTest.php

```php
<?php
use PHPUnit\Framework\TestCase;

class FirstUserAdminTest extends TestCase
{
    protected function setUp(): void
    {
        resetTestDatabase();
    }

    public function testFirstUserBecomesAdmin(): void
    {
        $pdo = getDatabase();

        // Verify no users exist
        $count = $pdo->query('SELECT COUNT(*) FROM bennernet_users')->fetchColumn();
        $this->assertEquals(0, $count);

        // Simulate first user creation (from findOrCreateUser logic)
        $isFirstUser = $pdo->query('SELECT COUNT(*) FROM bennernet_users')->fetchColumn() == 0;

        $this->assertTrue($isFirstUser);
    }

    public function testSecondUserIsNotAdmin(): void
    {
        // Create first user
        createTestUser(['is_admin' => true, 'is_approved' => true]);

        $pdo = getDatabase();
        $isFirstUser = $pdo->query('SELECT COUNT(*) FROM bennernet_users')->fetchColumn() == 0;

        $this->assertFalse($isFirstUser);
    }
}
```

---

### Integration Tests (PHP)

Test API endpoints with real database interactions.

#### auth/tests/integration/MeEndpointTest.php

```php
<?php
use PHPUnit\Framework\TestCase;

class MeEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        resetTestDatabase();
    }

    public function testMeReturnsPreviewForUnauthenticated(): void
    {
        unset($_COOKIE['bennernet_session']);

        ob_start();
        include __DIR__ . '/../../api/me.php';
        $output = ob_get_clean();

        $response = json_decode($output, true);

        $this->assertTrue($response['success']);
        $this->assertFalse($response['data']['authenticated']);
        $this->assertTrue($response['data']['preview']);
    }

    public function testMeReturnsUserForAuthenticated(): void
    {
        $testUser = createTestUser(['is_approved' => true]);
        $token = createTestSession($testUser['id']);
        $_COOKIE['bennernet_session'] = $token;

        ob_start();
        include __DIR__ . '/../../api/me.php';
        $output = ob_get_clean();

        $response = json_decode($output, true);

        $this->assertTrue($response['success']);
        $this->assertTrue($response['data']['authenticated']);
        $this->assertFalse($response['data']['preview']);
        $this->assertEquals($testUser['email'], $response['data']['user']['email']);
    }

    public function testMeReturnsPreviewForPendingUser(): void
    {
        $testUser = createTestUser(['is_approved' => false]);
        $token = createTestSession($testUser['id']);
        $_COOKIE['bennernet_session'] = $token;

        ob_start();
        include __DIR__ . '/../../api/me.php';
        $output = ob_get_clean();

        $response = json_decode($output, true);

        $this->assertTrue($response['success']);
        $this->assertTrue($response['data']['authenticated']);
        $this->assertTrue($response['data']['preview']);
        $this->assertStringContainsString('pending', $response['data']['message']);
    }
}
```

#### auth/tests/integration/AdminEndpointsTest.php

```php
<?php
use PHPUnit\Framework\TestCase;

class AdminEndpointsTest extends TestCase
{
    protected function setUp(): void
    {
        resetTestDatabase();
    }

    public function testApproveUserRequiresAdmin(): void
    {
        // Create non-admin user
        $user = createTestUser(['is_admin' => false, 'is_approved' => true]);
        $token = createTestSession($user['id']);
        $_COOKIE['bennernet_session'] = $token;

        $_SERVER['REQUEST_METHOD'] = 'POST';

        ob_start();
        http_response_code(200); // Reset
        include __DIR__ . '/../../api/admin/approve.php';
        $output = ob_get_clean();

        $this->assertEquals(403, http_response_code());
    }

    public function testApproveUserSucceedsForAdmin(): void
    {
        // Create admin
        $admin = createTestUser(['is_admin' => true, 'is_approved' => true]);
        $adminToken = createTestSession($admin['id']);
        $_COOKIE['bennernet_session'] = $adminToken;

        // Create pending user
        $pendingUser = createTestUser([
            'email' => 'pending@example.com',
            'is_approved' => false
        ]);

        // Mock POST data
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $GLOBALS['HTTP_RAW_POST_DATA'] = json_encode([
            'userId' => $pendingUser['id'],
            'approve' => true
        ]);

        ob_start();
        include __DIR__ . '/../../api/admin/approve.php';
        $output = ob_get_clean();

        $response = json_decode($output, true);
        $this->assertTrue($response['success']);

        // Verify user is now approved
        $pdo = getDatabase();
        $stmt = $pdo->prepare('SELECT is_approved FROM bennernet_users WHERE id = ?');
        $stmt->execute([$pendingUser['id']]);
        $result = $stmt->fetch();

        $this->assertEquals(1, $result['is_approved']);
    }

    public function testListUsersReturnsAllUsers(): void
    {
        $admin = createTestUser(['is_admin' => true, 'is_approved' => true]);
        createTestUser(['email' => 'user2@example.com']);
        createTestUser(['email' => 'user3@example.com']);

        $token = createTestSession($admin['id']);
        $_COOKIE['bennernet_session'] = $token;

        ob_start();
        include __DIR__ . '/../../api/admin/users.php';
        $output = ob_get_clean();

        $response = json_decode($output, true);

        $this->assertTrue($response['success']);
        $this->assertCount(3, $response['data']);
    }
}
```

---

### Frontend Unit Tests (Vitest)

Test React components and hooks in isolation.

#### portal/src/contexts/AuthContext.test.tsx

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AuthContext', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('starts in loading state', () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: { authenticated: false, preview: true } })
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('sets preview mode for unauthenticated users', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { authenticated: false, preview: true, message: 'Sign in' }
      })
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isPreview).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user data for authenticated users', async () => {
    const mockUser = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: null,
      isAdmin: false,
      isApproved: true
    }

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: {
          authenticated: true,
          preview: false,
          user: mockUser
        }
      })
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isPreview).toBe(false)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isApproved).toBe(true)
  })

  it('sets preview mode for pending users', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: {
          authenticated: true,
          preview: true,
          user: { isApproved: false },
          message: 'Pending approval'
        }
      })
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isPreview).toBe(true)
    expect(result.current.isApproved).toBe(false)
  })

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isPreview).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })
})
```

#### portal/src/components/auth/LoginButton.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginButton } from './LoginButton'
import * as AuthContext from '@/contexts/AuthContext'

describe('LoginButton', () => {
  it('renders sign in text', () => {
    const mockLogin = vi.fn()
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      login: mockLogin,
      // ... other required props
    } as any)

    render(<LoginButton />)

    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
  })

  it('calls login function when clicked', () => {
    const mockLogin = vi.fn()
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      login: mockLogin,
    } as any)

    render(<LoginButton />)
    fireEvent.click(screen.getByRole('button'))

    expect(mockLogin).toHaveBeenCalledTimes(1)
  })
})
```

#### portal/src/components/auth/PreviewBanner.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewBanner } from './PreviewBanner'
import * as AuthContext from '@/contexts/AuthContext'

describe('PreviewBanner', () => {
  it('renders nothing when not in preview mode', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isPreview: false,
      isAuthenticated: true,
    } as any)

    const { container } = render(<PreviewBanner />)

    expect(container.firstChild).toBeNull()
  })

  it('shows preview message for guests', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isPreview: true,
      isAuthenticated: false,
      login: vi.fn(),
    } as any)

    render(<PreviewBanner />)

    expect(screen.getByText(/preview mode/i)).toBeInTheDocument()
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('shows pending message for unapproved users', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isPreview: true,
      isAuthenticated: true,
      message: 'Your account is pending approval',
    } as any)

    render(<PreviewBanner />)

    expect(screen.getByText(/pending approval/i)).toBeInTheDocument()
  })
})
```

---

### E2E / UI Tests (Playwright)

Test complete user flows in a real browser.

#### Setup

```bash
npm install -D @playwright/test
npx playwright install
```

#### portal/playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### portal/e2e/auth.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows preview banner for unauthenticated users', async ({ page }) => {
    await page.goto('/')

    // Should see preview banner
    await expect(page.getByText(/preview mode/i)).toBeVisible()

    // Should see login button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Should NOT see edit button
    await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible()
  })

  test('shows dashboard in preview mode', async ({ page }) => {
    await page.goto('/')

    // Dashboard should still render
    await expect(page.locator('.widget')).toBeVisible()

    // But widgets should be read-only (no drag handles)
    await expect(page.locator('.react-grid-item')).not.toHaveClass(/react-draggable/)
  })

  test('login button redirects to Google', async ({ page }) => {
    await page.goto('/')

    // Click login
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /sign in/i }).click()
    ])

    // Should redirect to Google (or our auth endpoint)
    await expect(popup.url()).toContain('/auth/api/google-login.php')
  })
})

test.describe('Authenticated User', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set mock session cookie
    await context.addCookies([{
      name: 'bennernet_session',
      value: 'test_session_token',
      domain: 'localhost',
      path: '/'
    }])

    // Mock the /auth/api/me.php endpoint
    await page.route('**/auth/api/me.php**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            preview: false,
            user: {
              id: 'test-user-id',
              name: 'Test User',
              email: 'test@example.com',
              avatarUrl: null,
              isAdmin: false,
              isApproved: true
            }
          }
        })
      })
    })
  })

  test('shows user menu for authenticated users', async ({ page }) => {
    await page.goto('/')

    // Should NOT see preview banner
    await expect(page.getByText(/preview mode/i)).not.toBeVisible()

    // Should see user avatar/menu
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('shows edit button for approved users', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible()
  })

  test('can open user menu and logout', async ({ page }) => {
    await page.goto('/')

    // Click user menu
    await page.locator('[data-testid="user-menu"]').click()

    // Should see logout option
    await expect(page.getByText(/sign out/i)).toBeVisible()
  })
})

test.describe('Pending Approval', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([{
      name: 'bennernet_session',
      value: 'pending_session_token',
      domain: 'localhost',
      path: '/'
    }])

    await page.route('**/auth/api/me.php**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            preview: true,
            user: {
              id: 'pending-user-id',
              name: 'Pending User',
              email: 'pending@example.com',
              isApproved: false
            },
            message: 'Your account is pending approval'
          }
        })
      })
    })
  })

  test('shows pending approval banner', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/pending approval/i)).toBeVisible()
  })

  test('hides edit controls for pending users', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /edit/i })).not.toBeVisible()
  })
})
```

#### portal/e2e/settings.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Settings (Authenticated)', () => {
  test.beforeEach(async ({ page, context }) => {
    // Setup authenticated user
    await context.addCookies([{
      name: 'bennernet_session',
      value: 'test_session',
      domain: 'localhost',
      path: '/'
    }])

    await page.route('**/auth/api/me.php**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            preview: false,
            user: { isApproved: true, isAdmin: false }
          }
        })
      })
    })
  })

  test('can save settings', async ({ page }) => {
    let savedSettings = null

    // Mock save endpoint
    await page.route('**/api/settings/save.php**', route => {
      savedSettings = route.request().postDataJSON()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    await page.goto('/')

    // Enter edit mode
    await page.getByRole('button', { name: /edit/i }).click()

    // Make a change (e.g., drag a widget)
    // ...

    // Save
    await page.getByRole('button', { name: /save/i }).click()

    // Verify save was called
    expect(savedSettings).not.toBeNull()
  })
})
```

---

### Running Tests

#### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:php": "cd ../auth && vendor/bin/phpunit",
    "test:all": "npm run test && npm run test:php && npm run test:e2e"
  }
}
```

#### CI Integration (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  php-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: bennernet_test
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      - run: composer install --working-dir=auth
      - run: cd auth && vendor/bin/phpunit

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd portal && npm ci
      - run: cd portal && npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd portal && npm ci
      - run: npx playwright install --with-deps
      - run: cd portal && npm run test:e2e
```

---

### Test Database Setup

```sql
-- Create test database
CREATE DATABASE IF NOT EXISTS bennernet_test;
USE bennernet_test;

-- Same schema as production
CREATE TABLE bennernet_users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE TABLE bennernet_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE
);

CREATE TABLE portal_user_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    settings_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE
);
```

---

## Migration Notes

### From PIN-based to Google Auth

1. First user to sign in becomes admin with their existing settings
2. Migrate `portal-settings.json` to first admin's database record
3. Remove PIN verification from settings save endpoint
4. Remove PIN from config.php after migration

---

*Document Version: 2.0*
*Created: December 2024*
*Status: Ready for Implementation*
