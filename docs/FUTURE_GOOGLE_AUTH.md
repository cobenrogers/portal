# Portal - Google Authentication Implementation Plan

> **Status:** Planning / Future Consideration
> **Prerequisite:** Current PIN-based system works for single-user
> **Purpose:** Enable multi-user support with individual dashboards

---

## Overview

This document outlines the design for adding Google OAuth authentication to Portal, enabling multiple users to have their own personalized dashboards with individual widget configurations.

### Goals

1. Replace PIN-based authentication with Google Sign-In
2. Support multiple users with separate dashboard configurations
3. Maintain backward compatibility with existing settings structure
4. Keep the simple, lightweight architecture

---

## 1. Database Schema

Portal currently uses file-based storage (`portal-settings.json`). For multi-user support, we'll migrate to MySQL (available on Bluehost).

### New Tables

```sql
-- Users table (stores Google-authenticated users)
CREATE TABLE portal_users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    INDEX idx_google_id (google_id),
    INDEX idx_email (email)
);

-- Sessions table (manages auth tokens)
CREATE TABLE portal_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- User settings (stores dashboard configuration per user)
CREATE TABLE portal_user_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    settings_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
);
```

### Data Migration

The existing `portal-settings.json` will be migrated to the first admin user's settings.

---

## 2. Google OAuth Flow

### Sequence Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  Portal API │     │ Google OAuth│     │   MySQL     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  1. Click Login   │                   │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │  2. Redirect to Google               │                   │
       │◄─────────────────────────────────────►│                   │
       │                   │                   │                   │
       │  3. User approves, Google redirects  │                   │
       │───────────────────►                   │                   │
       │  (with auth code) │                   │                   │
       │                   │                   │                   │
       │                   │ 4. Exchange code  │                   │
       │                   │   for tokens      │                   │
       │                   │──────────────────►│                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │ 5. Get user info  │                   │
       │                   │──────────────────►│                   │
       │                   │◄──────────────────│                   │
       │                   │                   │                   │
       │                   │ 6. Create/update user                 │
       │                   │──────────────────────────────────────►│
       │                   │                   │                   │
       │  7. Set session   │                   │                   │
       │◄──────────────────│                   │                   │
       │  cookie + redirect│                   │                   │
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Portal Dashboard"
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen:
   - App name: "Portal"
   - User support email: your email
   - Authorized domains: `bennernet.com`
6. Create Web Application credentials:
   - Name: "Portal Web"
   - Authorized redirect URIs:
     - `http://localhost:5173/api/auth/google-callback.php` (development)
     - `https://bennernet.com/portal/api/auth/google-callback.php` (production)

### Environment Configuration

Create `api/auth/auth-config.php`:

```php
<?php
// Google OAuth credentials
define('GOOGLE_CLIENT_ID', 'your-client-id.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', 'your-client-secret');
define('GOOGLE_REDIRECT_URI', 'https://bennernet.com/portal/api/auth/google-callback.php');

// Database connection
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');

// Session settings
define('SESSION_DURATION', 60 * 60 * 24 * 30); // 30 days
```

---

## 3. API Endpoints

### New Directory Structure

```
api/
├── auth/
│   ├── auth-config.php       # OAuth credentials (gitignored)
│   ├── google-login.php      # Initiates OAuth flow
│   ├── google-callback.php   # Handles OAuth callback
│   ├── logout.php            # Clears session
│   └── me.php                # Returns current user
├── shared/
│   ├── database.php          # MySQL connection
│   └── auth.php              # Auth middleware
├── settings/
│   ├── get.php               # Get user's settings (updated)
│   └── save.php              # Save user's settings (updated)
└── feeds/
    └── ... (unchanged)
```

### Endpoint Implementations

#### GET /api/auth/google-login.php

Redirects user to Google's OAuth consent screen.

```php
<?php
require_once __DIR__ . '/auth-config.php';

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

#### GET /api/auth/google-callback.php

Handles OAuth callback, creates user/session.

```php
<?php
require_once __DIR__ . '/auth-config.php';
require_once __DIR__ . '/../shared/database.php';

header('Content-Type: application/json');

$code = $_GET['code'] ?? '';
if (empty($code)) {
    header('Location: /?error=auth_failed');
    exit;
}

// Exchange code for tokens
$tokenResponse = exchangeCodeForTokens($code);
if (!$tokenResponse || isset($tokenResponse['error'])) {
    header('Location: /?error=token_failed');
    exit;
}

// Get user info from Google
$userInfo = getGoogleUserInfo($tokenResponse['access_token']);
if (!$userInfo || isset($userInfo['error'])) {
    header('Location: /?error=user_info_failed');
    exit;
}

// Find or create user
$user = findOrCreateUser($userInfo);

// Create session
$session = createSession($user['id']);

