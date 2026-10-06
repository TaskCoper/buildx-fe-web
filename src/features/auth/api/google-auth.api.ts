import { AUTH_ENDPOINTS, setSessionMarker } from '@/shared/auth'
import { http } from '@/shared/lib/api'
import type { AuthUser } from '@/shared/auth'
import { authApi } from './auth.api'

/** `POST /users/google/start` → `GoogleLoginStarted`. */
export interface GoogleStarted {
  attemptId: string
  /** URL Google do BE dựng (kèm state/nonce/PKCE của Google) — chuyển trình duyệt sang đó. */
  authorizationUrl: string
  expiresAtUtc: string
}

/** Email Google chưa đủ bằng chứng → cần nhập mã 6 số gửi tới hộp thư đó (HTTP 202). */
export interface GoogleEmailChallenge {
  status: 'EmailVerificationRequired'
  attemptId: string
  verificationTicket: string
  maskedEmail: string
  expiresAtUtc: string
}

/** Kết quả complete / verify-email: hoặc đã có phiên (cookie), hoặc cần nhập mã email. */
export type GoogleOutcome =
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'email'; challenge: GoogleEmailChallenge }

interface GoogleLoginResult {
  status: string
  attemptId?: string | null
  verificationTicket?: string | null
  maskedEmail?: string | null
  expiresAtUtc?: string | null
}

/**
 * Web: BE cấp cookie HttpOnly (không có token trong JSON). Phải đánh dấu phiên TRƯỚC khi đọc `/me`, nếu không lối tắt
 * "chưa từng đăng nhập" của `getCurrentUser` sẽ từ chối.
 */
async function toOutcome(result: GoogleLoginResult): Promise<GoogleOutcome> {
  if (result.status === 'EmailVerificationRequired' && result.verificationTicket && result.attemptId) {
    return {
      kind: 'email',
      challenge: {
        status: 'EmailVerificationRequired',
        attemptId: result.attemptId,
        verificationTicket: result.verificationTicket,
        maskedEmail: result.maskedEmail ?? '',
        expiresAtUtc: result.expiresAtUtc ?? ''
      }
    }
  }
  setSessionMarker()
  return { kind: 'authenticated', user: await authApi.getCurrentUser() }
}

/** Đăng nhập Google qua API web của BMT (GoogleAuthWeb). Callback `/callback` do BE chuyển về, không gọi từ đây. */
export const googleAuthApi = {
  start: (codeChallenge: string): Promise<GoogleStarted> =>
    http.post<GoogleStarted>(AUTH_ENDPOINTS.GOOGLE_START, { codeChallenge, codeChallengeMethod: 'S256' }),

  complete: async (input: {
    attemptId: string
    completionCode: string
    codeVerifier: string
  }): Promise<GoogleOutcome> => toOutcome(await http.post<GoogleLoginResult>(AUTH_ENDPOINTS.GOOGLE_COMPLETE, input)),

  verifyEmail: async (input: {
    attemptId: string
    verificationTicket: string
    codeVerifier: string
    code: string
  }): Promise<GoogleOutcome> => toOutcome(await http.post<GoogleLoginResult>(AUTH_ENDPOINTS.GOOGLE_VERIFY_EMAIL, input))
}
