'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'

interface CmsLocaleState {
  /** Ngôn ngữ của NỘI DUNG đang sửa — độc lập với ngôn ngữ giao diện admin. */
  locale: Locale
  setLocale: (locale: Locale) => void
}

/**
 * Ngôn ngữ nội dung đang biên tập.
 *
 * Tách khỏi ngôn ngữ giao diện có chủ đích: người vận hành người Việt vẫn dùng
 * bảng điều khiển tiếng Việt trong khi soạn bản tiếng Anh cho khách nước ngoài —
 * bắt đổi cả giao diện chỉ để dịch một bài viết là phiền và dễ nhầm.
 *
 * Lưu lại giữa các phiên để mở lại đúng ngôn ngữ đang dịch dở.
 */
export const useCmsLocaleStore = create<CmsLocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale })
    }),
    { name: 'savico.admin-content-locale' }
  )
)
