'use client'

import { Avatar, Image } from 'antd'

/**
 * Ảnh thumbnail dùng chung cho ô bảng admin — MỘT cỡ cố định 48×32, luôn có nền
 * giữ layout (hàng không nhảy cao khi thiếu ảnh). Thay cho việc mỗi màn tự đặt
 * `<Image width=.. height=..>` mỗi cỡ một khác và thiếu placeholder.
 */
export function TableThumb({ src, alt = '' }: { src?: string | null; alt?: string }) {
  return (
    <div
      style={{
        width: 48,
        height: 32,
        flexShrink: 0,
        borderRadius: 6,
        overflow: 'hidden',
        background: 'var(--admin-placeholder)',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      {src ? <Image src={src} alt={alt} width={48} height={32} style={{ objectFit: 'cover' }} /> : null}
    </div>
  )
}

/** Avatar người dùng cho ô bảng — thống nhất tròn, cỡ 36, fallback chữ cái đầu. */
export function TableAvatar({ src, name }: { src?: string | null; name?: string }) {
  return (
    <Avatar size={36} shape='circle' src={src || undefined}>
      {!src && name ? name.trim().charAt(0).toUpperCase() : null}
    </Avatar>
  )
}
