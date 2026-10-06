import { cn } from '@/shared/lib/utils'

/**
 * Hình kiến trúc sư SAVICO kèm bong bóng thoại, đứng cạnh đoạn tư vấn ở màn
 * kết quả dự toán (mục IV.5, Hình 08).
 *
 * Vẽ nét mảnh bằng SVG `currentColor` thay vì ảnh chân dung: đây là hình minh
 * họa vai trò, không phải một KTS cụ thể — hồ sơ KTS thật thuộc mục VIII.
 */
export function ArchitectAvatar({ className, ...props }: { className?: string } & React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox='0 0 96 104'
      fill='none'
      aria-hidden='true'
      className={cn('text-primary-strong', className)}
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      {/* Bong bóng thoại */}
      <path d='M60 8h28a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H74l-8 8v-8h-6a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6Z' />
      <circle cx='68' cy='21' r='2' fill='currentColor' stroke='none' />
      <circle cx='76' cy='21' r='2' fill='currentColor' stroke='none' />
      <circle cx='84' cy='21' r='2' fill='currentColor' stroke='none' />

      {/* Đầu + kính */}
      <circle cx='34' cy='34' r='16' />
      <path d='M25 32h7M36 32h7' />
      <circle cx='28.5' cy='32' r='3.5' />
      <circle cx='39.5' cy='32' r='3.5' />
      <path d='M20 26c4-8 24-8 28 0' />

      {/* Thân + cổ áo */}
      <path d='M10 100v-14c0-10 8-18 18-18h12c10 0 18 8 18 18v14' />
      <path d='M28 68l6 10 6-10' />
      <path d='M34 78v10' />

      {/* Ống bản vẽ cầm bên hông */}
      <path d='M58 74h8v26h-8z' />
      <path d='M58 80h8' />
    </svg>
  )
}
