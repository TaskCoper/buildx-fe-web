import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

interface BrandIconProps {
  className?: string
}

/**
 * Icon thương hiệu mà `lucide-react` không có (Zalo, TikTok) — dựng bằng SVG
 * đơn sắc `currentColor` để đổi màu theo token như mọi icon lucide khác.
 * Facebook / YouTube dùng thẳng icon lucide.
 */

/**
 * Zalo — khung chat bo tròn có đuôi, chữ "Zalo" khoét rỗng bên trong (đơn sắc `currentColor`).
 *
 * Bản cũ vẽ chữ bằng một đường path liền nên mất chữ "a" (đọc thành "Zlo"). Nay bốn chữ Z-a-l-o là
 * nét vẽ riêng, khoét khỏi khung bằng `mask` — không phụ thuộc phông chữ.
 */
export function ZaloIcon({ className }: BrandIconProps) {
  const maskId = useId()
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' className={cn('size-4', className)}>
      <mask id={maskId}>
        <rect width='24' height='24' fill='white' />
        <g fill='none' stroke='black' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M4.4 8.9h4.2l-4.2 5.6h4.4' />
          <circle cx='12.1' cy='12.7' r='1.75' />
          <path d='M13.9 10.9v3.6' />
          <path d='M16.1 8.4v6.1' />
          <circle cx='19.2' cy='12.7' r='1.75' />
        </g>
      </mask>
      <path
        mask={`url(#${maskId})`}
        fill='currentColor'
        d='M6 2h12a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-6.6l-4.3 3.1a.6.6 0 0 1-.95-.5V19H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z'
      />
    </svg>
  )
}

/** TikTok — nốt nhạc đặc trưng. */
export function TikTokIcon({ className }: BrandIconProps) {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' className={cn('size-4', className)} fill='currentColor'>
      <path d='M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .76-5.07v-3.1a5.66 5.66 0 0 0-.76-.05A5.68 5.68 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z' />
    </svg>
  )
}
