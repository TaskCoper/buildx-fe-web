'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import { CONTRACTOR_PREVIEW_ID, contractorBriefRoute } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { useAuthStore } from '@/shared/auth'
import { projectSelectionApi } from '../api/project-selection.api'
import { selectedProjectSiteId } from '../services/project-selection.service'
import { isSelectableProject } from '../services/project-selection.service'
import { contractorsApi, type SaveBriefPayload } from '../api/contractors.api'
import { contractorKeys } from '../api/contractors.keys'

/**
 * Hồ sơ dự án đang mở (S10, S11 và header dự án ở S12–S18).
 *
 * Ở chế độ xem thử KHÔNG gọi: `preview` không phải mã dự án thật, gọi lên là
 * nhận 404 và màn hình đầy log lỗi trong khi đúng ra chỗ đó chỉ cần bỏ trống
 * thẻ dự án.
 */
export function useBrief(projectId: string) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: contractorKeys.brief(projectId, userId),
    queryFn: () => contractorsApi.getBrief(projectId),
    enabled: Boolean(userId && projectId) && projectId !== CONTRACTOR_PREVIEW_ID,
    retry: false
  })
}

/**
 * Hồ sơ dự án của tài khoản, mới nhất trước.
 *
 * Landing S09 cần biết khách ĐÃ CÓ hồ sơ hay chưa: nút "Xem nhà thầu" dẫn thẳng
 * sang S12 của hồ sơ gần nhất, còn chưa có hồ sơ nào thì phải tạo trước — S12
 * xếp hạng theo địa chỉ và quy mô của dự án nên không có hồ sơ thì không có gì
 * để xếp.
 */
export function useBriefs(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: contractorKeys.briefList(userId),
    queryFn: () => contractorsApi.listBriefs(),
    staleTime: 0,
    enabled: enabled && Boolean(userId)
  })
}

/**
 * "Tạo hồ sơ" ở landing (S09) — sinh mã dự án rồi mở thẳng Bước 1.
 *
 * Chỉ tạo mã bản nhập liệu trên thiết bị. POST tạo SITE chạy ở S10 khi hồ sơ
 * đủ dữ liệu; không gửi hồ sơ rỗng đến backend.
 */
interface CreateBriefOptions {
  focus?: 'site' | 'needs' | 'documents'
}

export function useCreateBrief(options: CreateBriefOptions = {}) {
  const userId = useAuthStore((state) => state.user?.id)
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: () => contractorsApi.createBrief(),
    onSuccess: (brief) => {
      queryClient.setQueryData(contractorKeys.brief(brief.id, userId), brief)
      const route = contractorBriefRoute(brief.id)
      router.push(options.focus ? route + '?focus=' + options.focus : route)
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/** Lưu bản nhập liệu cục bộ; không thay cho mutation ghi SITE ở S10. */
export function useSaveBrief(projectId: string) {
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: SaveBriefPayload) => contractorsApi.saveBrief(projectId, payload),
    onSuccess: async (brief) => {
      queryClient.setQueryData(contractorKeys.brief(projectId, userId), brief)
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/**
 * "Hoàn tất & tìm nhà thầu" ở Bước 2 (S11). Chốt hồ sơ rồi trả về để lớp app mở
 * popup 3 lựa chọn (R7) — điều hướng tiếp do màn hình quyết định, không phải hook.
 */
export function useCompleteBrief(projectId: string) {
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    scope: { id: `project-selection:${userId}` },
    mutationFn: async () => {
      const brief = await contractorsApi.completeBrief(projectId)
      if (userId && isSelectableProject(brief, userId)) {
        await queryClient.cancelQueries({ queryKey: contractorKeys.selection(userId) })
        const selection = await projectSelectionApi.set(userId, selectedProjectSiteId(brief, userId))
        await queryClient.cancelQueries({ queryKey: contractorKeys.selection(userId) })
        if (useAuthStore.getState().user?.id !== userId) throw new Error('ConstructionSiteSelectionOwnerMismatch')
        queryClient.setQueryData(contractorKeys.selection(userId), selection)
      }
      return brief
    },
    onSuccess: async (brief) => {
      queryClient.setQueryData(contractorKeys.brief(projectId, userId), brief)
      void queryClient.invalidateQueries({ queryKey: contractorKeys.briefList(userId) })
      void queryClient.invalidateQueries({ queryKey: contractorKeys.briefSummaries(userId) })
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}
