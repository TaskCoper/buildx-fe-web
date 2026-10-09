import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { isApiError } from '@/shared/lib/api'

const CODE = /^[A-Za-z0-9]+$/

/**
 * Câu báo lỗi cho khách từ MỌI loại lỗi một thao tác có thể ném:
 * - `ApiError`: `message` đã được dịch theo mã/status khi chuẩn hoá (xem `api-error-message.logic`);
 * - lỗi thường mang mã BE ở `code` (vd. `MediaUploadError` với `failureCode`) hoặc ở `message` (vd.
 *   `new Error('ExportNotReady')`): tra bảng `apiErrors.codes`;
 * - còn lại: `fallback` — câu riêng của thao tác.
 */
export function useApiErrorText() {
  const t = useTranslations('apiErrors')
  return useCallback(
    (error: unknown, fallback: string): string => {
      if (isApiError(error) && error.message) return error.message
      if (error instanceof Error) {
        const code = 'code' in error && typeof error.code === 'string' ? error.code : error.message
        // Mã chỉ biết lúc chạy nên khoá không nằm trong kiểu khoá của messages.
        const key = `codes.${code}` as Parameters<typeof t>[0]
        if (CODE.test(code) && t.has(key)) return t(key)
      }
      return fallback
    },
    [t]
  )
}
