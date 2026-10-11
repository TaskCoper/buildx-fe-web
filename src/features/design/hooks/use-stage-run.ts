'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'

import { isApiError } from '@/shared/lib/api'
import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import {
  invalidStageFields,
  keepRunKeyAfter,
  stageRunErrorKind,
  type StageName,
  type StageRunErrorKind
} from '../services/pipeline.logic'

/**
 * Bấm chạy một chặng (`POST /estimates/{id}/stages/{stage}/runs`). Mỗi lần bấm có một Idempotency-Key: thử lại cùng
 * lần bấm sau lỗi mạng/máy chủ dùng lại khóa (BE trả lần chạy cũ, không giữ thêm lượt); bị từ chối rõ ràng hoặc đã
 * được nhận thì lần bấm sau dùng khóa mới (TDD-PROJ-006 bước 4).
 */
export function useStageRun(projectId: string, stage: StageName) {
  const t = useTranslations('design.pipeline.runError')
  const queryClient = useQueryClient()
  const keyRef = useRef<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (inputVersion: number) => {
      keyRef.current ??= crypto.randomUUID()
      try {
        const accepted = await estimatePipelineApi.startRun(projectId, stage, inputVersion, keyRef.current)
        keyRef.current = null
        return accepted
      } catch (error) {
        if (!keepRunKeyAfter(isApiError(error) ? error : { status: 0 })) keyRef.current = null
        throw error
      }
    },
    onSettled: async () => {
      // Lần chạy mới khóa đầu vào và đổi trạng thái chặng: đọc lại cả hai thay vì đoán.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: designKeys.stages(projectId) }),
        queryClient.invalidateQueries({ queryKey: designKeys.estimateDetail(projectId) }),
        queryClient.invalidateQueries({ queryKey: designKeys.quota() })
      ])
    }
  })

  /** Nhóm lỗi để màn hình chọn cách xử lý (ví dụ `invalidInput` thì quay về ô thiếu). */
  const kindOf = (error: unknown): StageRunErrorKind => stageRunErrorKind(isApiError(error) ? error : null)

  /** Câu báo cho khách. Nhóm chưa có câu riêng thì dùng câu BE đã dịch sẵn. */
  const messageOf = (error: unknown): string => {
    const kind = kindOf(error)
    if (kind === 'other' || kind === 'invalidInput')
      return isApiError(error) && error.message ? error.message : t('other')
    return t(kind)
  }

  /** Trường đầu vào còn thiếu theo BE (422 `InvalidStageInput`). */
  const invalidFieldsOf = (error: unknown): string[] =>
    isApiError(error) && kindOf(error) === 'invalidInput' ? invalidStageFields(error.errors) : []

  return { ...mutation, kindOf, messageOf, invalidFieldsOf }
}
