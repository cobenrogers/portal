import { useMemo, useCallback, useState, useEffect } from 'react'
import { NewsWidget, WeatherWidget, CalendarWidget, StockWidget, LotteryWidget, DailyWidget, HistoryWidget, TriviaWidget } from './widgets'
import { cn } from '@/lib/utils'
import type {
  WidgetConfig,
  DashboardLayout,
  NewsWidgetSettings,
  WeatherWidgetSettings,
  CalendarWidgetSettings,
  StockWidgetSettings,
  LotteryWidgetSettings,
  DailyWidgetSettings,
} from '@/types'

interface DashboardProps {
  layout: DashboardLayout
}

export function Dashboard({ layout }: DashboardProps) {
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

  // Sort widgets by their order property for consistent display across all screen sizes
  const sortedWidgets = useMemo(() => {
    return [...layout.widgets]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [layout.widgets])

  const renderWidget = useCallback((widget: WidgetConfig) => {
    switch (widget.type) {
      case 'news':
        return <NewsWidget settings={widget.settings as NewsWidgetSettings} />
      case 'weather':
        return <WeatherWidget settings={widget.settings as WeatherWidgetSettings} />
      case 'calendar':
        return <CalendarWidget settings={widget.settings as CalendarWidgetSettings} />
      case 'stocks':
        return <StockWidget settings={widget.settings as StockWidgetSettings} />
      case 'lottery':
        return <LotteryWidget settings={widget.settings as LotteryWidgetSettings} />
      case 'daily':
        return <DailyWidget settings={widget.settings as DailyWidgetSettings} />
      case 'history':
        return <HistoryWidget />
      case 'trivia':
        return <TriviaWidget />
      default:
        return <div className="p-4">Unknown widget type</div>
    }
  }, [])

  // Calculate grid columns based on breakpoint
  const gridCols = breakpoint === 'lg' ? 3 : breakpoint === 'md' ? 2 : 1

  return (
    <div
      className={cn(
        'grid gap-4',
        gridCols === 3 && 'grid-cols-3',
        gridCols === 2 && 'grid-cols-2',
        gridCols === 1 && 'grid-cols-1'
      )}
    >
      {sortedWidgets.map((widget) => (
        <div
          key={widget.id}
          className="min-h-[150px] max-h-[300px]"
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  )
}
