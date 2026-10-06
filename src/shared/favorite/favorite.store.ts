'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { FavoriteEntry, FavoriteStore } from './favorite.types'

export const FAVORITE_STORAGE_KEY = 'savico.favorites'

/**
 * Cross-cutting ♥ store (mục VI).
 *
 * One toggle mechanism shared by every ♥ in the app — màn chờ Bước 2, màn chờ
 * Bước 3 và trang Cẩm nang — and the single source for "Dự án yêu thích" in the
 * account screen. Kept in `shared/` (like auth) because more than one feature
 * reads it and features may not import each other.
 */
export const useFavoriteStore = create<FavoriteStore>()(
  persist(
    (set, get) => ({
      entries: {},

      toggle: (item) =>
        set((state) => {
          const next = { ...state.entries }
          if (next[item.templateId]) {
            delete next[item.templateId]
            return { entries: next }
          }
          const entry: FavoriteEntry = { ...item, savedAt: new Date().toISOString() }
          next[item.templateId] = entry
          return { entries: next }
        }),

      isFavorite: (templateId) => Boolean(get().entries[templateId]),

      remove: (templateId) =>
        set((state) => {
          const next = { ...state.entries }
          delete next[templateId]
          return { entries: next }
        }),

      clear: () => set({ entries: {} })
    }),
    {
      name: FAVORITE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage)
    }
  )
)
