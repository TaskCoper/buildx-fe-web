'use client'

import { useEffect, useRef } from 'react'

import { usePathname } from '@/i18n/navigation'

/** Cờ trên <html>: màn nào đổi route nhưng chủ ý giữ vị trí cuộn thì gọi `keepScrollOnce()` ngay trước `router.push`. */
const KEEP_SCROLL_ATTR = 'keepScroll'

export function keepScrollOnce() {
  document.documentElement.dataset[KEEP_SCROLL_ATTR] = 'true'
}

export function clearKeepScroll() {
  delete document.documentElement.dataset[KEEP_SCROLL_ATTR]
}

/**
 * Lưới an toàn cho điện thoại: mỗi lần sang trang mới đều về đầu trang.
 *
 * Next chỉ tự cuộn về đầu khi phần đầu của segment mới nằm ngoài khung nhìn, nên ở các trang lồng
 * layout (Tài khoản, Cẩm nang, Tư vấn…) người dùng có thể bị giữ lại giữa trang. Back/forward giữ
 * nguyên vị trí cũ của trình duyệt; đổi query hoặc ngôn ngữ không đổi pathname nên không bị ảnh hưởng.
 */
export function RouteScrollReset() {
  const pathname = usePathname()
  const previous = useRef(pathname)
  const poppedRef = useRef(false)

  useEffect(() => {
    const onPop = () => {
      poppedRef.current = true
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname

    if (poppedRef.current) {
      poppedRef.current = false
      return
    }
    if (document.documentElement.dataset[KEEP_SCROLL_ATTR]) {
      clearKeepScroll()
      return
    }
    if (!window.matchMedia('(max-width: 767px)').matches) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