// Set cookie
setcookie('portal_session', $session['token'], [
    'expires' => time() + SESSION_DURATION,
    'path' => '/portal/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Redirect based on approval status
if ($user['is_approved']) {
    header('Location: /portal/');
} else {
    header('Location: /portal/?pending=true');
}
exit;

// Helper functions
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
    global $pdo;

    // Check if user exists
    $stmt = $pdo->prepare('SELECT * FROM portal_users WHERE google_id = ?');
    $stmt->execute([$googleUser['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Update last login
        $stmt = $pdo->prepare('UPDATE portal_users SET last_login_at = NOW(), name = ?, avatar_url = ? WHERE id = ?');
        $stmt->execute([$googleUser['name'], $googleUser['picture'] ?? null, $user['id']]);
        return $user;
    }

    // Create new user
    $userId = generateUUID();

    // First user is auto-approved as admin
    $isFirstUser = $pdo->query('SELECT COUNT(*) FROM portal_users')->fetchColumn() == 0;

    $stmt = $pdo->prepare('
        INSERT INTO portal_users (id, google_id, email, name, avatar_url, is_admin, is_approved)
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

    // Create default settings for new user
    if ($isFirstUser) {
        // Migrate existing settings file for first user
        $existingSettings = file_get_contents(__DIR__ . '/../settings/portal-settings.json');
        if ($existingSettings) {
            $stmt = $pdo->prepare('INSERT INTO portal_user_settings (id, user_id, settings_json) VALUES (?, ?, ?)');
            $stmt->execute([generateUUID(), $userId, $existingSettings]);
        }
    }

    return [
        'id' => $userId,
        'is_approved' => $isFirstUser,
        'is_admin' => $isFirstUser
    ];
}

function createSession(string $userId): array {
    global $pdo;

    $sessionId = generateUUID();
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

    $stmt = $pdo->prepare('INSERT INTO portal_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$sessionId, $userId, $token, $expiresAt]);

    return ['id' => $sessionId, 'token' => $token, 'expires_at' => $expiresAt];
}

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

#### GET /api/auth/me.php

Returns current authenticated user.

```php
<?php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$user = getCurrentUser();

if (!$user) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'avatarUrl' => $user['avatar_url'],
        'isAdmin' => (bool)$user['is_admin'],
        'isApproved' => (bool)$user['is_approved']
    ]
]);
```

#### POST /api/auth/logout.php

Clears session and cookie.

```php
<?php
require_once __DIR__ . '/../shared/database.php';

header('Content-Type: application/json');

$token = $_COOKIE['portal_session'] ?? '';

if ($token) {
    global $pdo;
    $stmt = $pdo->prepare('DELETE FROM portal_sessions WHERE token = ?');
    $stmt->execute([$token]);
}

setcookie('portal_session', '', [
    'expires' => time() - 3600,
    'path' => '/portal/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
]);

echo json_encode(['success' => true]);
```

---

## 4. Shared Utilities

### api/shared/database.php

```php
<?php
require_once __DIR__ . '/../auth/auth-config.php';

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
```

### api/shared/auth.php

```php
<?php

/**
 * Get current authenticated user from session cookie
 */
function getCurrentUser(): ?array {
    $token = $_COOKIE['portal_session'] ?? '';

    if (empty($token)) {
        return null;
    }

    global $pdo;
    $stmt = $pdo->prepare('
        SELECT u.* FROM portal_users u
        JOIN portal_sessions s ON s.user_id = u.id
        WHERE s.token = ?
          AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
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

    if (!$user['is_approved']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Account pending approval']);
        exit;
    }

    return $user;
}

/**
 * Require admin role
 */
function requireAdmin(): array {
    $user = requireAuth();

    if (!$user['is_admin']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Admin access required']);
        exit;
    }

    return $user;
}
```

---

## 5. Updated Settings Endpoints

### api/settings/get.php (Updated)

```php
<?php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$user = getCurrentUser();

if (!$user) {
    // Return default settings for unauthenticated users (read-only view)
    require_once __DIR__ . '/config.php';
    echo json_encode(['success' => true, 'data' => getDefaultSettings()]);
    exit;
}

// Get user's settings from database
global $pdo;
$stmt = $pdo->prepare('SELECT settings_json FROM portal_user_settings WHERE user_id = ?');
$stmt->execute([$user['id']]);
$result = $stmt->fetch();

if ($result) {
    echo json_encode(['success' => true, 'data' => json_decode($result['settings_json'], true)]);
} else {
    // No settings yet, return defaults
    require_once __DIR__ . '/config.php';
    echo json_encode(['success' => true, 'data' => getDefaultSettings()]);
}
```

### api/settings/save.php (Updated)

```php
<?php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');

// Require authentication (replaces PIN verification)
$user = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['settings'])) {
    echo json_encode(['success' => false, 'error' => 'Settings data required']);
    exit;
}

global $pdo;

// Upsert user settings
$stmt = $pdo->prepare('
    INSERT INTO portal_user_settings (id, user_id, settings_json)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)
');

$stmt->execute([
    bin2hex(random_bytes(18)),
    $user['id'],
    json_encode($input['settings'])
]);

echo json_encode(['success' => true]);
```

---

## 6. Frontend Changes

### New Types (src/types/index.ts additions)

```typescript
// User types
export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  isAdmin: boolean
  isApproved: boolean
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}
```

### Auth Context (src/contexts/AuthContext.tsx)

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getCurrentUser, logout as logoutApi } from '@/services/api'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser()
      setUser(userData)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [])

  const login = () => {
    window.location.href = './api/auth/google-login.php'
  }

  const logout = async () => {
    await logoutApi()
    setUser(null)
    window.location.reload()
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user && user.isApproved,
      isAdmin: user?.isAdmin ?? false,
      login,
      logout,
      refreshUser
    }}>
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

### API Service Updates (src/services/api.ts additions)

```typescript
// Auth API
export async function getCurrentUser(): Promise<User> {
  const response = await fetchApi<ApiResponse<User>>('/auth/me.php')
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Not authenticated')
  }
  return response.data
}

export async function logout(): Promise<void> {
  await fetchApi<ApiResponse<void>>('/auth/logout.php', { method: 'POST' })
}
```

### Login Component (src/components/auth/LoginButton.tsx)

```typescript
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function LoginButton() {
  const { login } = useAuth()

  return (
    <Button onClick={login} variant="primary">
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* Google icon SVG */}
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </Button>
  )
}
```

### User Menu Component (src/components/auth/UserMenu.tsx)

```typescript
import { useState } from 'react'
import { LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

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
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b dark:border-gray-700">
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <button
            onClick={() => { logout(); setIsOpen(false) }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
```

### Updated App.tsx Header

```typescript
// In the header section, replace settings button with:
<div className="flex items-center gap-2">
  {isAuthenticated ? (
    <>
      {/* Existing edit/settings buttons */}
      <UserMenu />
    </>
  ) : (
    <LoginButton />
  )}
</div>
```

---

## 7. User Approval Flow

Since Portal is a personal dashboard, we want to control who can access it.

### Admin Panel Component

Create a simple admin panel for the first user (admin) to approve new users:

```typescript
// src/pages/AdminUsers.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PendingUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

export function AdminUsers() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<PendingUser[]>([])

  useEffect(() => {
    // Fetch pending users
    fetch('./api/admin/pending-users.php')
      .then(r => r.json())
      .then(data => setUsers(data.data || []))
  }, [])

  const approveUser = async (userId: string) => {
    await fetch('./api/admin/approve-user.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    setUsers(users.filter(u => u.id !== userId))
  }

  if (!isAdmin) return null

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Pending Users</h2>
      {users.length === 0 ? (
        <p className="text-gray-500">No pending approvals</p>
      ) : (
        <ul className="space-y-2">
          {users.map(user => (
            <li key={user.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {user.avatarUrl && <img src={user.avatarUrl} className="w-10 h-10 rounded-full" />}
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <Button onClick={() => approveUser(user.id)} variant="primary" size="sm">
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 8. Migration Checklist

### Phase 1: Database Setup
- [ ] Create MySQL database tables
- [ ] Test database connection from PHP

### Phase 2: Backend Auth
- [ ] Set up Google Cloud Console project
- [ ] Create OAuth credentials
- [ ] Implement `api/auth/` endpoints
- [ ] Implement `api/shared/` utilities
- [ ] Update settings endpoints to use auth

### Phase 3: Frontend Auth
- [ ] Create AuthContext
- [ ] Create LoginButton component
- [ ] Create UserMenu component
- [ ] Update App.tsx to use AuthProvider
- [ ] Update header with auth UI

### Phase 4: Data Migration
- [ ] Migrate existing settings to first admin user
- [ ] Test new user registration flow
- [ ] Test user approval flow

### Phase 5: Cleanup
- [ ] Remove PIN verification code
- [ ] Update CORS headers if needed
- [ ] Add auth-config.php to .gitignore
- [ ] Test on production

---

## 9. Security Considerations

1. **HTTPS Only**: All auth cookies use `secure: true`
2. **HttpOnly Cookies**: Session tokens not accessible via JavaScript
3. **SameSite**: Lax mode prevents CSRF for state-changing requests
4. **Token Expiry**: Sessions expire after 30 days
5. **Approval Required**: New users must be approved by admin
6. **Input Validation**: All inputs sanitized before database queries

---

## 10. Multi-App Authentication (Same Domain)

If you have multiple applications under `bennernet.com` (e.g., Portal, Helm, other tools), you can share authentication across them.

### Option A: Shared Auth Service (Recommended)

Create a centralized auth service that all apps use:

```
bennernet.com/
├── auth/                    # Shared auth service
│   ├── api/
│   │   ├── google-login.php
│   │   ├── google-callback.php
│   │   ├── logout.php
│   │   └── me.php
│   └── shared/
│       ├── database.php
│       └── auth.php
├── portal/                  # Portal app
├── helm/                    # Helm app (task planner)
└── other-app/               # Future apps
```

#### Benefits
- Single sign-on across all apps
- One Google Cloud project / OAuth credentials
- Centralized user management
- Users only need to be approved once

#### Implementation

**1. Shared Cookie Configuration**

Set cookies at the domain level so all apps can read them:

```php
// In auth/api/google-callback.php
setcookie('bennernet_session', $session['token'], [
    'expires' => time() + SESSION_DURATION,
    'path' => '/',                    // Root path - accessible to all apps
    'domain' => '.bennernet.com',     // Domain-wide cookie
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
]);
```

**2. Shared Database Tables**

All apps share the same user and session tables, with **per-app permissions**:

```sql
-- Shared across all apps
CREATE TABLE bennernet_users (
    id VARCHAR(36) PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE TABLE bennernet_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE
);

-- App permissions (controls which apps each user can access)
CREATE TABLE bennernet_app_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    app_name VARCHAR(50) NOT NULL,           -- 'portal', 'helm', etc.
    is_approved BOOLEAN DEFAULT FALSE,        -- Can access this app?
    role ENUM('viewer', 'member', 'admin') DEFAULT 'member',
    approved_by VARCHAR(36),                  -- Who approved them
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES bennernet_users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_app (user_id, app_name),
    INDEX idx_app_name (app_name),
    INDEX idx_user_approved (user_id, is_approved)
);

-- App-specific settings (each app has its own table)
CREATE TABLE portal_user_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    settings_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE
);

