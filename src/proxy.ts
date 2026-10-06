import { routing } from '@/i18n/routing'
import { AUTH_COOKIE_NAME } from '@/shared/auth/auth.constants'
import { isProtectedPath } from '@/shared/auth/route-access'
import { GUEST_ONLY_ROUTES } from '@/shared/constants/routes'
import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware(routing)

/**
 * Strip the leading locale segment so route-guard checks operate on
 * locale-agnostic paths (e.g. `/vi/dashboard` -> `/dashboard`).
 */
function stripLocale(pathname: string): string {
  const segments = pathname.split('/')
  if (routing.locales.includes(segments[1] as never)) {
    const rest = '/' + segments.slice(2).join('/')
    return rest === '/' ? '/' : rest.replace(/\/$/, '')
  }
  return pathname
}

/**
 * Composite proxy (formerly `middleware` — renamed for the Next.js 16
 * file convention):
 *  1. Resolve locale & rewrite via next-intl.
 *  2. Apply auth route guards based on the presence of a non-sensitive session marker
 *     set by the client after backend authentication. (Infrastructure only — no token verification here;
 *     authorization is enforced server-side by the API.)
 */
export default function proxy(request: NextRequest) {
  // TẠM ẨN tiếng Anh: mọi `/en` và `/en/*` đá về `/vi` tương ứng. Giữ locale
  // 'en' trong cấu hình để bật lại dễ (chỉ cần bỏ khối này + hiện lại toggle).
  const { pathname: rawPath } = request.nextUrl
  if (rawPath === '/en' || rawPath.startsWith('/en/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/vi' + rawPath.slice(3)
    return NextResponse.redirect(url)
  }

  const response = intlMiddleware(request)

  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const hasLocalePrefix = routing.locales.includes(segments[1] as never)

  // Missing locale — defer to next-intl's redirect. Auth guards will run on the
  // follow-up request once the URL is locale-prefixed. Skipping this caused
  // ERR_TOO_MANY_REDIRECTS on unprefixed protected paths like `/dashboard`.
  if (!hasLocalePrefix) return response

  const locale = segments[1]!
  const path = stripLocale(pathname)
  const isAuthenticated = request.cookies.has(AUTH_COOKIE_NAME)

  // Block protected routes for unauthenticated users. Login/register are a
  // popup, not pages — bounce to the public home and let `?auth=login` auto-open
  // the dialog (see features/auth `AuthDialog`), preserving the intended target.
  if (isProtectedPath(path) && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    url.search = ''
    url.searchParams.set('auth', 'login')
    url.searchParams.set('redirect', path + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Keep authenticated users away from guest-only routes (login, register…).
  // Không có màn `/dashboard` trong bản SAVICO — đưa về trang chủ.
  if (GUEST_ONLY_ROUTES.includes(path) && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Run on every path except Next internals, API proxy and static assets.
  // `'/'` must be listed explicitly — the lookahead pattern below does not
  // match the bare root, so without it `/` never redirects to `/vi` (404).
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)']
}
