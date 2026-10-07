'use client'

import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card } from 'antd'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { AdminPage } from './admin-page'

/**
 * Khung một TRANG thêm / sửa / xem của màn danh sách — thay cho ngăn kéo (Drawer) cũ, vốn hẹp và
 * che mất bảng nên khó soạn các form dài.
 *
 * Đầu trang dính dưới thanh trên (`AdminPage sticky`) nên nút Lưu / Hủy luôn trong tầm tay dù form
 * dài hơn màn hình. Nút quay lại mang tên danh sách để biết mình đang ở đâu. Bề ngang giới hạn ở
 * CẢ khối (nút quay lại, đầu trang, form) để thanh tiêu đề không rộng hơn form bên dưới.
 */
export function FormPage({
  title,
  listTitle,
  onBack,
  actions,
  wide,
  children
}: {
  title: string
  /** Tên màn danh sách — chữ trên nút quay lại. */
  listTitle: string
  onBack: () => void
  actions?: ReactNode
  /** Form có nhiều cột / bảng rộng (vd. bảng giá, bài viết) — cho trang rộng hơn. */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex w-full flex-col gap-2', wide ? 'max-w-6xl' : 'max-w-4xl')}>
      <div>
        <Button type='text' size='small' icon={<ArrowLeftOutlined />} onClick={onBack}>
          {listTitle}
        </Button>
      </div>
      <AdminPage sticky title={title} actions={actions}>
        <Card className='w-full'>{children}</Card>
      </AdminPage>
    </div>
  )
}
