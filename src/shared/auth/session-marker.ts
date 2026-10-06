import { AUTH_COOKIE_NAME } from './auth.constants'

/**
 * The proxy route guard (`src/proxy.ts`) only checks that {@link AUTH_COOKIE_NAME}
 * exists. The real tokens are httpOnly cookies owned by the backend, so the
 * client keeps this marker in step with the session it has confirmed.
 */

export function setSessionMarker(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
}

export function clearSessionMarker(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}

export function hasSessionMarker(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`))
  )
}
