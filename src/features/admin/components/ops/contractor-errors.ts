'use client'

import { useTranslations } from 'next-intl'

import { isApiError } from '@/shared/lib/api'
import { contractorErrorKey, errorCodeOf } from './contractor-form.logic'

/**
 * Câu thông báo tiếng Việt cho một lỗi bất kỳ trong khu nhà thầu: lỗi của bước tải tệp
 * (`MediaUploadError`), mã MEDIA và mã nhà thầu (TDD-MEDIA-001, TDD-CTR-001).
 *
 * Thứ tự: câu riêng theo mã → câu BE gửi kèm → câu chung. BE chỉ trả mã và một câu tiếng Việt
 * chung chung cho nhiều lỗi nên ưu tiên câu của mình; riêng lỗi thiếu mã vẫn dùng câu của BE.
 */
export function useContractorErrorMessage(): (error: unknown) => string {
  const t = useTranslations('admin')
  const te = useTranslations('admin.contractorsAdmin.errors')

  return (error) => {
    const key = contractorErrorKey(errorCodeOf(error))
    if (key) return te(key)
    if (isApiError(error) && error.message) return error.message
    // Lỗi tải tệp có mã lạ: `message` chỉ là chính cái mã, không có ích cho người dùng.
    if (error instanceof Error && error.name === 'MediaUploadError') return te('generic')
    return t('feedback.apiError')
  }
}
