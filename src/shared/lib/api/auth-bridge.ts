import { AUTH_ENDPOINTS, AUTH_SESSION_ENDED_EVENT, AUTH_SESSION_REFRESHED_EVENT } from '@/shared/auth/auth.constants'
import { clearSessionMarker } from '@/shared/auth/session-marker'
import { useAuthStore } from '@/shared/auth/auth.store'
import { API_CONFIG } from '@/shared/config/api.config'
import axios from 'axios'

/**
 * Thin bridge between the HTTP client and the auth layer.
 *
 * Kept separate from `http-client.ts` to avoid an import cycle.
 */

/**
 * Attempt to refresh the session. The BMT API reads both tokens from its
 * httpOnly cookies, so the body stays empty; on success it re-sets the cookies.
 * Uses a bare axios call (NOT `httpClient`) to avoid recursing through the
 * 401 interceptor.
 *
 * @returns `true` if the session was refreshed, `false` otherwise.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await axios.post<{ isSuccess?: boolean }>(
      AUTH_ENDPOINTS.REFRESH,
      {},
      {
        baseURL: API_CONFIG.baseURL,
        withCredentials: true,
        timeout: API_CONFIG.timeout
      }
    )
    const refreshed = res.data?.isSuccess !== false
    if (refreshed && typeof window !== 'undefined') {
      useAuthStore.getState().setInitialized(false)
      // Finish the retry first, then recheck the new permission snapshot.
      window.setTimeout(() => window.dispatchEvent(new Event(AUTH_SESSION_REFRESHED_EVENT)), 0)
    }
    return refreshed
  } catch {
    return false
  }
}

/** Called when the session is irrecoverable — clear client auth state. */
export function onUnauthorized(): void {
  clearSessionMarker()
  useAuthStore.getState().reset()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_ENDED_EVENT))
}
