'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from '@/i18n/navigation'
import { useAuthStore, type AuthUser } from '@/shared/auth'
import { ROUTES } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { authKeys } from '../api/auth.keys'
import { googleAuthApi, type GoogleEmailChallenge, type GoogleOutcome } from '../api/google-auth.api'
import {
  attemptExpired,
  clearAttempt,
  failureKindOf,
  isEmailCode,
  loadAttempt,
  parseCallbackHash,
  safeReturnTo,
  type GoogleAttempt,
  type GoogleFailureKind
} from '../services/google-login.logic'

export type GoogleCallbackState =
  | { phase: 'working' }
  | { phase: 'email'; challenge: GoogleEmailChallenge; wrongCode: boolean; verifying: boolean }
  | { phase: 'failed'; kind: GoogleFailureKind; returnTo?: string }

/**
 * Màn `/callback` của đăng nhập Google. BE đã xác thực với Google rồi chuyển về đây với
 * `#attemptId=…&completionCode=…` (hoặc `&error=…`); hook đổi mã đó lấy phiên cookie, hoặc chuyển sang nhập mã email
 * khi Google chưa đủ bằng chứng email (HTTP 202).
 *
 * Quy tắc an toàn (TDD-AUTH-003): xoá fragment ngay khi đọc; chỉ xử lý lượt có `attemptId` trùng lượt đã lưu ở tab này;
 * mã hoàn tất dùng một lần nên không gọi lại — lỗi thì bắt đầu lượt mới.
 */
export function useGoogleCallback() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const [state, setState] = useState<GoogleCallbackState>({ phase: 'working' })
  // Giữ qua lần chạy dư của StrictMode: mã hoàn tất chỉ đổi được đúng một lần, và fragment đã bị xoá sau lần đọc đầu.
  const started = useRef(false)
  const attempt = useRef<GoogleAttempt | undefined>(undefined)

  const fail = useCallback((kind: GoogleFailureKind) => {
    const returnTo = attempt.current?.returnTo
    clearAttempt()
    attempt.current = undefined
    setState({ phase: 'failed', kind, returnTo })
  }, [])

  const succeed = useCallback(
    (user: AuthUser) => {
      const returnTo = safeReturnTo(attempt.current?.returnTo)
      clearAttempt()
      setUser(user)
      queryClient.setQueryData(authKeys.currentUser(), user)
      // Như đăng nhập thường: bỏ payload đã prefetch trong phiên khách trước khi vào trang.
      router.refresh()
      router.replace(returnTo ?? ROUTES.HOME)
    },
    [queryClient, router, setUser]
  )

  const handle = useCallback(
    (outcome: GoogleOutcome) => {
      if (outcome.kind === 'authenticated') succeed(outcome.user)
      else setState({ phase: 'email', challenge: outcome.challenge, wrongCode: false, verifying: false })
    },
    [succeed]
  )

  useEffect(() => {
    if (started.current) return
    started.current = true

    const params = parseCallbackHash(window.location.hash)
    // Xoá fragment khỏi thanh địa chỉ/lịch sử: mã hoàn tất không nên nằm lại đó.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    const saved = loadAttempt()
    attempt.current = saved
    // Chỉ lượt do chính tab này bắt đầu mới được xử lý (link gửi từ ngoài hay tab khác đều bị từ chối).
    if (params.kind === 'invalid' || !saved || saved.attemptId.toLowerCase() !== params.attemptId.toLowerCase()) {
      fail('expired')
      return
    }
    if (params.kind === 'error') {
      fail(failureKindOf(params.error))
      return
    }
    if (attemptExpired(saved)) {
      fail('expired')
      return
    }

    googleAuthApi
      .complete({ attemptId: saved.attemptId, completionCode: params.completionCode, codeVerifier: saved.codeVerifier })
      .then(handle)
      .catch((error: unknown) => fail(isApiError(error) ? failureKindOf(error.messageCode, error.status) : 'generic'))
  }, [fail, handle])

  const submitCode = useCallback(
    (code: string) => {
      const saved = attempt.current
      if (!saved || state.phase !== 'email' || state.verifying || !isEmailCode(code)) return
      const { challenge } = state
      setState({ phase: 'email', challenge, wrongCode: false, verifying: true })
      googleAuthApi
        .verifyEmail({
          attemptId: challenge.attemptId,
          verificationTicket: challenge.verificationTicket,
          codeVerifier: saved.codeVerifier,
          code
        })
        .then(handle)
        .catch((error: unknown) => {
          // Sai mã: ở lại ô nhập (BE cho tối đa vài lần). Mọi lỗi khác kết thúc lượt.
          if (isApiError(error) && error.messageCode === 'GoogleEmailVerificationInvalid') {
            setState({ phase: 'email', challenge, wrongCode: true, verifying: false })
            return
          }
          fail(isApiError(error) ? failureKindOf(error.messageCode, error.status) : 'generic')
        })
    },
    [fail, handle, state]
  )

  return { state, submitCode }
}
