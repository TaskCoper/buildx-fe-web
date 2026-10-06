import type { ApiError, ApiResponse } from '@/shared/types'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { httpClient } from './http-client'

/**
 * Unwrap the BMT `Result<T>` envelope. A 2xx with `isSuccess: false` is still a
 * failure, so it is re-thrown as {@link ApiError} like any HTTP error. Bodies
 * without the envelope (204, plain JSON) pass through unchanged.
 */
function unwrap<T>(res: AxiosResponse<ApiResponse<T> | T>): T {
  const body = res.data as ApiResponse<T> | T | undefined
  if (body && typeof body === 'object' && 'isSuccess' in body) {
    if (!body.isSuccess) {
      const error: ApiError = {
        status: res.status,
        code: body.error?.code || undefined,
        messageCode: body.error?.messageCode ?? undefined,
        message: body.error?.message || 'Something went wrong. Please try again.'
      }
      throw error
    }
    return body.value as T
  }
  return body as T
}

/**
 * Thin typed helpers over {@link httpClient} that unwrap the backend's
 * `Result<T>` envelope and return `T` directly.
 *
 * Feature API modules build on these so call sites get fully-typed payloads
 * without repeating `.data.value`.
 */
export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    unwrap(await httpClient.get<ApiResponse<T>>(url, config)),
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    unwrap(await httpClient.post<ApiResponse<T>>(url, body, config)),
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    unwrap(await httpClient.put<ApiResponse<T>>(url, body, config)),
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    unwrap(await httpClient.patch<ApiResponse<T>>(url, body, config)),
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    unwrap(await httpClient.delete<ApiResponse<T>>(url, config))
}
