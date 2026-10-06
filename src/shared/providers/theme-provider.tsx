'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * Wraps next-themes. Hiện KHÓA giao diện SÁNG cho toàn site (`forcedTheme`): các
 * công tắc đổi nền tối đã tạm ẩn (thanh công cụ, trang đăng nhập, khu quản trị)
 * và mặc định luôn là light — kể cả người dùng cũ đã lỡ lưu `dark`. Bỏ
 * `forcedTheme` (và mở lại các công tắc) để bật lại chế độ tối.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='light'
      enableSystem={false}
      forcedTheme='light'
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
