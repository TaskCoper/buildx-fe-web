'use client'

import Image, { type ImageLoaderProps } from 'next/image'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface PhotoProps {
  /** Local path under `/public` or a remote URL allowed in `next.config.ts`. */
  src: string
  alt: string
  className?: string
  /** Responsive size hint passed to next/image. */
  sizes?: string
  /** Render above the fold (hero) — skips lazy loading. */
  priority?: boolean
  loader?: (props: ImageLoaderProps) => string
  quality?: number
  unoptimized?: boolean
  /** Opt-in skeleton covering the image until it loads or fails. */
  skeletonClassName?: string
  /**
   * `cover` (mặc định) — ảnh lấp đầy khung, cắt phần thừa.
   * `contain` — ảnh hiện TRỌN trong khung, chừa nền hai bên. Dùng cho bản vẽ mặt
   * bằng: đó là tài liệu kỹ thuật, cắt mất một dải là mất luôn thông tin.
   */
  fit?: 'cover' | 'contain'
  /** Optional image-only class, leaving the wrapper geometry untouched. */
  imageClassName?: string
  /** Fires when the underlying next/image element has loaded. */
  onLoad?: () => void
  onError?: () => void
}

/**
 * A real photo filling its container.
 *
 * Replaces the old blueprint-grid placeholder: every call site now points at an
 * image chosen to match its subject (see `shared/lib/imagery.ts`). The wrapper
 * owns the aspect ratio; the image covers it.
 */
export function Photo(props: PhotoProps) {
  // A new source or fallback starts a fresh loading state, including A → B → A.
  return <PhotoFrame key={`${props.src}|${Boolean(props.unoptimized)}|${props.quality ?? 75}`} {...props} />
}

function PhotoFrame({
  src,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, 400px',
  priority,
  loader,
  quality,
  unoptimized,
  skeletonClassName,
  fit = 'cover',
  imageClassName,
  onLoad,
  onError
}: PhotoProps) {
  const [settled, setSettled] = useState(false)
  const loading = Boolean(skeletonClassName) && !settled

  function handleLoad() {
    if (skeletonClassName) setSettled(true)
    onLoad?.()
  }

  function handleError() {
    if (skeletonClassName) setSettled(true)
    onError?.()
  }

  return (
    <div
      className={cn('bg-muted relative overflow-hidden', className)}
      aria-busy={skeletonClassName ? loading : undefined}
      data-photo-loading={skeletonClassName ? loading : undefined}
    >
      {loading ? (
        <Skeleton
          data-photo-skeleton
          aria-hidden='true'
          style={{ position: 'absolute', inset: 0 }}
          className={cn('pointer-events-none z-10 rounded-[inherit]', skeletonClassName)}
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loader={loader}
        quality={quality}
        unoptimized={unoptimized}
        onLoad={handleLoad}
        onError={handleError}
        // Ảnh tải xong TRƯỚC khi React gắn `onLoad` (cache, hydrate chậm) thì sự kiện không bắn nữa.
        ref={(img) => {
          if (!img?.complete || !img.currentSrc) return
          if (img.naturalWidth > 0) handleLoad()
          else handleError()
        }}
        className={cn(fit === 'contain' ? 'object-contain' : 'object-cover', imageClassName)}
      />
    </div>
  )
}
