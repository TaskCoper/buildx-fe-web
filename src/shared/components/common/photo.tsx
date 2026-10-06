'use client'

import Image from 'next/image'

import { cn } from '@/shared/lib/utils'

interface PhotoProps {
  /** Local path under `/public` or a remote URL allowed in `next.config.ts`. */
  src: string
  alt: string
  className?: string
  /** Responsive size hint passed to next/image. */
  sizes?: string
  /** Render above the fold (hero) — skips lazy loading. */
  priority?: boolean
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
}

/**
 * A real photo filling its container.
 *
 * Replaces the old blueprint-grid placeholder: every call site now points at an
 * image chosen to match its subject (see `shared/lib/imagery.ts`). The wrapper
 * owns the aspect ratio; the image covers it.
 */
export function Photo({
  src,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, 400px',
  priority,
  fit = 'cover',
  imageClassName,
  onLoad
}: PhotoProps) {
  return (
    <div className={cn('bg-muted relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={onLoad}
        // Ảnh tải xong TRƯỚC khi React gắn `onLoad` (cache, hydrate chậm) thì sự kiện không bắn nữa.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) onLoad?.()
        }}
        className={cn(fit === 'contain' ? 'object-contain' : 'object-cover', imageClassName)}
      />
    </div>
  )
}
