'use client'

import Image from 'next/image'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface RevealPhotoProps {
  src: string
  alt: string
  className?: string
  /** Override chuyển động trực tiếp trên ảnh cho từng ngữ cảnh sử dụng. */
  imageClassName?: string
  sizes?: string
  priority?: boolean
  /** Ảnh lỗi không tải được — gọi khi rơi vào trường hợp đó, để nơi gọi tự vẽ trạng thái thay thế. */
  onError?: () => void
}

/**
 * Ảnh hiện dần từ mờ sang nét, khung chờ có vệt sáng lướt trong lúc tải (mục
 * II.2, vùng 07/08 — hồ sơ mẫu, Cẩm nang nổi bật). Đặt trong một phần tử có
 * class `group` để phóng nhẹ khi rê card cha lên nó (`group-hover:scale-105`).
 *
 * Khác `Photo` (hiện thẳng, không chờ) — dùng riêng ở những khối spec yêu cầu
 * đúng hiệu ứng tải ảnh này, không đổi hành vi của `Photo` ở mọi nơi khác.
 */
export function RevealPhoto({
  src,
  alt,
  className,
  imageClassName,
  sizes = '(max-width: 768px) 100vw, 400px',
  priority,
  onError
}: RevealPhotoProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={cn('bg-muted relative overflow-hidden', className)}>
      {!loaded ? (
        <span
          aria-hidden
          className='via-foreground/10 absolute inset-y-0 -left-1/2 w-1/2 animate-[glass-sheen_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-transparent'
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        // Ảnh đã tải xong trước khi hydrate thì `onLoad` không bắn lại — nhận biết qua `complete`.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true)
        }}
        onError={onError}
        className={cn(
          'object-cover transition-[opacity,filter,transform] duration-500 ease-out',
          !imageClassName && 'group-hover:scale-105',
          loaded ? 'opacity-100 blur-none' : 'opacity-0 blur-md',
          imageClassName
        )}
      />
    </div>
  )
}
