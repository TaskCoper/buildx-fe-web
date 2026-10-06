'use client'

import { Space, Typography } from 'antd'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

const { Title, Paragraph } = Typography

/**
 * Đầu trang dùng chung cho mọi màn quản trị: tiêu đề, một dòng giải thích màn
 * này sửa cái gì trên site, và chỗ đặt nút hành động.
 *
 * Dòng mô tả không phải trang trí — người vận hành cần biết sửa ở đây thì KHÁCH
 * thấy đổi ở đâu, nên mỗi màn đều nói rõ điều đó.
 *
 * `sticky` dành cho các màn soạn thảo dài (trang chủ, trang tĩnh, cài đặt site):
 * form dài hơn màn hình nên nút Lưu ở đầu trang sẽ trôi mất, phải cuộn ngược lên
 * mới bấm được. Bật `sticky` thì cả khối đầu trang dính dưới thanh trên.
 *
 * Bố cục ở đây là `div` thuần nên dùng THẲNG Tailwind. Chỉ những chỗ phải đè lên
 * DOM bên trong của antd mới rơi xuống `style`/`admin.css` — CSS-in-JS của antd
 * không nằm trong `@layer` nên luôn thắng utility của Tailwind.
 */
export function AdminPage({
  title,
  description,
  actions,
  sticky,
  children
}: {
  title: string
  description?: string
  actions?: ReactNode
  sticky?: boolean
  children: ReactNode
}) {
  return (
    // `div` thuần chứ KHÔNG phải `Space` của antd: Space bọc mỗi con trong một
    // `.ant-space-item` cao đúng bằng chính con đó, mà `position: sticky` chỉ
    // chạy được trong phạm vi thẻ cha — cha cao bằng con thì nó không nhúc nhích
    // nổi một pixel. Đó là lý do thanh Lưu "dính" mà cuộn xuống vẫn mất.
    <div className='flex w-full flex-col gap-4'>
      <div
        className={cn(
          'flex flex-wrap items-start gap-4',
          // `top-15` = 60px = chiều cao Header (xem `headerHeight` ở AntdProvider).
          // Nền phải ĐỤC, nếu không chữ bên dưới cuộn xuyên qua khối dính.
          sticky &&
            'sticky top-15 z-[5] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 shadow-sm md:px-4 md:py-3.5'
        )}
      >
        <div className='min-w-60 flex-1'>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {description ? (
            <Paragraph type='secondary' style={{ margin: '4px 0 0', maxWidth: 780 }}>
              {description}
            </Paragraph>
          ) : null}
        </div>
        {actions ? <Space wrap>{actions}</Space> : null}
      </div>
      {children}
    </div>
  )
}
