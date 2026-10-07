import type { ApiError } from '@/shared/types'
import { AxiosError } from 'axios'
import { localizeApiError, type ApiErrorFacts } from './api-error-message.logic'
import { getApiErrorTranslator } from './api-error-translator'

/**
 * Câu báo lỗi hiển thị cho khách: bảng `apiErrors` theo mã lỗi BE và status (xem `localizeApiError`). Chưa có trình
 * dịch (phía server, trước khi layout mount) hoặc bảng không có câu thì dùng `fallback` — câu gốc của BE.
 */
export function displayMessage(facts: ApiErrorFacts, fallback: string): string {
  const translator = getApiErrorTranslator()
  return (translator && localizeApiError(facts, translator)) || fallback
}

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

/** Hai dạng thân lỗi của BMT API (xem `apiErrorFromResponse`). */
interface ErrorBody {
  message?: string
  code?: string
  detail?: string
  messageCode?: string | null
  errors?: Record<string, string[]> | ValidationItem[] | null
  error?: { code?: string; message?: string; messageCode?: string | null } | null
}

/**
 * Dựng {@link ApiError} từ một phản hồi lỗi HTTP (status + thân JSON). Dùng chung cho Axios và cho các chỗ phải dùng
 * `fetch` trần (tải tệp qua link chia sẻ, PUT lên kho) để mã lỗi BE không bị mất.
 */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  // The BMT API answers errors in two shapes: ASP.NET ProblemDetails
  // (`title`/`detail`/`messageCode`/`errors`) for auth, validation and
  // server faults, and the `Result<T>` envelope (`error.code/message`) for
  // business rejections.
  const data = (body && typeof body === 'object' ? body : undefined) as ErrorBody | undefined

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
  const code = data?.error?.code || data?.code || undefined
  const messageCode = data?.error?.messageCode ?? data?.messageCode ?? first?.messageCode ?? undefined
  const serverMessage =
    data?.error?.message ||
    first?.message ||
    first?.ErrorMessage ||
    first?.errorMessage ||
    data?.detail ||
    data?.message ||
    undefined
  return {
    status,
    code,
    messageCode,
    message: displayMessage(
      { status, code, messageCode, serverMessage },
      serverMessage || defaultMessageForStatus(status)
    ),
    errors:
      data?.errors && !Array.isArray(data.errors)
        ? data.errors
        : Object.keys(fieldErrors).length
          ? fieldErrors
          : undefined
  }
}

/**
 * Tải tệp (`responseType: 'blob'`) lỗi thì thân lỗi JSON của BE cũng nằm trong một Blob, `normalizeApiError` không
 * đọc được mã lỗi. Đọc Blob đó thành JSON trước khi chuẩn hoá; không phải JSON thì giữ nguyên.
 */
export async function withReadableErrorBody(error: unknown): Promise<unknown> {
  if (error instanceof AxiosError && typeof Blob !== 'undefined' && error.response?.data instanceof Blob) {
    try {
      error.response.data = JSON.parse(await error.response.data.text())
    } catch {
      /* Không phải JSON: giữ Blob, lỗi vẫn có status. */
    }
  }
  return error
}

/**
 * Normalize any thrown value (Axios error, network failure, unknown) into our
 * stable {@link ApiError} shape so feature code never has to inspect Axios
 * internals.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    // Server responded with a non-2xx status.
    if (error.response) return apiErrorFromResponse(error.response.status, error.response.data)

    // Request made but no response (timeout / network / CORS).
    return {
      status: 0,
      code: error.code,
      message: displayMessage(
        { status: 0, transportCode: error.code },
        error.code === 'ECONNABORTED'
          ? 'Request timed out. Please try again.'
          : 'Network error. Check your connection and try again.'
      )
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
