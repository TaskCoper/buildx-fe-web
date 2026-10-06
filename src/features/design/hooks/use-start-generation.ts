'use client'

import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'

import { isApiError } from '@/shared/lib/api'
import { estimateGenerationApi, rememberOperation } from '../api/estimate-generation.api'
import { estimateInputApi } from '../api/estimate-input.api'

/** Nhóm lỗi khi gửi AI — mỗi nhóm một câu cho khách (khoá `design.estimateApi.startError.<kind>`). */
export type StartErrorKind =
  | 'alreadyRunning'
  | 'unavailable'
  | 'mediaUnavailable'
  | 'locationChanged'
  | 'versionConflict'
  | 'invalid'
  | 'denied'
  | 'other'

/** Lỗi gửi AI → nhóm. `GenerationInProgress` / `EstimateAlreadyGenerated` nghĩa là tác vụ đã chạy / đã xong: không phải lỗi. */
export function startErrorKind(error: unknown): StartErrorKind {
  if (!isApiError(error)) return 'other'
  switch (error.messageCode ?? error.code) {
    case 'GenerationInProgress':
    case 'EstimateAlreadyGenerated':
      return 'alreadyRunning'
    case 'DependencyUnavailable':
      return 'unavailable'
    case 'MediaReferenceUnavailable':
      return 'mediaUnavailable'
    case 'LocationDatasetChanged':
      return 'locationChanged'
    case 'InputVersionConflict':
      return 'versionConflict'
    case 'InvalidGenerationInput':
      return 'invalid'
    default:
      return error.status === 503 ? 'unavailable' : error.status === 403 ? 'denied' : 'other'
  }
}

/**
 * Gửi bản dự toán cho AI (`POST /estimates/{id}/generations`) — giữ MỘT lượt thiết kế và khoá đầu vào. Khoá
 * idempotency gắn với `inputVersion`: bấm đúp cùng phiên bản chỉ giữ một lượt, còn sửa đầu vào rồi gửi lại (phiên
 * bản mới) dùng khoá mới thay vì đụng 409 `IdempotencyConflict`.
 */
export function useStartGeneration(projectId: string) {
  const t = useTranslations('design.estimateApi.startError')
  const keyRef = useRef<{ version: number; key: string } | null>(null)

  const mutation = useMutation({
    mutationFn: async (knownVersion?: number) => {
      const version = knownVersion ?? (await estimateInputApi.getEstimate(projectId)).inputVersion
      if (keyRef.current?.version !== version) keyRef.current = { version, key: crypto.randomUUID() }
      const started = await estimateGenerationApi.start(projectId, version, keyRef.current.key)
      // Trang chờ hỏi đúng tác vụ này (kèm mã lỗi chính xác khi thất bại).
      rememberOperation(projectId, started.operationId)
      // Một lần đã được tiếp nhận kết thúc hành động này; retry sau thất bại là tác vụ mới.
      keyRef.current = null
      return started
    }
  })

  /** Câu báo lỗi cho khách; lỗi chưa phân loại thì hiện câu của BE. */
  const messageOf = (error: unknown): string => {
    const kind = startErrorKind(error)
    if (kind === 'other' || kind === 'invalid' || kind === 'alreadyRunning') {
      return isApiError(error) && error.message ? error.message : t('other')
    }
    return t(kind)
  }

  return { ...mutation, messageOf }
}
