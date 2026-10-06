'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { isApiError } from '@/shared/lib/api'
import { designApi } from '../api/design.api'
import { designKeys } from '../api/design.keys'
import type { Dossier, Project } from '../types/design.types'

/** Trạng thái bộ hồ sơ: chưa render / đang render / đã sẵn sàng (mục III.4). */
export function useDossier(projectId: string) {
  return useQuery({
    queryKey: designKeys.dossier(projectId),
    queryFn: () => designApi.getDossier(projectId),
    enabled: Boolean(projectId)
  })
}

/** Bấm "Render hồ sơ" → màn chờ render → trạng thái hoàn tất. */
export function useRenderDossier(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => designApi.renderDossier(projectId),
    onSuccess: (dossier) => {
      queryClient.setQueryData(designKeys.dossier(projectId), dossier)
      const completed = (project?: Project) =>
        project
          ? { ...project, currentStep: 3 as const, status: 'completed' as const, updatedAt: new Date().toISOString() }
          : project

      queryClient.setQueryData<Project | undefined>(designKeys.project(projectId), completed)

      void queryClient.invalidateQueries({ queryKey: designKeys.project(projectId), exact: true })
      void queryClient.invalidateQueries({ queryKey: designKeys.projects() })
    }
  })
}

/**
 * Tạo link chia sẻ xem hồ sơ không cần đăng nhập (mục III.4c). Token trả về
 * được ghi thẳng vào cache bộ hồ sơ để cửa sổ chia sẻ / QR dựng được URL.
 */
export function useCreateShareLink(projectId: string) {
  const queryClient = useQueryClient()
  const t = useTranslations('errors')
  const tShare = useTranslations('design.dossier.share')

  return useMutation({
    mutationFn: (expiryDate?: string) => designApi.createShareLink(projectId, expiryDate),
    onSuccess: ({ token, url, expiryDate, applied }) => {
      queryClient.setQueryData(designKeys.dossier(projectId), (previous?: Dossier) =>
        previous ? { ...previous, shareToken: token, shareUrl: url ?? null, shareExpiry: expiryDate ?? null } : previous
      )
      // Đã có link còn hiệu lực với ngày khác: BE giữ nguyên ngày cũ (muốn đổi thì thu hồi rồi tạo lại).
      if (applied === false) toast.info(tShare('expiryKept'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/** Thu hồi link chia sẻ hiện hành (dự toán thật). */
export function useRevokeShareLink(projectId: string) {
  const queryClient = useQueryClient()
  const t = useTranslations('errors')
  const tShare = useTranslations('design.dossier.share')

  return useMutation({
    mutationFn: (shareId: string) => designApi.revokeShareLink(projectId, shareId),
    onSuccess: () => {
      queryClient.setQueryData(designKeys.dossier(projectId), (previous?: Dossier) =>
        previous ? { ...previous, shareToken: null, shareUrl: null, shareExpiry: null } : previous
      )
      toast.success(tShare('revoke.done'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/** Gửi bộ hồ sơ qua email (mục III.4c). */
export function useSendDossierEmail(projectId: string) {
  const t = useTranslations('errors')
  const tShare = useTranslations('design.dossier.share')

  return useMutation({
    mutationFn: (email: string) => designApi.sendDossierEmail(projectId, email),
    onError: (error) => {
      // Thư không gửi được (SMTP từ chối…): nói đúng thay vì câu lỗi chung.
      if (error instanceof Error && error.message === 'EmailFailed') {
        toast.error(tShare('email.failed'))
        return
      }
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}
