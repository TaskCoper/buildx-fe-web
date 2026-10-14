'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'

import { isApiError } from '@/shared/lib/api'
import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import { keepRunKeyAfter, stageRunErrorKind, type StageRunErrorKind } from '../services/pipeline.logic'

/**
 * Đi tiếp/Thử lại ở bước Dự toán & 3D (`POST /estimates/{id}/stage-runs`, TDD-PROJ-006 — chạy cùng lúc). BE tự chọn các
 * chặng còn chạy được trong cặp và nhận cả hoặc không chặng nào. Khóa chống gửi lặp theo cùng quy tắc của `useStageRun`:
 * lỗi mạng/máy chủ giữ khóa để lần thử lại không tạo thêm lần chạy; được nhận hoặc bị từ chối rõ ràng thì lần sau dùng khóa mới.
 */
export function useStageGroupRun(projectId: string) {
  const t = useTranslations('design.pipeline.runError')
  const queryClient = useQueryClient()
  const keyRef = useRef<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      keyRef.current ??= crypto.randomUUID()
      try {
        const accepted = await estimatePipelineApi.startGroupRun(projectId, keyRef.current)
        keyRef.current = null
        return accepted
      } catch (error) {
        if (!keepRunKeyAfter(isApiError(error) ? error : { status: 0 })) keyRef.current = null
        throw error
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: designKeys.stages(projectId) }),
        queryClient.invalidateQueries({ queryKey: designKeys.estimateDetail(projectId) })
      ])
    }
  })

  const kindOf = (error: unknown): StageRunErrorKind => stageRunErrorKind(isApiError(error) ? error : null)

  const messageOf = (error: unknown): string => {
    const kind = kindOf(error)
    if (kind === 'other' || kind === 'invalidInput')
      return isApiError(error) && error.message ? error.message : t('other')
    return t(kind)
  }

  return { ...mutation, kindOf, messageOf }
}
