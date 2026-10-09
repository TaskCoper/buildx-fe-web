'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { getImageProps } from 'next/image'
import * as React from 'react'

import { canOptimizeImage } from '@/shared/lib/image-src'
import { cn } from '@/shared/lib/utils'

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot='avatar'
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

/** Cạnh khung lớn nhất của ảnh đại diện trong app (px); bộ tối ưu tự thêm bản 2x cho màn nét cao. */
const AVATAR_MAX_BOX = 96

/**
 * `AvatarImage` của Radix là thẻ `<img>` thô nên tải nguyên ảnh gốc: từng gặp PNG 2,4 MB cho khung 72 px. Ảnh tối
 * ưu được (xem `canOptimizeImage`) thì lấy URL từ bộ tối ưu của Next để nhận AVIF/WebP đúng cỡ; ảnh ở host lạ hoặc cần
 * cookie phiên vẫn giữ nguyên `src`.
 */
function AvatarImage({ className, src, alt, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const optimized =
    typeof src === 'string' && canOptimizeImage(src)
      ? getImageProps({ src, alt: alt ?? '', width: AVATAR_MAX_BOX, height: AVATAR_MAX_BOX }).props
      : null

  return (
    <AvatarPrimitive.Image
      data-slot='avatar-image'
      className={cn('aspect-square size-full object-cover', className)}
      alt={alt}
      {...props}
      src={optimized?.src ?? src}
      srcSet={optimized?.srcSet}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot='avatar-fallback'
      className={cn('bg-muted flex size-full items-center justify-center rounded-full text-sm', className)}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback, AvatarImage }
