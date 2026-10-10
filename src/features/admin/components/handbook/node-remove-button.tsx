'use client'

import { CloseOutlined } from '@ant-design/icons'
import { Button } from 'antd'

/**
 * Dấu X đỏ ở góc trên phải của khung ảnh / ảnh trong richtext. Vị trí đặt bằng `style` chứ không
 * bằng Tailwind: antd tự gán `position: relative` cho Button ở lớp CSS không phân tầng nên thắng
 * mọi utility của Tailwind (xem ghi chú "Styling inside (admin)" trong CLAUDE.md).
 */
export function NodeRemoveButton({
  label,
  onClick,
  disabled
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      danger
      type='primary'
      shape='circle'
      size='small'
      icon={<CloseOutlined />}
      aria-label={label}
      title={label}
      disabled={disabled}
      style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
      onClick={onClick}
    />
  )
}
