'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import { ROUTES } from '@/shared/constants/routes'
import { authApi } from '../api/auth.api'

/**
 * Logout mutation: tells the backend to clear the session cookie, then resets
 * client auth state + the query cache and redirects to the public home. Always
 * clears locally even if the network call fails.
 */
export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const reset = useAuthStore((s) => s.reset)

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      reset()
      queryClient.clear()
      // Chiều ngược lại của `useLogin`: các route bảo vệ đã được prefetch lúc còn
      // đăng nhập vẫn nằm trong Router Cache. Không dọn thì sau khi đăng xuất bấm
      // vào vẫn thấy nội dung của phiên cũ cho tới khi cache hết hạn.
      router.refresh()
      router.replace(ROUTES.HOME)
    }
  })
}
