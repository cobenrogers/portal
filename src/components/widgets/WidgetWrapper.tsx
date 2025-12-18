import { Settings, RefreshCw, GripVertical } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface WidgetWrapperProps {
  title: string
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onSettings?: () => void
  children: React.ReactNode
  className?: string
}

export function WidgetWrapper({
  title,
  isLoading,
  error,
  onRefresh,
  onSettings,
  children,
  className,
}: WidgetWrapperProps) {
  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onRefresh()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={isLoading}
              className="p-1.5 hover:bg-gray-200 relative z-10"
            >
              <RefreshCw className={cn('w-4 h-4 pointer-events-none', isLoading && 'animate-spin')} />
            </Button>
          )}
          {onSettings && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onSettings()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-gray-200 relative z-10"
            >
              <Settings className="w-4 h-4 pointer-events-none" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-3">
        {error ? (
          <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
            {error}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
