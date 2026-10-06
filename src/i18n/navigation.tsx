import { createNavigation } from 'next-intl/navigation'
import type { ComponentProps } from 'react'

import { isProtectedPath } from '@/shared/auth/route-access'
import { routing } from './routing'

/**
 * Locale-aware navigation primitives. Use these EVERYWHERE instead of the
 * `next/link` and `next/navigation` equivalents so the active locale prefix
 * is applied automatically.
 */
const { Link: IntlLink, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)

export { getPathname, redirect, usePathname, useRouter }

type LinkProps = ComponentProps<typeof IntlLink>

/** Href có trỏ vào khu bắt buộc đăng nhập (`PROTECTED_ROUTE_PREFIXES`) không. */
function isProtectedHref(href: LinkProps['href']): boolean {
  const raw = typeof href === 'string' ? href : (href?.pathname ?? '')
  const path = raw.split(/[?#]/)[0]!
  return isProtectedPath(path)
}

/**
 * `Link` của next-intl, thêm MỘT luật: không prefetch các route bắt buộc đăng nhập.
 *
 * `proxy.ts` đá khách chưa đăng nhập về popup đăng nhập. Khi Next prefetch một
 * link như `/design` lúc người dùng còn là khách, thứ nằm trong Router Cache
 * chính là cú đá đó — và nó sống tiếp sau khi đăng nhập (route tĩnh giữ tới 5
 * phút, `router.refresh()` không dọn được). Bấm "Thiết kế & Dự toán" ngay sau
 * khi đăng nhập là phát lại bản cache ấy: người dùng bị đòi đăng nhập lần nữa
 * dù phiên đã hợp lệ.
 *
 * Tắt prefetch cho đúng nhóm route này đổi lại một chuyến đi server lúc bấm —
 * bù lại trạng thái đăng nhập luôn được tính tươi mới.
 */
export function Link({ href, prefetch, ...props }: LinkProps) {
  return <IntlLink href={href} prefetch={prefetch ?? (isProtectedHref(href) ? false : undefined)} {...props} />
}
