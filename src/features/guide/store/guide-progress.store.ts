'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface VideoProgressEntry {
  /** Giây đã xem tới lúc rời khỏi/tạm dừng video. */
  position: number
  /** Đã xem hết ít nhất một lần — giữ nguyên `true` kể cả khi xem lại từ đầu. */
  completed: boolean
}

interface GuideProgressStore {
  entries: Record<string, VideoProgressEntry>
  getProgress: (videoId: string) => VideoProgressEntry | undefined
  saveProgress: (videoId: string, position: number, durationSeconds: number) => void
  markCompleted: (videoId: string) => void
}

/**
 * Tiến độ xem video hướng dẫn — "đang xem dở" / "đã xem xong" (mục 3 trang
 * Hướng dẫn, mục "Đang xem dở" trong popup). Chỉ có ở client, không có
 * backend nên lưu `localStorage` — cùng cách với `shared/favorite`. Nằm
 * trong `features/guide` (không phải `shared/`) vì chỉ chính feature này đọc.
 */
export const useGuideProgressStore = create<GuideProgressStore>()(
  persist(
    (set, get) => ({
      entries: {},

      getProgress: (videoId) => get().entries[videoId],

      saveProgress: (videoId, position, durationSeconds) =>
        set((state) => {
          const prev = state.entries[videoId]
          const completed = Boolean(prev?.completed) || position >= durationSeconds - 1.5
          return { entries: { ...state.entries, [videoId]: { position, completed } } }
        }),

      markCompleted: (videoId) =>
        set((state) => ({
          entries: {
            ...state.entries,
            [videoId]: { position: state.entries[videoId]?.position ?? 0, completed: true }
          }
        }))
    }),
    {
      name: 'savico.guide-progress',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