CREATE TABLE helm_user_settings (
    user_id VARCHAR(36) PRIMARY KEY,
    settings_json LONGTEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES bennernet_users(id) ON DELETE CASCADE
);
```

**3. Shared Auth Middleware with App-Specific Permissions**

Each app includes the same auth helper, with support for checking app-specific permissions:

```php
// auth/shared/auth.php - shared auth service
<?php

/**
 * Get current authenticated user from session cookie
 */
function getCurrentUser(): ?array {
    $token = $_COOKIE['bennernet_session'] ?? '';

    if (empty($token)) {
        return null;
    }

    $pdo = getSharedDatabase();

    $stmt = $pdo->prepare('
        SELECT u.* FROM bennernet_users u
        JOIN bennernet_sessions s ON s.user_id = u.id
        WHERE s.token = ?
          AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Get user's permission for a specific app
 * Returns: ['is_approved' => bool, 'role' => string] or null if no permission record
 */
function getAppPermission(string $userId, string $appName): ?array {
    $pdo = getSharedDatabase();

    $stmt = $pdo->prepare('
        SELECT is_approved, role, approved_at, approved_by
        FROM bennernet_app_permissions
        WHERE user_id = ? AND app_name = ?
    ');
    $stmt->execute([$userId, $appName]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Get all app permissions for a user
 * Returns array keyed by app_name
 */
function getAllAppPermissions(string $userId): array {
    $pdo = getSharedDatabase();

    $stmt = $pdo->prepare('
        SELECT app_name, is_approved, role, approved_at
        FROM bennernet_app_permissions
        WHERE user_id = ?
    ');
    $stmt->execute([$userId]);

    $permissions = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $permissions[$row['app_name']] = [
            'isApproved' => (bool)$row['is_approved'],
            'role' => $row['role'],
            'approvedAt' => $row['approved_at']
        ];
    }
    return $permissions;
}

/**
 * Check if user is approved for a specific app
 */
function isApprovedForApp(string $userId, string $appName): bool {
    $permission = getAppPermission($userId, $appName);
    return $permission && $permission['is_approved'];
}

/**
 * Require authentication and app-specific approval
 * Used by individual apps to enforce access control
 */
function requireAppAuth(string $appName): array {
    $user = getCurrentUser();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated']);
        exit;
    }

    // Global admins bypass app-specific approval
    if ($user['is_admin']) {
        return $user;
    }

    if (!isApprovedForApp($user['id'], $appName)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => "You don't have access to $appName. Request access from an admin."
        ]);
        exit;
    }

    return $user;
}

/**
 * Get user's role for a specific app ('viewer', 'member', 'admin')
 */
function getAppRole(string $userId, string $appName): ?string {
    $permission = getAppPermission($userId, $appName);
    return $permission ? $permission['role'] : null;
}

/**
 * Check if user is an admin for a specific app
 * Note: Global admins are always app admins
 */
function isAppAdmin(string $userId, string $appName): bool {
    $user = getCurrentUser();
    if ($user && $user['is_admin']) {
        return true; // Global admin
    }

    return getAppRole($userId, $appName) === 'admin';
}
```

**4. Google OAuth Redirect URIs**

Add all app callback URLs to Google Cloud Console:

```
Authorized redirect URIs:
- https://bennernet.com/auth/api/google-callback.php  (shared)
- http://localhost:5173/auth/api/google-callback.php  (dev)
```

**5. Login/Logout Redirects**

Each app redirects to the shared auth service:

```typescript
// In Portal's AuthContext
const login = () => {
  // Redirect to shared auth with return URL
  const returnUrl = encodeURIComponent(window.location.href)
  window.location.href = `/auth/api/google-login.php?return=${returnUrl}`
}
```

```php
// In auth/api/google-callback.php
$returnUrl = $_GET['return'] ?? '/portal/';
// ... after successful auth ...
header('Location: ' . $returnUrl);
```

#### Directory Structure for Shared Auth

```
bennernet.com/
├── auth/
│   ├── api/
│   │   ├── auth-config.php      # OAuth credentials
│   │   ├── google-login.php     # Initiates OAuth, accepts ?return= param
│   │   ├── google-callback.php  # Handles callback, redirects to return URL
│   │   ├── logout.php           # Clears session
│   │   └── me.php               # Returns current user
│   └── shared/
│       ├── database.php         # Shared DB connection
│       └── auth.php             # Auth helpers
│
├── portal/
│   ├── api/
│   │   ├── settings/            # Portal-specific settings
│   │   └── feeds/               # Portal-specific feeds
│   └── src/                     # Portal frontend
│
└── helm/
    ├── api/
    │   ├── projects/            # Helm-specific APIs
    │   └── tasks/
    └── src/                     # Helm frontend
```

### Option B: Per-App Auth (Simpler but Separate)

Each app has its own auth, but users must sign in to each separately.

#### When to Use
- Apps have completely different user bases
- Apps need different approval processes
- Simpler initial setup, no shared infrastructure

#### Implementation
- Each app has its own Google OAuth credentials
- Each app has its own users/sessions tables
- No single sign-on (user signs in to each app separately)

### Recommendation

For `bennernet.com` with Portal, Helm, and future apps:

**Use Option A (Shared Auth Service)** because:
1. Same user base (your family/household)
2. Single sign-on is more convenient
3. One approval process for new users
4. Easier to manage long-term
5. Single Google Cloud project

### Migration Path for Existing Apps

If Portal implements auth first, then Helm later:

1. **Phase 1**: Implement auth in Portal at `/portal/api/auth/`
2. **Phase 2**: When adding Helm auth, move auth to `/auth/`
3. **Phase 3**: Update Portal to use shared `/auth/` service
4. **Phase 4**: Update cookies from `portal_session` to `bennernet_session`

Or plan ahead:
1. **Start with shared**: Create `/auth/` service from the beginning
2. **Portal uses shared**: Portal calls `/auth/` for login/logout
3. **Helm uses shared**: Helm uses same `/auth/` service

---

## 11. Preview Mode (Unauthenticated Access)

Allow non-authenticated users to see a read-only preview of apps. This is useful for:
- Showing visitors what the app looks like before signing in
- Family members viewing shared dashboards without needing accounts
- Demonstrating app functionality

### Architecture Overview

Preview mode is built into the **shared auth service**, so all apps get it automatically.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication States                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Preview    │    │   Pending    │    │ Authenticated│       │
│  │   (Guest)    │───►│  Approval    │───►│    (User)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│        │                                        │                │
│        │                                        ▼                │
│        │                                 ┌──────────────┐       │
│        │                                 │    Admin     │       │
│        │                                 └──────────────┘       │
│        │                                                         │
│        ▼                                                         │
│  • Read-only view          • Full access to own dashboard       │
│  • Demo/default data       • Edit widgets, settings             │
│  • No sensitive info       • Admin: manage users, approvals     │
│  • "Sign in" prompt                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Preview Mode Options

Each app can configure how preview mode works:

#### Option A: Demo Dashboard (Recommended for Portal)
Show a demo dashboard with sample widgets. No real user data exposed.

```php
// In portal/api/settings/get.php
$user = getCurrentUser();

if (!$user) {
    // Return demo settings for preview mode
    echo json_encode([
        'success' => true,
        'data' => getDemoSettings(),
        'preview' => true  // Flag for frontend
    ]);
    exit;
}
```

#### Option B: Admin's Public Dashboard
Show the admin's dashboard in read-only mode (their actual data).

```php
// In portal/api/settings/get.php
$user = getCurrentUser();

if (!$user) {
    // Get admin's settings for preview
    $admin = getAdminUser();
    $settings = getUserSettings($admin['id']);

    echo json_encode([
        'success' => true,
        'data' => $settings,
        'preview' => true,
        'owner' => $admin['name']  // "Ben's Portal"
    ]);
    exit;
}
```

#### Option C: Configurable Public Profiles
Users can mark their dashboard as "public" for sharing.

```sql
-- Add to portal_user_settings
ALTER TABLE portal_user_settings
    ADD COLUMN is_public BOOLEAN DEFAULT FALSE,
    ADD COLUMN public_slug VARCHAR(50) UNIQUE;
```

```php
// Access via /portal/view/ben
$slug = $_GET['profile'] ?? null;
if ($slug) {
    $settings = getPublicProfileBySlug($slug);
    // Return read-only view
}
```

### Implementation

#### 1. Shared Auth Response Enhancement with App-Specific Permissions

The `/auth/api/me.php` endpoint returns user state including app-specific permissions:

```php
<?php
// auth/api/me.php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

// Optional: Check for specific app context
$appName = $_GET['app'] ?? null;

$user = getCurrentUser();

if (!$user) {
    // Not authenticated - return preview state
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

// Get all app permissions for this user
$appPermissions = getAllAppPermissions($user['id']);

// Determine approval status for requested app (if specified)
$isApprovedForRequestedApp = true;
$appRole = null;
if ($appName) {
    $isApprovedForRequestedApp = $user['is_admin'] ||
        (isset($appPermissions[$appName]) && $appPermissions[$appName]['isApproved']);
    $appRole = $user['is_admin'] ? 'admin' : ($appPermissions[$appName]['role'] ?? null);
}

// Global admins are always approved for everything
$hasAnyApproval = $user['is_admin'] ||
    count(array_filter($appPermissions, fn($p) => $p['isApproved'])) > 0;

// Determine preview mode based on app context
$isPreview = $appName ? !$isApprovedForRequestedApp : !$hasAnyApproval;

// Build response
$response = [
    'success' => true,
    'data' => [
        'authenticated' => true,
        'preview' => $isPreview,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'avatarUrl' => $user['avatar_url'],
            'isGlobalAdmin' => (bool)$user['is_admin']
        ],
        // All app permissions for this user
        'apps' => $appPermissions
    ]
];

// Add app-specific context if requested
if ($appName) {
    $response['data']['currentApp'] = [
        'name' => $appName,
        'isApproved' => $isApprovedForRequestedApp,
        'role' => $appRole,
        'message' => $isApprovedForRequestedApp
            ? null
            : "You don't have access to $appName yet. Request access from an admin."
    ];
}

// Add pending message if no approvals at all
if (!$hasAnyApproval && !$user['is_admin']) {
    $response['data']['message'] = 'Your account is pending approval for all apps';
}

echo json_encode($response);
```

**Example Response (authenticated, app-specific context):**

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "preview": false,
    "user": {
      "id": "abc-123",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://...",
      "isGlobalAdmin": false
    },
    "apps": {
      "portal": { "isApproved": true, "role": "member", "approvedAt": "2024-12-15" },
      "helm": { "isApproved": false, "role": null, "approvedAt": null }
    },
    "currentApp": {
      "name": "portal",
      "isApproved": true,
      "role": "member",
      "message": null
    }
  }
}
```

**Example Response (authenticated, no portal access):**

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "preview": true,
    "user": {
      "id": "abc-123",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatarUrl": "https://...",
      "isGlobalAdmin": false
    },
    "apps": {
      "helm": { "isApproved": true, "role": "member", "approvedAt": "2024-12-14" }
    },
    "currentApp": {
      "name": "portal",
      "isApproved": false,
      "role": null,
      "message": "You don't have access to portal yet. Request access from an admin."
    }
  }
}
```

#### 2. Frontend Auth Context with App-Specific Permissions

Each app uses the same auth context pattern, enhanced for per-app permissions:

```typescript
// Shared auth types (can be in a shared package or duplicated per app)
export interface AppPermission {
  isApproved: boolean
  role: 'viewer' | 'member' | 'admin' | null
  approvedAt: string | null
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isGlobalAdmin: boolean
}

