'use client'

import { MoreOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import type { ReactNode } from 'react'

/**
 * Một hành động trên dòng bảng, dạng DỮ LIỆU (không phải JSX) để cột "Thao tác"
 * dựng menu kebab (…) có icon + chữ rõ ràng. Hành động cần xác nhận thì tự mở
 * hộp thoại trong `onClick` (menu chỉ là nút bấm).
 */
export interface RowAction {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * Cột "Thao tác" gộp mọi hành động vào một nút "…"; bấm mở menu liệt kê từng
 * hành động kèm icon + chữ (dễ nhìn hơn dãy icon trơ). Không có hành động nào thì
 * không hiện gì.
 */
export function RowActionsMenu({ actions, moreLabel }: { actions: RowAction[]; moreLabel: string }) {
  if (actions.length === 0) return null

  // Hành động nguy hiểm (Xoá) LUÔN xuống cuối menu, dù màn khai báo ở đâu — đặt
  // cạnh "Sửa" thì rất dễ bấm nhầm. Sắp xếp ổn định: thứ tự còn lại giữ nguyên.
  const ordered = [...actions.filter((a) => !a.danger), ...actions.filter((a) => a.danger)]

  return (
    <Dropdown
      trigger={['click']}
      placement='bottomRight'
      menu={{
        items: ordered.map((action) => ({
          key: action.key,
          label: action.label,
          icon: action.icon,
          danger: action.danger,
          disabled: action.disabled,
          onClick: () => action.onClick()
        }))
      }}
    >
      <Button type='text' size='small' icon={<MoreOutlined />} aria-label={moreLabel} />
    </Dropdown>
  )
}
