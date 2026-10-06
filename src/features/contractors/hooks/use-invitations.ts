'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import { CONTRACTOR_PREVIEW_ID, contractorInvitationsRoute } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { env } from '@/shared/config/env'
import { useAuthStore } from '@/shared/auth'
import { useQuotations } from './use-quotations'
import { contractorsApi } from '../api/contractors.api'
import { contractorKeys } from '../api/contractors.keys'
import { mockContractorsApi } from '../api/contractors.mock'
import type { Invitation, SurveyBooking } from '../types/contractor.types'

/** Lời mời báo giá đã gửi của dự án (S18) + ô đếm "Đã mời x/3" (R1). */
export function useMockInvitations(projectId: string, options: { live?: boolean } = {}) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: [...contractorKeys.invitationList(projectId), userId],
    queryFn: () => mockContractorsApi.listInvitations(projectId),
    refetchInterval: options.live ? 5_000 : false,
    // Chế độ xem thử chưa có dự án nên cũng chưa có lời mời nào để đếm.
    enabled: env.NEXT_PUBLIC_USE_MOCK_API && Boolean(userId && projectId) && projectId !== CONTRACTOR_PREVIEW_ID
  })
}

type InvitationListItem = Pick<Invitation, 'id' | 'contractorId' | 'contractorName' | 'sentAt' | 'status'> &
  Partial<Pick<Invitation, 'updatedAt' | 'dossierVersion'>>

export function useInvitations(projectId: string, options: { live?: boolean } = {}) {
  const mock = useMockInvitations(projectId, options)
  const real = useQuotations(projectId, !env.NEXT_PUBLIC_USE_MOCK_API, options.live)
  if (env.NEXT_PUBLIC_USE_MOCK_API)
    return { ...mock, siteRequired: false, limit: 3, remaining: Math.max(0, 3 - (mock.data?.length ?? 0)) }
  const statuses = { Sent: 'sent', Received: 'received', ContractorReceived: 'accepted', Completed: 'done' } as const
  return {
    ...real,
    limit: real.isError ? undefined : real.data?.limit,
    remaining: real.isError ? 0 : (real.data?.remaining ?? 0),
    data: real.isError
      ? undefined
      : real.data?.requests.items.map(
          (item): InvitationListItem => ({
            id: item.id,
            contractorId: item.contractorId,
            contractorName: item.contractorName,
            sentAt: item.createdAtUtc,
            status: statuses[item.status]
          })
        )
  }
}

/** Khung giờ khảo sát của một nhà thầu trong một ngày (S16). */
export function useSurveySlots(contractorId: string, date: string) {
  return useQuery({
    queryKey: contractorKeys.slots(contractorId, date),
    queryFn: () => mockContractorsApi.listSlots(contractorId, date),
    enabled: env.NEXT_PUBLIC_USE_MOCK_API && Boolean(contractorId && date)
  })
}

/**
 * "Xác nhận thời gian khảo sát" (S16) → danh sách lời mời (S18).
 *
 * Nhận MỘT MẢNG booking vì khách có thể mời nhiều nhà thầu trong cùng một lượt
 * từ bảng so sánh (S15); server gộp chúng vào một mã yêu cầu khảo sát.
 */
interface SendInvitationMotionOptions {
  navigateDelayMs?: number
  errorMessage?: string
  onSuccess?: () => void
  onError?: () => void
}

export function useSendInvitations(projectId: string, options: SendInvitationMotionOptions = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: (bookings: SurveyBooking[]) => {
      if (!env.NEXT_PUBLIC_USE_MOCK_API) throw new Error('UseQuotationRequestsApi')
      return mockContractorsApi.createInvitations(projectId, bookings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractorKeys.invitationList(projectId) })
      queryClient.invalidateQueries({ queryKey: contractorKeys.brief(projectId) })
      options.onSuccess?.()
      const navigate = () => router.push(contractorInvitationsRoute(projectId))
      if (options.navigateDelayMs) window.setTimeout(navigate, options.navigateDelayMs)
      else navigate()
    },
    onError: (error) => {
      options.onError?.()
      toast.error(options.errorMessage ?? (isApiError(error) ? error.message : t('generic')))
    }
  })
}

/** Chi tiết một yêu cầu khảo sát vừa gửi (S17). */
export function useSurveyRequest(requestId: string) {
  return useQuery({
    queryKey: contractorKeys.surveyRequest(requestId),
    queryFn: () => mockContractorsApi.getSurveyRequest(requestId),
    enabled: env.NEXT_PUBLIC_USE_MOCK_API && Boolean(requestId)
  })
}

/** Đánh giá nhà thầu đã gửi của dự án (S18). */
export function useContractorReviews(projectId: string) {
  return useQuery({
    queryKey: contractorKeys.reviewList(projectId),
    queryFn: () => contractorsApi.listReviews(projectId),
    enabled: Boolean(projectId)
  })
}

/**
 * Gửi đánh giá cho một lời mời đã hoàn tất (S09: "chỉ khách đã làm việc qua
 * SAVICO mới được đánh giá").
 */
export function useSubmitContractorReview(projectId: string) {
  const queryClient = useQueryClient()
  const t = useTranslations('contractors.rating')

  return useMutation({
    mutationFn: ({ invitationId, rating, comment }: { invitationId: string; rating: number; comment: string }) =>
      contractorsApi.submitReview(invitationId, rating, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractorKeys.reviewList(projectId) })
      toast.success(t('sent'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('failed'))
    }
  })
}
