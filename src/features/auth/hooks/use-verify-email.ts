'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/shared/auth'
import { authApi } from '../api/auth.api'
import { authKeys } from '../api/auth.keys'

/**
 * Xác minh email cho tài khoản đang đăng nhập: gửi mã (nhập từ email) → đọc lại
 * `/me` (giờ `emailVerified=true`) → cập nhật store để đóng popup và mở khoá
 * chức năng. Email lấy từ phiên đang đăng nhập nên form chỉ cần mã.
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient()
  const email = useAuthStore((s) => s.user?.email)
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: async (code: number) => {
      if (!email) throw new Error('Missing session email')
      await authApi.verifyAccount(email, code)
      return authApi.getCurrentUser()
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(authKeys.currentUser(), user)
    }
  })
}
