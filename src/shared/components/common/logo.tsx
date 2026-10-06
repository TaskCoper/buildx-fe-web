'use client'

import { useSiteImage } from '@/shared/cms'
import { cn } from '@/shared/lib/utils'

/** Logo BuildX bản ngang (biểu tượng nhà + chữ BuildX), nền trong suốt. */
const BUILDX_LOGO = '/images/brand/buildx-logo.png'

interface LogoProps {
  className?: string
  /**
   * Bản nền tối (footer): dòng định vị chuyển sang màu chữ của footer. Admin có
   * thể đặt riêng ảnh logo cho nền tối ở khóa `brand.logoOnDark`.
   */
  onDark?: boolean
  /**
   * Dòng định vị nhỏ dưới logo. Chữ do nơi gọi
   * truyền vào: `Logo` dùng được ở cả server lẫn client component nên không tự
   * lấy bản dịch.
   */
  tagline?: string
}

/**
 * Logo BuildX (sheet góp ý BuildX, tab "Hình ảnh website").
 *
 * Mặc định là ảnh logo ngang của BuildX; admin đặt ảnh ở khóa `brand.logo` (nền
 * sáng) / `brand.logoOnDark` (chân trang nền tối) thì dùng ảnh đó thay. Ảnh chỉ
 * cần đủ cao (`h-9`), bề ngang tự theo tỉ lệ ảnh.
 */
export function Logo({ className, onDark = false, tagline }: LogoProps) {
  const override = useSiteImage(onDark ? 'brand.logoOnDark' : 'brand.logo')

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh admin dán có thể ở host lạ, không qua next/image loader
    <img
      src={override || BUILDX_LOGO}
      alt='BuildX'
      className={cn('h-9 w-auto max-w-60 shrink-0 object-contain', tagline ? undefined : className)}
    />
  )

  if (!tagline) return image

  return (
    <span className={cn('flex flex-col items-start gap-1', className)}>
      {image}
      <span
        className={cn(
          'max-md:text-xs text-[0.625rem] leading-none font-medium tracking-[0.12em] whitespace-nowrap uppercase',
          onDark ? 'text-footer-foreground/60' : 'text-muted-foreground'
        )}
      >
        {tagline}
      </span>
    </span>
  )
}