export interface CurrentApp {
  name: string
  isApproved: boolean
  role: 'viewer' | 'member' | 'admin' | null
  message: string | null
}

export interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  isPreview: boolean
  user: User | null
  apps: Record<string, AppPermission>  // All app permissions
  currentApp: CurrentApp | null         // This app's specific permission
  message?: string
}

// Each app configures its app name
const APP_NAME = 'portal' // or 'helm', etc.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isPreview: true,
    user: null,
    apps: {},
    currentApp: null
  })

  useEffect(() => {
    // Request with app context to get app-specific approval
    fetch(`/auth/api/me.php?app=${APP_NAME}`)
      .then(r => r.json())
      .then(response => {
        const data = response.data
        setAuth({
          isLoading: false,
          isAuthenticated: data.authenticated ?? false,
          isPreview: data.preview ?? true,
          user: data.user ?? null,
          apps: data.apps ?? {},
          currentApp: data.currentApp ?? null,
          message: data.message
        })
      })
      .catch(() => {
        setAuth(prev => ({ ...prev, isLoading: false, isPreview: true }))
      })
  }, [])

  const login = () => {
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `/auth/api/google-login.php?return=${returnUrl}`
  }

  const logout = async () => {
    await fetch('/auth/api/logout.php', { method: 'POST' })
    window.location.reload()
  }

  // Derived state for convenience
  const isApproved = auth.currentApp?.isApproved ?? false
  const isAppAdmin = auth.user?.isGlobalAdmin || auth.currentApp?.role === 'admin'
  const canEdit = isApproved && auth.currentApp?.role !== 'viewer'

  return (
    <AuthContext.Provider value={{
      ...auth,
      isApproved,
      isAppAdmin,
      canEdit,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Usage in components
function Dashboard() {
  const { isPreview, canEdit, currentApp } = useAuth()

  if (isPreview) {
    return <DemoDashboard />
  }

  return (
    <div>
      {canEdit && <EditButton />}
      {currentApp?.role === 'viewer' && (
        <p className="text-gray-500">View-only access</p>
      )}
      <WidgetGrid />
    </div>
  )
}
```

#### 3. Preview Mode UI Components

Shared components for preview mode banner:

```typescript
// components/auth/PreviewBanner.tsx
import { useAuth } from '@/contexts/AuthContext'

export function PreviewBanner() {
  const { isPreview, isAuthenticated, isApproved, message, login } = useAuth()

  if (!isPreview) return null

  // Pending approval state
  if (isAuthenticated && !isApproved) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⏳ {message || 'Your account is pending approval'}
          </span>
        </div>
      </div>
    )
  }

  // Guest preview state
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-blue-800 dark:text-blue-200 text-sm">
          👁️ Preview Mode — View only
        </span>
        <button
          onClick={login}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Sign in with Google to customize →
        </button>
      </div>
    </div>
  )
}
```

#### 4. Conditional UI Based on Auth State

Apps hide edit controls in preview mode:

```typescript
// In Portal's App.tsx
function App() {
  const { isPreview, isAdmin } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <PreviewBanner />

      <header className="...">
        <h1>Portal</h1>
        <div className="flex items-center gap-2">
          {/* Only show edit controls if not in preview mode */}
          {!isPreview && (
            <>
              <Button onClick={handleEdit}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
              <Button onClick={() => setPage('settings')}>
                <Settings className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* User menu or login button */}
          {isPreview ? <LoginButton /> : <UserMenu />}
        </div>
      </header>

      {/* Dashboard is always visible, just read-only in preview */}
      <Dashboard readOnly={isPreview} />
    </div>
  )
}
```

#### 5. App-Specific Preview Configuration

Each app defines its preview behavior in config:

```php
// portal/api/config/preview.php
<?php
return [
    'enabled' => true,
    'mode' => 'demo',  // 'demo' | 'admin' | 'public_profiles'
    'demo_settings' => [
        'dashboardLayout' => [
            'widgets' => [
                [
                    'id' => 'demo-weather',
                    'type' => 'weather',
                    'settings' => [
                        'location' => 'New York',
                        'units' => 'imperial',
                        'showForecast' => true
                    ]
                ],
                [
                    'id' => 'demo-news',
                    'type' => 'news',
                    'settings' => [
                        'feedUrl' => 'https://feeds.bbci.co.uk/news/rss.xml',
                        'feedName' => 'BBC News',
                        'maxItems' => 5
                    ]
                ]
            ]
        ],
        'theme' => 'light'
    ]
];
```

```php
// helm/api/config/preview.php
<?php
return [
    'enabled' => true,
    'mode' => 'demo',
    'demo_data' => [
        'projects' => [
            ['id' => 'demo-1', 'name' => 'Sample Project', 'color' => '#3B82F6'],
        ],
        'tasks' => [
            ['id' => 'task-1', 'title' => 'Example task', 'status' => 'todo', 'projectId' => 'demo-1'],
            ['id' => 'task-2', 'title' => 'Another task', 'status' => 'in_progress', 'projectId' => 'demo-1'],
        ]
    ]
];
```

### Security Considerations for Preview Mode

1. **No Sensitive Data**: Demo mode should never expose real user data
2. **Rate Limiting**: Prevent abuse of preview mode endpoints
3. **Read-Only Enforcement**: Backend must enforce read-only for preview users
4. **Calendar/Private Data**: Never show real calendar events or private feeds in demo mode

```php
// Example: Enforce read-only on save endpoint
// portal/api/settings/save.php

