import type { ReactNode } from 'react'

import { CheckoutHeader } from '@/shared/layouts'
import { ChatDock } from '../chat-dock'

/**
 * ISR: trang dựng sẵn rồi làm mới nền sau mỗi chừng này giây (khớp chu kỳ lấy nội dung CMS ở server). Backend còn gọi
 * webhook `/api/revalidate` để làm mới ngay khi admin lưu. Phải là số viết thẳng: Next đọc giá trị này lúc build.
 */
export const revalidate = 60

/**
 * Khung riêng của luồng thanh toán (S03, S04, S06, S07, S08).
 *
 * Ảnh khách duyệt vẽ các màn này với thanh trên cùng RÚT GỌN (logo + "Bạn cần
 * hỗ trợ?") và KHÔNG có menu site, cũng không có footer — nên chúng nằm ở route
 * group riêng thay vì dùng chung `(main)`. Chatbox AI vẫn giữ: quy ước xuyên
 * suốt ở mục I nói chatbox nổi ở mọi màn hình, và văn bản thắng khi khác ảnh.
 */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-svh flex-col'>
      <CheckoutHeader />
      <main className='flex-1'>{children}</main>
      <ChatDock />
    </div>
  )
}
