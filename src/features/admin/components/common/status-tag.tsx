'use client'

import { Tag } from 'antd'
import type { ReactNode } from 'react'

/**
 * Sắc thái trạng thái dùng chung cho MỌI bảng admin — một nguồn màu duy nhất
 * thay cho các map màu cục bộ mỗi màn tự khai (tránh chỗ "bật" xanh, chỗ "bật"
 * xanh dương; chỗ "ẩn" xám, chỗ "ẩn" đỏ).
 *
 * Quy ước: `off` (ẩn / ngừng / tạm dừng) = xám mặc định, KHÔNG dùng đỏ. Đỏ chỉ
 * dành cho lỗi thật sự: bị từ chối / khoá / thất bại (`danger`).
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'off'

const TONE_COLOR: Record<StatusTone, string | undefined> = {
  success: 'green',
  warning: 'gold',
  danger: 'red',
  info: 'blue',
  off: undefined
}

export function StatusTag({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <Tag color={TONE_COLOR[tone]}>{children}</Tag>
}
