'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { isApiError } from '@/shared/lib/api'
import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import {
  lotVerificationPollInterval,
  lotVerificationRequestErrorKind,
  type LotVerificationView
} from '../services/pipeline.logic'

/**
 * Soi ảnh lô bất đồng bộ (TDD-PROJ-007 mục D): gửi yêu cầu (`POST …/lot-verifications`, 202), rồi hỏi lại
 * `GET …/current` mỗi 3 giây tới khi có kết quả. Không dùng SignalR ở bản này; hỏi lại là cách nhận kết quả.
 *
 * `imageUrl` là ảnh đã LƯU của bản: đổi ảnh thì khóa truy vấn đổi theo, kết quả cũ không lẫn sang ảnh mới.
 */
export function useLotVerification(projectId: string, imageUrl: string | null, { enabled = true } = {}) {
  const t = useTranslations('design.pipeline.verify.requestError')
  const queryClient = useQueryClient()
  const queryKey = [...designKeys.lotVerification(projectId), imageUrl] as const

  const current = useQuery({
    queryKey,
    queryFn: ({ signal }) => estimatePipelineApi.getCurrentLotVerification(projectId, signal),
    enabled: enabled && Boolean(imageUrl),
    refetchInterval: (query) => lotVerificationPollInterval(query.state.data),
    refetchIntervalInBackground: false
  })

  const request = useMutation({
    mutationFn: () => estimatePipelineApi.requestLotVerification(projectId),
    onSuccess: (view: LotVerificationView) => queryClient.setQueryData(queryKey, view)
  })

  const messageOf = (error: unknown): string => {
    const kind = lotVerificationRequestErrorKind(isApiError(error) ? error : null)
    if (kind === 'other') return isApiError(error) && error.message ? error.message : t('other')
    return t(kind)
  }

  return { current, request, messageOf }
}
