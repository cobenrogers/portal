import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { NewsWidget, WeatherWidget, CalendarWidget } from './widgets'
import { cn } from '@/lib/utils'
import type {
  WidgetConfig,
  DashboardLayout,
  NewsWidgetSettings,
  WeatherWidgetSettings,
  CalendarWidgetSettings,
} from '@/types'

interface DashboardProps {
  layout: DashboardLayout
  onLayoutChange?: (layouts: DashboardLayout['layouts']) => void
  onWidgetSettings?: (widgetId: string) => void
  isEditing?: boolean
}

export function Dashboard({
  layout,
  onLayoutChange,
  onWidgetSettings,
  isEditing = false,
}: DashboardProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get current breakpoint based on window width
  const [breakpoint, setBreakpoint] = useState<'lg' | 'md' | 'sm'>('lg')

  useEffect(() => {
    function updateBreakpoint() {
      const width = window.innerWidth
      if (width >= 1200) setBreakpoint('lg')
      else if (width >= 768) setBreakpoint('md')
      else setBreakpoint('sm')
    }
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  const currentLayout = layout.layouts[breakpoint]

  // Sort widgets by position (y first, then x)
  const sortedWidgets = useMemo(() => {
    const widgetMap = new Map(layout.widgets.map((w) => [w.id, w]))
    return [...currentLayout]
      .sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y
        return a.x - b.x
      })
      .map((l) => ({ layout: l, widget: widgetMap.get(l.i)! }))
      .filter((item) => item.widget)
  }, [currentLayout, layout.widgets])

  const handleDragStart = useCallback((e: React.DragEvent, widgetId: string) => {
    if (!isEditing) return
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = 'move'
  }, [isEditing])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!isEditing || !draggedWidget) return
    e.preventDefault()
    setDropTarget(index)
  }, [isEditing, draggedWidget])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!draggedWidget || !onLayoutChange) return

    const sourceIndex = sortedWidgets.findIndex((w) => w.widget.id === draggedWidget)
    if (sourceIndex === targetIndex) return

    // Reorder the layouts
    const newLayout = [...currentLayout]
    const [moved] = newLayout.splice(sourceIndex, 1)
    newLayout.splice(targetIndex, 0, moved)

    // Update y positions to reflect new order
    const updatedLayout = newLayout.map((item, idx) => ({
      ...item,
      y: Math.floor(idx / 2),
      x: (idx % 2) * 4,
    }))

    onLayoutChange({
      ...layout.layouts,
      [breakpoint]: updatedLayout,
    })

    setDraggedWidget(null)
    setDropTarget(null)
  }, [draggedWidget, sortedWidgets, currentLayout, onLayoutChange, layout.layouts, breakpoint])

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null)
    setDropTarget(null)
  }, [])

  const renderWidget = useCallback(
    (widget: WidgetConfig) => {
      const handleSettings = onWidgetSettings
        ? () => onWidgetSettings(widget.id)
        : undefined

      switch (widget.type) {
        case 'news':
          return (
            <NewsWidget
              settings={widget.settings as NewsWidgetSettings}
              onSettingsClick={handleSettings}
            />
          )
        case 'weather':
          return (
            <WeatherWidget
              settings={widget.settings as WeatherWidgetSettings}
              onSettingsClick={handleSettings}
            />
          )
        case 'calendar':
          return (
            <CalendarWidget
              settings={widget.settings as CalendarWidgetSettings}
              onSettingsClick={handleSettings}
            />
          )
        default:
          return <div className="p-4">Unknown widget type</div>
      }
    },
    [onWidgetSettings]
  )

  // Calculate grid columns based on breakpoint
  const gridCols = breakpoint === 'lg' ? 3 : breakpoint === 'md' ? 2 : 1

  return (
    <div
      ref={containerRef}
      className={cn(
        'grid gap-4',
        gridCols === 3 && 'grid-cols-3',
        gridCols === 2 && 'grid-cols-2',
        gridCols === 1 && 'grid-cols-1'
      )}
    >
      {sortedWidgets.map(({ widget }, index) => (
        <div
          key={widget.id}
          className={cn(
            'min-h-[150px] max-h-[300px] transition-all duration-200',
            isEditing && 'cursor-move',
            draggedWidget === widget.id && 'opacity-50',
            dropTarget === index && draggedWidget !== widget.id && 'ring-2 ring-blue-500 ring-offset-2'
          )}
          style={{
            // All widgets same width - no spanning
          }}
          draggable={isEditing}
          onDragStart={(e) => handleDragStart(e, widget.id)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  )
}
