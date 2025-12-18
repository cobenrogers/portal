/**
 * Authentication Types
 */

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
  isPreview: boolean
  isApproved: boolean
  user: User | null
  message: string | null
}

export interface AuthContextValue extends AuthState {
  login: () => void
  logout: () => Promise<void>
}

export interface MeResponse {
  success: boolean
  data: {
    authenticated: boolean
    preview: boolean
    user: User | null
    message: string | null
  }
}
