/**
 * Cross-cutting favorite (♥) module — mục VI của bản mô tả giao diện.
 * Một cơ chế toggle dùng chung cho mọi vị trí có nút ♥.
 */
export { FavoriteButton } from './favorite-button'
export { useFavoriteStore, FAVORITE_STORAGE_KEY } from './favorite.store'
export { useFavorites, useIsFavorite } from './use-favorite'
export type { FavoriteEntry, FavoriteInput, FavoriteKind, FavoriteStore } from './favorite.types'
