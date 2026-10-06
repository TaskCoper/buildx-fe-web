'use client'

import { useShallow } from 'zustand/react/shallow'

import { useFavoriteStore } from './favorite.store'
import type { FavoriteEntry } from './favorite.types'

/** Newest-saved first — the order "Dự án yêu thích" lists them in. */
const bySavedAtDesc = (a: FavoriteEntry, b: FavoriteEntry) => b.savedAt.localeCompare(a.savedAt)

/**
 * Ergonomic read/write access to the shared ♥ state. Bấm ♥ ở bất kỳ đâu thì mọi
 * màn hình đang mở cập nhật ngay, vì tất cả cùng đọc một store.
 */
export function useFavorites() {
  const entries = useFavoriteStore(useShallow((s) => Object.values(s.entries)))
  const toggle = useFavoriteStore((s) => s.toggle)
  const remove = useFavoriteStore((s) => s.remove)

  return {
    favorites: [...entries].sort(bySavedAtDesc),
    count: entries.length,
    toggle,
    remove
  }
}

/** Subscribe to a single template's ♥ state without re-rendering on other toggles. */
export function useIsFavorite(templateId: string) {
  return useFavoriteStore((s) => Boolean(s.entries[templateId]))
}
