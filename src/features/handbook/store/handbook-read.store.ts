'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const HANDBOOK_READ_STORAGE_KEY = 'savico.handbook.read'

interface HandbookReadStore {
  /** Id mẫu / bài viết người dùng đã mở xem, dùng làm set. */
  ids: Record<string, true>
  markRead: (id: string) => void
}

/**
 * Đánh dấu "Đã đọc" cho mẫu tham khảo và bài viết tư vấn.
 *
 * Lưu xuống localStorage như ♥ Yêu thích: người dùng gặp lại cùng một mẫu ở
 * trang Cẩm nang và ở panel cá nhân hóa Bước 2 / Bước 3, nên dấu đã đọc phải
 * theo item chứ không theo màn hình, và giữ được qua các lần vào lại.
 */
export const useHandbookReadStore = create<HandbookReadStore>()(
  persist(
    (set) => ({
      ids: {},
      markRead: (id) => set((state) => (state.ids[id] ? state : { ids: { ...state.ids, [id]: true } }))
    }),
    {
      name: HANDBOOK_READ_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage)
    }
  )
)

/** Theo dõi một mục, không render lại khi mục khác được đánh dấu. */
export function useIsRead(id: string) {
  return useHandbookReadStore((s) => Boolean(s.ids[id]))
}
