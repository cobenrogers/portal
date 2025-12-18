import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WidgetWrapper } from './WidgetWrapper'

describe('WidgetWrapper', () => {
  it('renders title', () => {
    render(<WidgetWrapper title="Test Widget">Content</WidgetWrapper>)
    expect(screen.getByText('Test Widget')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<WidgetWrapper title="Test">Widget Content</WidgetWrapper>)
    expect(screen.getByText('Widget Content')).toBeInTheDocument()
  })

  it('shows error message when error prop is set', () => {
    render(
      <WidgetWrapper title="Test" error="Failed to load">
        Content
      </WidgetWrapper>
    )
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('shows refresh button when onRefresh is provided', () => {
    const onRefresh = vi.fn()
    render(
      <WidgetWrapper title="Test" onRefresh={onRefresh}>
        Content
      </WidgetWrapper>
    )

    const refreshButton = screen.getAllByRole('button')[0]
    fireEvent.click(refreshButton)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('disables refresh button when loading', () => {
    const onRefresh = vi.fn()
    render(
      <WidgetWrapper title="Test" onRefresh={onRefresh} isLoading>
        Content
      </WidgetWrapper>
    )

    const refreshButton = screen.getAllByRole('button')[0]
    expect(refreshButton).toBeDisabled()
  })

  it('shows settings button when onSettings is provided', () => {
    const onSettings = vi.fn()
    render(
      <WidgetWrapper title="Test" onSettings={onSettings}>
        Content
      </WidgetWrapper>
    )

    const buttons = screen.getAllByRole('button')
    const settingsButton = buttons[buttons.length - 1]
    fireEvent.click(settingsButton)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    const { container } = render(
      <WidgetWrapper title="Test" className="custom-class">
        Content
      </WidgetWrapper>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
