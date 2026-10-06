import { cn } from '@/shared/lib/utils'

/**
 * Mũi tên nét vẽ tay, cong xuống phải — dùng kèm các dòng ghi chú viết tay trên
 * trang chủ (ảnh mockup khách gửi).
 *
 * Vẽ bằng SVG `currentColor` chứ KHÔNG nhúng ảnh stock: ảnh khách gửi là bản có
 * watermark của kho ảnh, mà nét vẽ này chỉ là một đường cong + hai nét đầu mũi
 * nên dựng thẳng còn nhẹ hơn tải ảnh, lại đổi màu theo token và nét mảnh dần
 * đúng cảm giác bút lông.
 */
export function ScribbleArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 128 60'
      fill='none'
      aria-hidden='true'
      className={cn('h-10 w-24', className)}
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {/* Thân: cong lên rồi đổ xuống phải. */}
      <path d='M5 20C25 7 58 4 84 20c7 4 12 11 15 19' strokeWidth='3.4' />
      {/* Nét mảnh chồng lên để mép nét không phẳng lì như đường vẽ máy. */}
      <path d='M9 18C29 7 59 6 83 21' strokeWidth='1.2' opacity='0.55' />
      {/* Hai nét đầu mũi. */}
      <path d='M99 39 84 35' strokeWidth='3.4' />
      <path d='M99 39l2-14' strokeWidth='3.4' />
    </svg>
  )
}
