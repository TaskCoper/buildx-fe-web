import { cn } from '@/shared/lib/utils'

/**
 * Hình minh họa nét mảnh dưới checklist của màn chờ Bước 2 (mục IV.4, Hình 07):
 * mặt tiền công trình + bảng dự toán + máy tính + biểu đồ tròn.
 *
 * Vẽ bằng SVG `currentColor` thay vì ảnh bitmap để nét luôn sắc, nhẹ, và tự đổi
 * màu theo token — màn chờ đã đủ nặng vì còn phải tải panel cẩm nang.
 */
export function BlueprintIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 320 130'
      fill='none'
      aria-hidden='true'
      className={cn('text-muted-foreground/45 w-full', className)}
      stroke='currentColor'
      strokeWidth='1.2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {/* Mặt tiền công trình 2 tầng */}
      <path d='M14 118h116' />
      <path d='M26 118V44l40-22 40 22v74' />
      <path d='M26 44h80' />
      <path d='M42 62h20v18H42zM70 62h20v18H70z' />
      <path d='M42 92h20v26H42z' />
      <path d='M70 92h20v26H70z' />
      <path d='M52 100v10' />
      {/* Ban công tầng 2 */}
      <path d='M34 84h64' />
      <path d='M34 84v-6M46 84v-6M58 84v-6M74 84v-6M86 84v-6M98 84v-6' />

      {/* Bảng dự toán */}
      <rect x='150' y='18' width='108' height='84' rx='4' />
      <path d='M150 34h108' />
      <path d='M150 50h108M150 64h108M150 78h108' />
      <path d='M222 34v68' />
      <path d='M158 26h34' />
      <path d='M158 42h26M158 56h30M158 70h22M158 88h28' />
      <path d='M230 42h20M230 56h20M230 70h20M230 88h20' />

      {/* Máy tính bỏ túi */}
      <rect x='152' y='104' width='42' height='22' rx='3' />
      <path d='M158 110h30' />
      <path d='M158 118h6M170 118h6M182 118h6' />

      {/* Biểu đồ tròn tỷ trọng */}
      <circle cx='282' cy='112' r='20' />
      <path d='M282 112V92' />
      <path d='M282 112l17 10' />
    </svg>
  )
}
