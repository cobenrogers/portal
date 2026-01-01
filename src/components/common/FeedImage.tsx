import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getProxiedImageUrl } from '@/services/api'
import type { ImgHTMLAttributes, ReactNode } from 'react'

interface FeedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined
  fallbackElement?: ReactNode
}

export function FeedImage({
  src,
  alt = '',
  className,
  fallbackElement,
  ...props
}: FeedImageProps) {
  const [hasError, setHasError] = useState(false)

  // If no src provided or error occurred, show fallback
  if (!src || hasError) {
    return <>{fallbackElement}</>
  }

  const proxiedUrl = getProxiedImageUrl(src)

  return (
    <img
      src={proxiedUrl}
      alt={alt}
      className={cn(className)}
      loading="lazy"
      onError={() => setHasError(true)}
      {...props}
    />
  )
}
