'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { isApiError } from '@/shared/lib/api'
import { supervisionApi } from '../api/supervision.api'
import { supervisionKeys } from '../api/supervision.keys'
import type { StageKey, StageUploadPayload, SupervisionProject } from '../types/supervision.types'

/** Toàn bộ dữ liệu giám sát của một dự án (S20–S24). */
export function useSupervisionProject(projectId: string) {
  return useQuery({
    queryKey: supervisionKeys.project(projectId),
    queryFn: () => supervisionApi.getProject(projectId),
    enabled: Boolean(projectId)
  })
}

/**
 * Các thao tác trên một giai đoạn.
 *
 * Gộp vào một hook vì cả bốn đều trả về TOÀN BỘ dự án: một thao tác ở giai đoạn
 * 4 có thể đổi % tiến độ, ngày bàn giao dự kiến và cả banner đầu trang — cập
 * nhật từng mảnh sẽ làm các con số trên màn lệch nhau.
 */
export function useStageActions(projectId: string) {
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  const write = (data: SupervisionProject) => queryClient.setQueryData(supervisionKeys.project(projectId), data)
  const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : t('generic'))

  const upload = useMutation({
    mutationFn: (payload: StageUploadPayload) => supervisionApi.uploadStage(projectId, payload),
    onSuccess: write,
    onError: fail
  })

  const comment = useMutation({
    mutationFn: ({ stageKey, text }: { stageKey: StageKey; text: string }) =>
      supervisionApi.addComment(projectId, stageKey, text),
    onSuccess: write,
    onError: fail
  })

  const decideChange = useMutation({
    mutationFn: ({
      stageKey,
      changeRequestId,
      approve
    }: {
      stageKey: StageKey
      changeRequestId: string
      approve: boolean
    }) => supervisionApi.decideChangeRequest(projectId, stageKey, changeRequestId, approve),
    onSuccess: write,
    onError: fail
  })

  const requestChange = useMutation({
    mutationFn: ({ stageKey, reason }: { stageKey: StageKey; reason: string }) =>
      supervisionApi.createChangeRequest(projectId, stageKey, reason),
    onSuccess: write,
    onError: fail
  })

  return { upload, comment, decideChange, requestChange }
}
