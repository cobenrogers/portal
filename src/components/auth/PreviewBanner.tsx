import { useAuth } from '@/contexts/AuthContext'
import { Eye } from 'lucide-react'

export function PreviewBanner() {
  const { isPreview, isAuthenticated, message } = useAuth()

  // Don't show banner if not in preview mode
  if (!isPreview) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            {isAuthenticated
              ? message || 'Your account is pending approval'
              : 'Preview Mode - Sign in to customize your dashboard'}
          </span>
        </div>
      </div>
    </div>
  )
}
