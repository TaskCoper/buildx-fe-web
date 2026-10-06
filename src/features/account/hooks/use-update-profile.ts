'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useAuthStore } from '@/shared/auth'
import { QUERY_KEY_ROOTS } from '@/shared/constants/query-keys'
import { isApiError } from '@/shared/lib/api'
import { accountApi } from '../api/account.api'
import type { UpdateProfilePayload } from '../types/account.types'

/**
 * Lưu hộp thoại "Chỉnh sửa" của thẻ hồ sơ (mục IX, Hình 17).
 *
 * Hồ sơ người dùng không phải một query của feature này mà là state dùng chung ở `shared/auth` — thanh công cụ, hồ sơ
 * PDF và ô SĐT điền sẵn ở Bước 1 đều đọc từ đó, nên ghi thẳng vào store là chỗ
 * duy nhất cần cập nhật để cả app đổi theo ngay.
 *
 * Riêng query `/users/me` của `features/auth` (gốc khóa `auth`) được đánh dấu
 * cũ: nếu không, lần nó tự tải lại sau này vẫn cầm bản hồ sơ trước khi sửa và
 * `setUser` đè ngược lại store. Không import `authKeys` được (cấm import chéo
 * feature) nên dùng gốc khóa dùng chung.
 */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()
  const t = useTranslations('account.info.editDialog')
  const tErrors = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => accountApi.updateProfile(payload),
    onSuccess: (user) => {
      setUser(user)
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROOTS.auth] })
      toast.success(t('success'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : tErrors('generic'))
    }
  })
}
