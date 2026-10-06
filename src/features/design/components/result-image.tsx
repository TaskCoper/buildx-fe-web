import { cn } from '@/shared/lib/utils'

interface ResultImageProps {
  src: string
  alt: string
  className?: string
  /** `contain` cho bản vẽ mặt bằng (cắt mất một dải là mất thông tin). */
  fit?: 'cover' | 'contain'
}

/**
 * Ảnh kết quả AI do BE chuyển tiếp (`/estimates/{id}/result-files/{fileId}`). Dùng `<img>` thuần: ảnh cần cookie đăng
 * nhập của người xem, còn trình tối ưu ảnh của Next gọi từ máy chủ nên không có cookie đó.
 */
export function ResultImage({ src, alt, className, fit = 'cover' }: ResultImageProps) {
  return (
    <div className={cn('bg-muted relative overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading='lazy'
        className={cn('absolute inset-0 size-full', fit === 'contain' ? 'object-contain' : 'object-cover')}
      />
    </div>
  )
}
