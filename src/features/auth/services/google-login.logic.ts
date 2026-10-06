/**
 * Logic thuần của đăng nhập Google (TDD-AUTH-003): PKCE, đọc fragment ở `/callback`, lượt đăng nhập đang chờ và phân
 * loại lỗi. Không đụng React/HTTP nên test được bằng node.
 *
 * Luồng: start (gửi `codeChallenge`) → rời sang Google → BE chuyển về `/callback#attemptId=…&completionCode=…` →
 * complete (gửi `codeVerifier` giữ trong tab) → cookie phiên. Verifier chỉ nằm ở sessionStorage của tab này, không
 * bao giờ ở URL hay log.
 */

/** Khoá sessionStorage của lượt đăng nhập đang chờ (một tab = một lượt). */
export const GOOGLE_ATTEMPT_KEY = 'bmt.google-attempt'

/** Lượt đăng nhập đang chờ ở tab này, lưu lúc bấm nút và đọc lại ở `/callback`. */
export interface GoogleAttempt {
  attemptId: string
  /** RFC 7636, 43–128 ký tự `[A-Za-z0-9-._~]`. */
  codeVerifier: string
  /** Trang cần quay lại sau khi đăng nhập (đường dẫn không có tiền tố ngôn ngữ). */
  returnTo?: string
  /** Hạn của lượt do BE trả (ISO UTC); quá hạn thì không cần gọi complete. */
  expiresAtUtc?: string
}

/** Kết quả đọc fragment: mã hoàn tất hoặc mã lỗi (đều kèm attemptId của lượt). */
export type CallbackParams =
  | { kind: 'code'; attemptId: string; completionCode: string }
  | { kind: 'error'; attemptId: string; error: string }
  | { kind: 'invalid' }

const COMPLETION_CODE = /^[A-Za-z0-9_-]{43}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** base64url không đệm (RFC 4648 §5). */
export function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 64 byte ngẫu nhiên → 86 ký tự base64url, nằm trong khoảng 43–128 mà RFC 7636 cho phép. */
export function createCodeVerifier(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(64)))
}

/** `codeChallenge` S256 = base64url(SHA-256(verifier)), luôn 43 ký tự. */
export async function codeChallengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

/** Đọc `location.hash` của `/callback`. Chỉ nhận đúng dạng BE gửi; còn lại coi là không hợp lệ. */
export function parseCallbackHash(hash: string): CallbackParams {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const attemptId = params.get('attemptId') ?? ''
  if (!UUID.test(attemptId)) return { kind: 'invalid' }

  const error = params.get('error')
  if (error) return { kind: 'error', attemptId, error }

  const completionCode = params.get('completionCode') ?? ''
  return COMPLETION_CODE.test(completionCode) ? { kind: 'code', attemptId, completionCode } : { kind: 'invalid' }
}

/** Chỉ cho quay về đường dẫn nội bộ (chặn `//host`, `https://…`, `\\`) — tránh biến `redirect` thành open redirect. */
export function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined
  return value
}

/**
 * Trang hiện tại làm đích quay về: bỏ `auth`/`redirect` (cờ mở popup đăng nhập) để vừa đăng nhập xong không bị bật lại
 * dialog. Trả `undefined` khi không an toàn hoặc đang ở chính `/callback`.
 */
export function returnToOf(pathname: string, search: string): string | undefined {
  const params = new URLSearchParams(search)
  params.delete('auth')
  params.delete('redirect')
  const query = params.toString()
  return safeReturnTo(query ? `${pathname}?${query}` : pathname)
}

/** Mã 6 chữ số của email bổ sung; giữ dạng chuỗi để không mất số 0 đầu. */
export const isEmailCode = (value: string): boolean => /^\d{6}$/.test(value)

/** Nhóm lỗi hiển thị cho khách (mỗi nhóm có một câu giải thích riêng). */
export type GoogleFailureKind =
  | 'cancelled' // khách bấm huỷ ở Google
  | 'expired' // lượt không hợp lệ / quá hạn / đã dùng / không phải lượt của tab này
  | 'notAllowed' // tài khoản bị khoá, là nhân viên hoặc đã xoá
  | 'conflict' // email/Google đã gắn với tài khoản khác
  | 'busy' // tài khoản đang bị thay đổi — thử lại ngay
  | 'rateLimited'
  | 'unavailable' // tính năng tắt, Google/mạng/Redis lỗi
  | 'generic'

/** Mã lỗi (`messageCode` của API hoặc `error` ở fragment) → nhóm hiển thị. */
export function failureKindOf(code: string | undefined, status?: number): GoogleFailureKind {
  switch (code) {
    case 'GoogleSignInCancelled':
    case 'access_denied':
      return 'cancelled'
    case 'GoogleLoginAttemptInvalid':
    case 'GoogleIdentityInvalid':
      return 'expired'
    case 'GoogleLoginNotAllowed':
      return 'notAllowed'
    case 'GoogleLinkConflict':
      return 'conflict'
    case 'GoogleLoginConcurrentChange':
      return 'busy'
    case 'GoogleLoginRateLimited':
      return 'rateLimited'
    case 'GoogleSignInUnavailable':
      return 'unavailable'
  }
  if (status === 429) return 'rateLimited'
  if (status === 503) return 'unavailable'
  return 'generic'
}

/** Lượt còn hạn? Không có hạn thì coi là còn (để BE quyết định). */
export function attemptExpired(attempt: GoogleAttempt, now = Date.now()): boolean {
  if (!attempt.expiresAtUtc) return false
  const expires = Date.parse(attempt.expiresAtUtc)
  return Number.isFinite(expires) && expires <= now
}

/** Đọc lượt đang chờ từ chuỗi đã lưu; sai dạng → `undefined`. */
export function parseAttempt(raw: string | null): GoogleAttempt | undefined {
  if (!raw) return undefined
  try {
    const value = JSON.parse(raw) as Partial<GoogleAttempt>
    if (typeof value.attemptId !== 'string' || typeof value.codeVerifier !== 'string') return undefined
    if (!/^[A-Za-z0-9_.~-]{43,128}$/.test(value.codeVerifier)) return undefined
    return {
      attemptId: value.attemptId,
      codeVerifier: value.codeVerifier,
      returnTo: typeof value.returnTo === 'string' ? value.returnTo : undefined,
      expiresAtUtc: typeof value.expiresAtUtc === 'string' ? value.expiresAtUtc : undefined
    }
  } catch {
    return undefined
  }
}

/* ---- sessionStorage (mọi truy cập bọc try/catch: chế độ riêng tư có thể chặn) ---- */

export function saveAttempt(attempt: GoogleAttempt): boolean {
  try {
    sessionStorage.setItem(GOOGLE_ATTEMPT_KEY, JSON.stringify(attempt))
    return true
  } catch {
    return false
  }
}

export function loadAttempt(): GoogleAttempt | undefined {
  try {
    return parseAttempt(sessionStorage.getItem(GOOGLE_ATTEMPT_KEY))
  } catch {
    return undefined
  }
}

export function clearAttempt(): void {
  try {
    sessionStorage.removeItem(GOOGLE_ATTEMPT_KEY)
  } catch {
    // không có gì để dọn
  }
}
