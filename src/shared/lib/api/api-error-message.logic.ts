/**
 * Chọn câu báo lỗi cho khách từ lỗi BE trả. Thuần (không React, không HTTP) để kiểm thử bằng `pnpm test:api-error`.
 *
 * BE trả câu tiếng Việt cụ thể cho lỗi nghiệp vụ (vd. "Không thấy công trình này."), nhưng lỗi xác thực, lỗi hạ tầng và
 * mọi lỗi không kèm câu lại ra tiếng Anh hoặc rỗng. Bảng `apiErrors` trong messages dịch theo `messageCode`/status cho
 * những chỗ đó, và là nguồn duy nhất cho tiếng Anh vì BE không có bản dịch.
 */

/** Tra câu theo khoá trong namespace `apiErrors`; `null` khi khoá không tồn tại. */
export interface ApiErrorTranslator {
  locale: string
  text: (key: string) => string | null
}

export interface ApiErrorFacts {
  /** HTTP status; 0 khi không có phản hồi (mạng/hết thời gian chờ). */
  status: number
  /** Mã của tầng truyền tải (Axios) khi status = 0, vd. `ECONNABORTED`. */
  transportCode?: string
  code?: string
  messageCode?: string
  /** Câu BE trả (có thể rỗng hoặc tiếng Anh kỹ thuật). */
  serverMessage?: string
}

const VIETNAMESE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT'])

/** Câu có dấu tiếng Việt: BE chủ động viết cho khách, không phải câu kỹ thuật tiếng Anh. */
export function hasVietnamese(text: string): boolean {
  return VIETNAMESE.test(text)
}

/** Khoá `apiErrors.status.<…>` cho một HTTP status. */
export function statusKeyOf(status: number): string {
  switch (status) {
    case 400:
      return 'badRequest'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'notFound'
    case 409:
      return 'conflict'
    case 410:
      return 'gone'
    case 413:
      return 'tooLarge'
    case 422:
      return 'unprocessable'
    case 429:
      return 'tooManyRequests'
    case 502:
    case 503:
    case 504:
      return 'unavailable'
    default:
      return status >= 500 ? 'server' : 'other'
  }
}

/**
 * Thứ tự ưu tiên:
 * 1. Mất kết nối / hết thời gian chờ.
 * 2. Tiếng Việt: câu BE đã viết sẵn bằng tiếng Việt (cụ thể nhất, vd. nêu đúng trường sai).
 * 3. Câu theo `messageCode` rồi `code` trong bảng `apiErrors.codes`.
 * 4. Câu theo HTTP status.
 * Trả `null` khi bảng không có câu nào (trình dịch chưa sẵn sàng) để nơi gọi dùng câu mặc định cũ.
 */
export function localizeApiError(facts: ApiErrorFacts, translator: ApiErrorTranslator): string | null {
  if (facts.status === 0) {
    return translator.text(TIMEOUT_CODES.has(facts.transportCode ?? '') ? 'status.timeout' : 'status.network')
  }

  const server = facts.serverMessage?.trim()
  if (translator.locale === 'vi' && server && hasVietnamese(server)) return server

  for (const code of [facts.messageCode, facts.code]) {
    const byCode = code ? translator.text(`codes.${code}`) : null
    if (byCode) return byCode
  }

  return translator.text(`status.${statusKeyOf(facts.status)}`)
}
