'use client'

import { useEffect, useState } from 'react'

/**
 * `true` khi trang đã cuộn quá `threshold` px.
 *
 * Dùng cho thanh công cụ (mục II.1): rời khỏi đỉnh trang thì header đặc lại và
 * đổ bóng sâu hơn để tách khỏi nội dung đang trôi bên dưới.
 */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    // Chạy ngay một lần: người dùng có thể tải trang ở giữa nội dung (anchor,
    // khôi phục vị trí cuộn) nên trạng thái đầu không chắc là ở đỉnh.
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrolled
}
