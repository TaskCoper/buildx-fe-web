import { useTranslations } from 'next-intl'

import { isApiError } from '@/shared/lib/api'
import { LibraryValidationError } from '../../api/bmt/library.api'
import { LibraryUploadError } from '../../api/bmt/library-upload'
import { isLibraryErrorCode } from '../../api/bmt/library-sections.logic'

/**
 * Lỗi của thư viện mẫu → câu tiếng Việt cho người vận hành.
 *
 * - Lỗi của bước upload phía client (`LibraryUploadError`): câu riêng theo mã nội bộ.
 * - Mã nghiệp vụ của BE (`messageCode` của LIB/MEDIA): câu riêng, TRỪ `InvalidLibraryContent` —
 *   mã đó gom nhiều nguyên nhân (thiếu section, tên, tệp, ảnh đại diện, phong cách…) và BE kèm
 *   câu nói đúng thiếu gì, nên hiện nguyên câu của BE.
 * - Còn lại: câu BE gửi kèm, rồi câu chung.
 */
export function useLibraryErrorMessage(): (error: unknown) => string {
  const s = useTranslations('admin.library.sections')
  const t = useTranslations('admin')

  return (error: unknown): string => {
    if (error instanceof LibraryUploadError) return s(`uploadErrors.${error.code}`)
    if (error instanceof LibraryValidationError) return error.messages.join(' · ') || s('errors.InvalidLibraryContent')
    if (isApiError(error)) {
      if (error.messageCode === 'InvalidLibraryContent' && error.message) return error.message
      if (isLibraryErrorCode(error.messageCode)) return s(`errors.${error.messageCode}`)
      return error.message || t('feedback.apiError')
    }
    return t('feedback.apiError')
  }
}
