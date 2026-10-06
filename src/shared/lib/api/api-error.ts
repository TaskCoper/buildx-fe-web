import type { ApiError } from '@/shared/types'
import { AxiosError } from 'axios'

/** Một phần tử của `errors[]` trong lỗi validator 422. */
interface ValidationItem {
  code?: string
  message?: string
  messageCode?: string | null
  /** API media: `PropertyName` / `ErrorMessage`. */
  PropertyName?: string
  ErrorMessage?: string
  propertyName?: string
  errorMessage?: string
}

/**
 * Normalize any thrown value (Axios error, network failure, unknown) into our
 * stable {@link ApiError} shape so feature code never has to inspect Axios
 * internals.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    // Server responded with a non-2xx status.
    if (error.response) {
      // The BMT API answers errors in two shapes: ASP.NET ProblemDetails
      // (`title`/`detail`/`messageCode`/`errors`) for auth, validation and
      // server faults, and the `Result<T>` envelope (`error.code/message`) for
      // business rejections.
      const data = error.response.data as
        | {
            message?: string
            code?: string
            detail?: string
            messageCode?: string | null
            errors?: Record<string, string[]> | ValidationItem[] | null
            error?: { code?: string; message?: string; messageCode?: string | null } | null
          }
        | undefined

      // Lỗi validator (422) của BMT là ProblemDetails với `errors` là MẢNG
      // `[{code, message, messageCode}]` (API media dùng `PropertyName`/`ErrorMessage`), và
      // `detail` chỉ là câu tiếng Anh chung "A validation error occured". Câu có ích nằm ở
      // phần tử đầu của mảng nên ưu tiên nó.
      const items = Array.isArray(data?.errors) ? data.errors : []
      const first = items.find((item) => item?.message || item?.ErrorMessage || item?.errorMessage)
      const fieldErrors: Record<string, string[]> = {}
      for (const item of items) {
        const field = item.propertyName ?? item.PropertyName
        const message = item.errorMessage ?? item.ErrorMessage ?? item.message
        if (field && message) (fieldErrors[field] ??= []).push(message)
      }
      return {
        status: error.response.status,
        code: data?.error?.code || data?.code || undefined,
        messageCode: data?.error?.messageCode ?? data?.messageCode ?? first?.messageCode ?? undefined,
        message:
          data?.error?.message ||
          first?.message ||
          first?.ErrorMessage ||
          first?.errorMessage ||
          data?.detail ||
          data?.message ||
          defaultMessageForStatus(error.response.status),
        errors:
          data?.errors && !Array.isArray(data.errors)
            ? data.errors
            : Object.keys(fieldErrors).length
              ? fieldErrors
              : undefined
      }
    }

    // Request made but no response (timeout / network / CORS).
    return {
      status: 0,
      code: error.code,
      message:
        error.code === 'ECONNABORTED'
          ? 'Request timed out. Please try again.'
          : 'Network error. Check your connection and try again.'
    }
  }

  return {
    status: 0,
    message: error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid.'
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 403:
      return "You don't have permission to perform this action."
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return 'This action conflicts with the current state.'
    case 422:
      return 'Please review the highlighted fields.'
    case 429:
      return 'Too many requests. Please slow down.'
    default:
      return status >= 500
        ? 'Our servers are having trouble. Please try again later.'
        : 'Something went wrong. Please try again.'
  }
}

/** Type guard for narrowing an unknown error to {@link ApiError}. */
export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value
}