$user = getCurrentUser();

if (!$user || !$user['is_approved']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Sign in required to save changes']);
    exit;
}

// ... proceed with save
```

### Preview Mode at Domain Level

For a cohesive experience across bennernet.com:

```
bennernet.com/
├── index.html          # Landing page with links to all apps
│                       # Shows preview of each app
│
├── auth/               # Shared auth service
│   └── api/
│
├── portal/             # Portal app (preview: demo dashboard)
├── helm/               # Helm app (preview: sample projects)
└── [future-app]/       # Future apps follow same pattern
```

Landing page could show:
- App cards with screenshots
- "Preview" and "Sign in" buttons for each
- Unified sign-in that returns to the app they clicked

---

## 12. Admin Panel for Per-App Permissions

The admin panel allows global admins to manage which users have access to which apps, with granular role control.

### Admin API Endpoints

#### GET /auth/api/admin/users.php

Returns all users with their app permissions:

```php
<?php
// auth/api/admin/users.php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');

// Require global admin
$admin = getCurrentUser();
if (!$admin || !$admin['is_admin']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

$pdo = getSharedDatabase();

// Get all users with their permissions
$stmt = $pdo->query('
    SELECT
        u.id, u.email, u.name, u.avatar_url, u.is_admin, u.created_at, u.last_login_at,
        GROUP_CONCAT(
            CONCAT(ap.app_name, ":", ap.is_approved, ":", IFNULL(ap.role, ""))
            SEPARATOR "|"
        ) as permissions
    FROM bennernet_users u
    LEFT JOIN bennernet_app_permissions ap ON ap.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
');

$users = [];
while ($row = $stmt->fetch()) {
    $user = [
        'id' => $row['id'],
        'email' => $row['email'],
        'name' => $row['name'],
        'avatarUrl' => $row['avatar_url'],
        'isAdmin' => (bool)$row['is_admin'],
        'createdAt' => $row['created_at'],
        'lastLoginAt' => $row['last_login_at'],
        'apps' => []
    ];

    // Parse permissions
    if ($row['permissions']) {
        foreach (explode('|', $row['permissions']) as $perm) {
            list($app, $approved, $role) = explode(':', $perm);
            $user['apps'][$app] = [
                'isApproved' => (bool)$approved,
                'role' => $role ?: null
            ];
        }
    }

    $users[] = $user;
}

echo json_encode(['success' => true, 'data' => $users]);
```

#### POST /auth/api/admin/set-permission.php

Set or update a user's permission for a specific app:

```php
<?php
// auth/api/admin/set-permission.php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');

$admin = getCurrentUser();
if (!$admin || !$admin['is_admin']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['userId'] ?? '';
$appName = $input['appName'] ?? '';
$isApproved = $input['isApproved'] ?? false;
$role = $input['role'] ?? 'member';

if (empty($userId) || empty($appName)) {
    echo json_encode(['success' => false, 'error' => 'userId and appName required']);
    exit;
}

// Validate role
if (!in_array($role, ['viewer', 'member', 'admin'])) {
    $role = 'member';
}

$pdo = getSharedDatabase();

// Upsert permission
$stmt = $pdo->prepare('
    INSERT INTO bennernet_app_permissions
        (id, user_id, app_name, is_approved, role, approved_by, approved_at)
    VALUES
        (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
        is_approved = VALUES(is_approved),
        role = VALUES(role),
        approved_by = VALUES(approved_by),
        approved_at = IF(VALUES(is_approved) AND NOT is_approved, NOW(), approved_at)
');

$stmt->execute([
    generateUUID(),
    $userId,
    $appName,
    $isApproved ? 1 : 0,
    $role,
    $admin['id']
]);

echo json_encode(['success' => true]);
```

#### DELETE /auth/api/admin/remove-permission.php

Remove a user's permission for an app:

```php
<?php
// auth/api/admin/remove-permission.php
require_once __DIR__ . '/../shared/database.php';
require_once __DIR__ . '/../shared/auth.php';

header('Content-Type: application/json');

$admin = getCurrentUser();
if (!$admin || !$admin['is_admin']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$userId = $input['userId'] ?? '';
$appName = $input['appName'] ?? '';

if (empty($userId) || empty($appName)) {
    echo json_encode(['success' => false, 'error' => 'userId and appName required']);
    exit;
}

$pdo = getSharedDatabase();
$stmt = $pdo->prepare('DELETE FROM bennernet_app_permissions WHERE user_id = ? AND app_name = ?');
$stmt->execute([$userId, $appName]);

echo json_encode(['success' => true]);
```

### Admin Panel UI Component

```typescript
// auth/admin/UserPermissions.tsx
import { useState, useEffect } from 'react'
import { Check, X, Shield, Eye, User as UserIcon } from 'lucide-react'

// Available apps in the system
const APPS = [
  { name: 'portal', label: 'Portal', description: 'Dashboard widgets' },
  { name: 'helm', label: 'Helm', description: 'Task planner' },
  // Add future apps here
]

const ROLES = [
  { value: 'viewer', label: 'Viewer', icon: Eye, description: 'Read-only access' },
  { value: 'member', label: 'Member', icon: UserIcon, description: 'Full access' },
  { value: 'admin', label: 'Admin', icon: Shield, description: 'Manage app settings' }
]

interface AppPermission {
  isApproved: boolean
  role: 'viewer' | 'member' | 'admin' | null
}

interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  isAdmin: boolean
  createdAt: string
  lastLoginAt: string | null
  apps: Record<string, AppPermission>
}

export function UserPermissions() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/auth/api/admin/users.php')
      .then(r => r.json())
      .then(data => {
        setUsers(data.data || [])
        setLoading(false)
      })
  }, [])

  const setPermission = async (
    userId: string,
    appName: string,
    isApproved: boolean,
    role: string
  ) => {
    setSaving(`${userId}-${appName}`)

    await fetch('/auth/api/admin/set-permission.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, appName, isApproved, role })
    })

    // Update local state
    setUsers(users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          apps: {
            ...u.apps,
            [appName]: { isApproved, role: role as any }
          }
        }
      }
      return u
    }))

    setSaving(null)
  }

  const removePermission = async (userId: string, appName: string) => {
    setSaving(`${userId}-${appName}`)

    await fetch('/auth/api/admin/remove-permission.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, appName })
    })

    // Update local state
    setUsers(users.map(u => {
      if (u.id === userId) {
        const { [appName]: removed, ...rest } = u.apps
        return { ...u, apps: rest }
      }
      return u
    }))

    setSaving(null)
  }

  if (loading) {
    return <div className="p-8 text-center">Loading users...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Permissions</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              {APPS.map(app => (
                <th key={app.name} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div>{app.label}</div>
                  <div className="text-gray-400 font-normal normal-case">{app.description}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(user => (
              <tr key={user.id}>
                {/* User info */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                        {user.isAdmin && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                            Global Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>

                {/* App permissions */}
                {APPS.map(app => {
                  const permission = user.apps[app.name]
                  const isSaving = saving === `${user.id}-${app.name}`

                  // Global admins have access to everything
                  if (user.isAdmin) {
                    return (
                      <td key={app.name} className="px-6 py-4 text-center">
                        <span className="text-purple-600 dark:text-purple-400 text-sm">
                          Full Access (Admin)
                        </span>
                      </td>
                    )
                  }

                  return (
                    <td key={app.name} className="px-6 py-4">
                      <div className="flex flex-col items-center gap-2">
                        {/* Approval toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permission?.isApproved ?? false}
                            onChange={e => setPermission(
                              user.id,
                              app.name,
                              e.target.checked,
                              permission?.role || 'member'
                            )}
                            disabled={isSaving}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {permission?.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </label>

                        {/* Role selector (only shown if approved) */}
                        {permission?.isApproved && (
                          <select
                            value={permission.role || 'member'}
                            onChange={e => setPermission(
                              user.id,
                              app.name,
                              true,
                              e.target.value
                            )}
                            disabled={isSaving}
                            className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-700"
                          >
                            {ROLES.map(role => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium mb-2">Role Descriptions</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {ROLES.map(role => (
            <div key={role.value} className="flex items-center gap-2">
              <role.icon className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{role.label}:</span>
              <span className="text-gray-500">{role.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Routing for Admin Panel

The admin panel lives at `/auth/admin/` and is accessible to global admins:

```typescript
// auth/admin/App.tsx
import { useAuth } from '@/contexts/AuthContext'
import { UserPermissions } from './UserPermissions'

export function AdminApp() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user?.isGlobalAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 mt-2">Global admin access required</p>
      </div>
    )
  }

  return <UserPermissions />
}
```

### Workflow Summary

1. **New User Signs In**: User authenticates with Google, account created in `bennernet_users`
2. **No App Access Yet**: User has no entries in `bennernet_app_permissions`, sees preview mode in all apps
3. **Admin Grants Access**: Admin visits `/auth/admin/`, checks "Approved" for Portal, selects "Member" role
4. **User Gets Portal Access**: User can now use Portal fully, but still sees preview mode in Helm
5. **Admin Can Revoke**: Admin unchecks "Approved" or removes permission entirely
6. **Roles Control Features**:
   - `viewer`: Read-only, cannot edit widgets/settings
   - `member`: Full access to their own data
   - `admin`: Can manage app-specific settings (not user permissions)

---

## 13. Estimated Effort

| Component | Files | Effort |
|-----------|-------|--------|
| Database setup (with app permissions) | 1 SQL file | Low |
| Shared auth service (PHP) | 5 files | Medium |
| Shared utilities + app permissions | 3 files | Medium |
| Update settings API (per-app) | 2 files | Low |
| AuthContext (with app permissions) | 1 file | Medium |
| Auth components | 3 files | Medium |
| Admin panel (per-app permissions) | 3 files | Medium |
| App.tsx updates | 1 file | Low |
| Testing | - | Medium |

**Total estimated effort: 3-4 days** (increased slightly for per-app permission granularity)

---

*Document Version: 1.0*
*Created: December 2024*
*Status: Future Planning*
