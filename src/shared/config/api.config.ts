import { env } from './env'

/**
 * A same-origin base path only works in the browser; on the server (RSC,
 * route handlers) prefix it with this app's own URL so the rewrite still
 * applies.
 */
function resolveBaseURL(base: string): string {
  if (!base.startsWith('/') || typeof window !== 'undefined') return base
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}${base}`
}

/**
 * Central API configuration. Consumed by the Axios instance and the
 * TanStack Query client. All values trace back to validated env vars.
 */
export const API_CONFIG = {
  baseURL: resolveBaseURL(env.NEXT_PUBLIC_API_BASE_URL),
  timeout: env.NEXT_PUBLIC_API_TIMEOUT,
  // Send/receive auth cookies set by the .NET backend (refresh token flow).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
} as const
