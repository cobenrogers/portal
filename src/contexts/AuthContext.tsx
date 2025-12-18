import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthState, AuthContextValue, MeResponse } from '@/types/auth'

const AuthContext = createContext<AuthContextValue | null>(null)

// API base for auth endpoints - always use /auth path
const AUTH_API = import.meta.env.DEV ? '/auth/api' : '/auth/api'

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  isPreview: true,
  isApproved: false,
  user: null,
  message: null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(initialState)

  useEffect(() => {
    // Fetch current user state on mount
    fetch(`${AUTH_API}/me.php`, {
      credentials: 'include' // Include cookies for session
    })
      .then(r => r.json())
      .then((response: MeResponse) => {
        if (response.success) {
          const data = response.data
          setAuth({
            isLoading: false,
            isAuthenticated: data.authenticated,
            isPreview: data.preview,
            isApproved: data.user?.isApproved ?? false,
            user: data.user,
            message: data.message
          })
        } else {
          // API error - default to preview mode
          setAuth({
            ...initialState,
            isLoading: false
          })
        }
      })
      .catch(() => {
        // Network error - default to preview mode
        setAuth({
          ...initialState,
          isLoading: false
        })
      })
  }, [])

  const login = () => {
    // Redirect to Google OAuth, returning to current page
    const returnUrl = encodeURIComponent(window.location.href)
    window.location.href = `${AUTH_API}/google-login.php?return=${returnUrl}`
  }

  const logout = async () => {
    try {
      await fetch(`${AUTH_API}/logout.php`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch {
      // Ignore errors - we'll reload anyway
    }

    // Reload page to reset state
    window.location.reload()
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
