'use client'

import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { isApiError } from '@/shared/lib/api'
import { googleAuthApi } from '../api/google-auth.api'
import {
  clearAttempt,
  codeChallengeOf,
  createCodeVerifier,
  failureKindOf,
  saveAttempt,
  type GoogleFailureKind
} from '../services/google-login.logic'

/**
 * Bước đầu của đăng nhập Google: sinh verifier + challenge (PKCE), xin BE một lượt, nhớ lượt ở sessionStorage của tab
 * rồi chuyển cả trang sang Google. Mutation giữ trạng thái "đang chạy" suốt lúc trình duyệt rời trang nên nút không bị
 * bấm lần hai. Không dùng popup: `/callback` cần đọc fragment và chính tab này giữ verifier.
 */
export function useStartGoogleLogin() {
  const t = useTranslations('auth.google')
  const tErrors = useTranslations('auth.google.errors')

  return useMutation({
    mutationFn: async (returnTo?: string) => {
      const codeVerifier = createCodeVerifier()
      const started = await googleAuthApi.start(await codeChallengeOf(codeVerifier))
      // Chỉ đi tiếp tới địa chỉ https: chặn `javascript:` hay scheme lạ nếu phản hồi bị làm giả.
      if (new URL(started.authorizationUrl).protocol !== 'https:') throw new Error('UnsafeAuthorizationUrl')
      if (!saveAttempt({ attemptId: started.attemptId, codeVerifier, returnTo, expiresAtUtc: started.expiresAtUtc })) {
        // Không lưu được verifier (vd. trình duyệt chặn storage) thì `/callback` không hoàn tất được: báo ngay.
        throw new Error('StorageUnavailable')
      }
      window.location.assign(started.authorizationUrl)
      // Không resolve: trang sắp rời đi, giữ nút ở trạng thái đang chờ.
      await new Promise<never>(() => undefined)
    },
    onError: (error) => {
      clearAttempt()
      if (error instanceof Error && error.message === 'StorageUnavailable') {
        toast.error(t('storageUnavailable'))
        return
      }
      const kind: GoogleFailureKind = isApiError(error) ? failureKindOf(error.messageCode, error.status) : 'generic'
      toast.error(tErrors(kind))
    }
  })
}
