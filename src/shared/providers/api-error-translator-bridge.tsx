'use client'

import { useLayoutEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { setApiErrorTranslator } from '@/shared/lib/api'

/**
 * Đăng ký bản dịch `apiErrors` của ngôn ngữ đang dùng cho tầng HTTP (xem `api-error-translator.ts`). Dùng layout effect
 * để chạy trước effect của mọi component con — truy vấn đầu tiên lỗi sau đó sẽ đã có câu đúng ngôn ngữ.
 */
export function ApiErrorTranslatorBridge() {
  const t = useTranslations('apiErrors')
  const locale = useLocale()

  useLayoutEffect(() => {
    // Khoá do logic thuần ghép lúc chạy (`codes.<messageCode>`), không nằm trong kiểu khoá của messages.
    setApiErrorTranslator({
      locale,
      text: (raw) => {
        const key = raw as Parameters<typeof t>[0]
        return t.has(key) ? t(key) : null
      }
    })
    return () => setApiErrorTranslator(null)
  }, [locale, t])

  return null
}
