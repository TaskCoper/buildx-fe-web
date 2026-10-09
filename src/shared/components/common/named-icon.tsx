'use client'

import { Icon, type LucideIcon, type LucideProps } from 'lucide-react'
import type { ComponentProps } from 'react'

import { useHomeIconNodes } from '@/shared/cms/home-content'
import { lucideIconKey } from '@/shared/cms/home-sections'

interface NamedIconProps extends LucideProps {
  /** Tên icon lucide-react do admin nhập (`PencilRuler` hoặc `pencil-ruler`); trống hoặc sai thì dùng `fallback`. */
  name?: string
  /** Icon mặc định của vị trí này; luôn có sẵn trong bundle nên không bao giờ để trống chỗ icon. */
  fallback: LucideIcon
}

/**
 * Hiển thị icon lucide theo tên admin nhập. Dữ liệu vẽ của những icon admin đã đặt được server tra sẵn (xem
 * `home-content.server.ts`), nên ở đây không phải tải thêm gì. Tên trống, sai hoặc không tra được thì vẽ icon mặc định
 * của vị trí — trang chủ không bao giờ thiếu icon, và khi admin chưa đổi icon nào thì giữ nguyên như cũ.
 */
export function NamedIcon({ name, fallback: Fallback, ...props }: NamedIconProps) {
  const iconNodes = useHomeIconNodes()
  const key = lucideIconKey(name)
  const node = key ? iconNodes[key] : undefined

  if (!node) return <Fallback {...props} />
  return <Icon iconNode={node as ComponentProps<typeof Icon>['iconNode']} {...props} />
}
