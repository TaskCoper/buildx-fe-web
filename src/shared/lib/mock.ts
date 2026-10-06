import type { PaginatedResponse } from '@/shared/types'

/**
 * Helpers for the in-browser mock layer used while there is no backend.
 * Feature `*.mock.ts` modules build on these. Gated by
 * `env.NEXT_PUBLIC_USE_MOCK_API` at each feature's API boundary.
 */

/** Simulate network latency so loading/skeleton states are exercised. */
export const mockDelay = (ms = 450) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Slice an in-memory array into a {@link PaginatedResponse} page. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): PaginatedResponse<T> {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    meta: { page: safePage, pageSize, totalItems, totalPages }
  }
}
