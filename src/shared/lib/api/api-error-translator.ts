import type { ApiErrorTranslator } from './api-error-message.logic'

/**
 * Cầu nối giữa tầng HTTP và i18n (cùng kiểu `auth-bridge`): `normalizeApiError` chạy ngoài React nên không gọi được
 * `useTranslations`. `ApiErrorTranslatorBridge` (shared/providers) đăng ký bản dịch của ngôn ngữ đang dùng ở đây.
 * Chưa đăng ký (render phía server, trước khi layout mount) thì lỗi giữ câu gốc của BE như trước.
 */
let current: ApiErrorTranslator | null = null

export function setApiErrorTranslator(translator: ApiErrorTranslator | null): void {
  current = translator
}

export function getApiErrorTranslator(): ApiErrorTranslator | null {
  return current
}
