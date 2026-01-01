import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedImage } from './FeedImage'

// Mock the getProxiedImageUrl function
vi.mock('@/services/api', () => ({
  getProxiedImageUrl: vi.fn((url: string) => `https://proxy.example.com?url=${encodeURIComponent(url)}`)
}))

describe('FeedImage', () => {
  it('renders image with proxied src', () => {
    render(<FeedImage src="https://example.com/image.jpg" alt="Test image" />)

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://proxy.example.com?url=https%3A%2F%2Fexample.com%2Fimage.jpg')
  })

  it('renders with alt text', () => {
    render(<FeedImage src="https://example.com/image.jpg" alt="Test image" />)

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test image')
  })

  it('renders with empty alt by default', () => {
    const { container } = render(<FeedImage src="https://example.com/image.jpg" />)

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
  })

  it('renders fallback when src is null', () => {
    render(
      <FeedImage
        src={null}
        fallbackElement={<div data-testid="fallback">No image</div>}
      />
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })

  it('renders fallback when src is undefined', () => {
    render(
      <FeedImage
        src={undefined}
        fallbackElement={<div data-testid="fallback">No image</div>}
      />
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })

  it('renders nothing when src is null and no fallback provided', () => {
    const { container } = render(<FeedImage src={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders fallback on image error', () => {
    const { container } = render(
      <FeedImage
        src="https://example.com/broken.jpg"
        fallbackElement={<div data-testid="fallback">Error loading image</div>}
      />
    )

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    fireEvent.error(img!)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })

  it('applies className to the image', () => {
    const { container } = render(
      <FeedImage
        src="https://example.com/image.jpg"
        className="rounded-lg w-full"
      />
    )

    const img = container.querySelector('img')
    expect(img).toHaveClass('rounded-lg')
    expect(img).toHaveClass('w-full')
  })

  it('uses lazy loading by default', () => {
    const { container } = render(<FeedImage src="https://example.com/image.jpg" />)

    const img = container.querySelector('img')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('passes additional props to the image element', () => {
    render(
      <FeedImage
        src="https://example.com/image.jpg"
        width={200}
        height={100}
        data-testid="custom-image"
      />
    )

    const img = screen.getByTestId('custom-image')
    expect(img).toHaveAttribute('width', '200')
    expect(img).toHaveAttribute('height', '100')
  })

  it('renders nothing on error with no fallback', () => {
    const { container } = render(<FeedImage src="https://example.com/broken.jpg" />)

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    fireEvent.error(img!)

    expect(container).toBeEmptyDOMElement()
  })
})
