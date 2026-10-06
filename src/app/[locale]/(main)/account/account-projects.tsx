'use client'

import { MyProjects } from '@/features/design'

/**
 * "Dự án của tôi" ở trang Tài khoản: danh sách dự toán thật (`GET /estimates`).
 *
 * Không còn dải giám sát gắn ở đáy thẻ: gói giám sát của BE gắn vào CÔNG TRÌNH chứ không phải dự án dự toán (xem thẻ
 * "Gói giám sát của tôi" ở cột trái và trang Công trình của tôi), nên gắn nó vào một dự án là bịa ra quan hệ không có.
 */
export function AccountProjects() {
  return (
    <div className='space-y-4'>
      <MyProjects />
    </div>
  )
}
