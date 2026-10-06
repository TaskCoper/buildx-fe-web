'use client'

import { AccountInfo, PlanCard } from '@/features/account'
import { useDesignQuota } from '@/features/design'

/**
 * Cột trái trang Tài khoản (mục IX, Hình 17): thẻ hồ sơ + thẻ "GÓI CỦA TÔI".
 *
 * Nằm ở `app/` vì chỉ layer này được phép chạm cả `features/account` lẫn
 * `features/design`: spec yêu cầu số lượt thiết kế trên thẻ gói ĐỒNG BỘ THỜI
 * GIAN THỰC với dòng hạn mức ở Bước 1 (mục IV.3.c), mà hạn mức đó thuộc
 * `features/design`.
 */
export function AccountSide() {
  const { data: quota } = useDesignQuota()

  return (
    <>
      <AccountInfo />
      <PlanCard
        designAllowance={
          // Khách chưa mua gói thì `total` là null — khi đó để thẻ gói dùng số
          // của chính gói thay vì dựng một hạn mức không có mẫu số.
          quota && quota.total !== null ? { remaining: quota.remaining, total: quota.total } : undefined
        }
      />
    </>
  )
}
