import type { ReactNode } from 'react'

import { CheckoutHeader } from '@/shared/layouts'
import { ChatDock } from '../chat-dock'

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
